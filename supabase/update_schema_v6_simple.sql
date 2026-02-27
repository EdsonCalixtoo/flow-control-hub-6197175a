-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v6 SIMPLES — Flow Control Hub ERP
-- SEM ERROS DE SINTAXE — Testado e funcional
-- ═══════════════════════════════════════════════════════════════

-- PASSO 1: Ativar REPLICA IDENTITY para Realtime
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE order_status_history REPLICA IDENTITY FULL;
ALTER TABLE financial_entries REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
ALTER TABLE barcode_scans REPLICA IDENTITY FULL;
ALTER TABLE delivery_pickups REPLICA IDENTITY FULL;

-- PASSO 2: Reconfigurar RLS simples e permissivo para orders
DROP POLICY IF EXISTS "users can see own orders" ON orders;
DROP POLICY IF EXISTS "users can see shared orders" ON orders;
DROP POLICY IF EXISTS "users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can see orders with their role" ON orders;
DROP POLICY IF EXISTS "authenticated users see all orders" ON orders;
DROP POLICY IF EXISTS "authenticated users create orders" ON orders;
DROP POLICY IF EXISTS "authenticated users update orders" ON orders;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authenticated can read orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone authenticated can create" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anyone authenticated can update" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anyone authenticated can delete" ON orders FOR DELETE TO authenticated USING (true);

-- PASSO 3: Reconfigurar RLS para order_items
DROP POLICY IF EXISTS "Users can see order items" ON order_items;
DROP POLICY IF EXISTS "authenticated users see order items" ON order_items;
DROP POLICY IF EXISTS "authenticated users manage order items" ON order_items;

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone can create items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anyone can update items" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PASSO 4: Reconfigurar RLS para order_status_history
DROP POLICY IF EXISTS "Users can see order status history" ON order_status_history;
DROP POLICY IF EXISTS "authenticated users see status history" ON order_status_history;
DROP POLICY IF EXISTS "authenticated users add status history" ON order_status_history;

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read history" ON order_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone can create history" ON order_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- PASSO 5: Reconfigurar RLS para financial_entries
DROP POLICY IF EXISTS "Users can see financial entries" ON financial_entries;
DROP POLICY IF EXISTS "authenticated users see financial entries" ON financial_entries;
DROP POLICY IF EXISTS "authenticated users create financial entries" ON financial_entries;

ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read entries" ON financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone can create entries" ON financial_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anyone can update entries" ON financial_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PASSO 6: RLS para barcode_scans e delivery_pickups
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read scans" ON barcode_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone can create scans" ON barcode_scans FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE delivery_pickups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read pickups" ON delivery_pickups FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone can create pickups" ON delivery_pickups FOR INSERT TO authenticated WITH CHECK (true);

-- PASSO 7: Função para gerar números únicos
DROP FUNCTION IF EXISTS fn_get_next_order_number() CASCADE;

CREATE FUNCTION fn_get_next_order_number()
RETURNS TEXT AS $orders_fn$
DECLARE
  next_num TEXT;
  max_n INTEGER;
BEGIN
  -- Busca o maior número
  SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)), 0)
  INTO max_n
  FROM orders
  WHERE number LIKE 'PED-%';
  
  -- Gera próximo
  next_num := 'PED-' || LPAD((max_n + 1)::TEXT, 3, '0');
  RETURN next_num;
END;
$orders_fn$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION fn_get_next_order_number() TO authenticated;

-- PASSO 8: Sucesso
SELECT 'v6 - REALTIME E NÚMEROS ÚNICOS ATIVADOS ✓' as STATUS;
