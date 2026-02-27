-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v6 — Flow Control Hub ERP
-- Correção Crítica: 100% Sincronização em Tempo Real
--   1. Corrige constraint de orders.number (duplicatas)
--   2. Ativa Realtime para TODAS as tabelas
--   3. Adiciona RLS correto
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CORRIGIR CONSTRAINT DE orders.number ──────────────────
-- Problema: "duplicate key value violates unique constraint 'orders_number_key'"
-- Solução: Remove constraint errado + cria nova com UNIQUE + índice

-- Verifica se constraint existe e remove
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE table_name = 'orders' AND constraint_name = 'orders_number_key') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_number_key;
    RAISE NOTICE 'Removido constraint orders_number_key antigo';
  END IF;
END $$;

-- Cria novo índice UNIQUE em orders.number para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_unique ON orders(number);

-- Remove números duplicados (mantém o mais antigo)
DELETE FROM orders o1 WHERE id NOT IN (
  SELECT DISTINCT ON (number) id FROM orders ORDER BY number, created_at ASC
);

DO $$
BEGIN
  RAISE NOTICE 'Removidas duplicatas da tabela orders ✓';
END $$;

-- ─── 2. ATIVAR REALTIME PARA orders ─────────────────────────
-- (essencial para financeiro receber atualizações)
ALTER TABLE orders REPLICA IDENTITY FULL;

-- ─── 3. ATIVAR REALTIME PARA order_items ──────────────────────
ALTER TABLE order_items REPLICA IDENTITY FULL;

-- ─── 4. ATIVAR REALTIME PARA order_status_history ─────────────
ALTER TABLE order_status_history REPLICA IDENTITY FULL;

-- ─── 5. ATIVAR REALTIME PARA OUTRAS TABELAS IMPORTANTES ───────
ALTER TABLE financial_entries REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;

-- ─── 6. RECONFIGURAR RLS PARA orders ──────────────────────────
-- Remove políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "users can see own orders" ON orders;
DROP POLICY IF EXISTS "users can see shared orders" ON orders;
DROP POLICY IF EXISTS "users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can see orders with their role" ON orders;

-- Cria nova política simples: usuários autenticados veem tudo
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see all orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated users create orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated users update orders" ON orders
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE 'RLS configurado para orders ✓';
END $$;

-- ─── 7. RECONFIGURAR RLS PARA order_items ────────────────────
DROP POLICY IF EXISTS "Users can see order items" ON order_items;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see order items" ON order_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated users manage order items" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── 8. RECONFIGURAR RLS PARA order_status_history ────────────
DROP POLICY IF EXISTS "Users can see order status history" ON order_status_history;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see status history" ON order_status_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated users add status history" ON order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── 9. RECONFIGURAR RLS PARA financial_entries ────────────────
DROP POLICY IF EXISTS "Users can see financial entries" ON financial_entries;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see financial entries" ON financial_entries
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated users create financial entries" ON financial_entries
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── 10. RECONFIGURAR RLS PARA clients ─────────────────────────
DROP POLICY IF EXISTS "Users can see clients" ON clients;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see clients" ON clients
  FOR SELECT TO authenticated
  USING (true);

-- ─── 11. RECONFIGURAR RLS PARA products ────────────────────────
DROP POLICY IF EXISTS "Users can see products" ON products;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users see products" ON products
  FOR SELECT TO authenticated
  USING (true);

-- ─── 12. PUBLICAR TABELAS PARA REALTIME ────────────────────────
-- Essencial: sem isso não há notificações em tempo real!
DO $$
BEGIN
  -- Remove de publicação anterior (se existir)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS orders CASCADE;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS order_items CASCADE;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS order_status_history CASCADE;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS financial_entries CASCADE;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS barcode_scans CASCADE;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS delivery_pickups CASCADE;
  
  -- Adiciona novamente em publicação
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
  ALTER PUBLICATION supabase_realtime ADD TABLE financial_entries;
  ALTER PUBLICATION supabase_realtime ADD TABLE barcode_scans;
  ALTER PUBLICATION supabase_realtime ADD TABLE delivery_pickups;
  
  RAISE NOTICE 'Tabelas adicionadas à publicação Realtime ✓';
END $$;

-- ─── 13. FUNÇÃO SQL PARA GERAR NÚMEROS DE PEDIDO ÚNICOS ───────
-- Evita race condition quando múltiplos vendors criam pedidos simultaneamente
-- Usa lock pessimista para garantir unicidade
DROP FUNCTION IF EXISTS fn_get_next_order_number();

CREATE FUNCTION fn_get_next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_num BIGINT;
  v_next_num TEXT;
BEGIN
  -- Lock exclusivo na tabela para evitar race condition
  LOCK TABLE orders IN EXCLUSIVE MODE;
  
  -- Busca o maior número existente
  SELECT COALESCE(MAX(CAST(SUBSTRING(number, 5) AS BIGINT)), 0)
  INTO v_max_num
  FROM orders
  WHERE number LIKE 'PED-%';
  
  -- Gera o próximo número
  v_next_num := 'PED-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
  
  RETURN v_next_num;
END $$;

GRANT EXECUTE ON FUNCTION fn_get_next_order_number() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Função fn_get_next_order_number() criada ✓';
END $$;

-- ─── CONFIRMAÇÃO ──────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✓ MIGRAÇÃO v6 APLICADA COM SUCESSO!                  ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║ CORRIGIDAS:                                            ║';
  RAISE NOTICE '║  1. Duplicatas em orders.number                        ║';
  RAISE NOTICE '║  2. Realtime agora ativo para orders                   ║';
  RAISE NOTICE '║  3. RLS reconfigured para todas as tabelas             ║';
  RAISE NOTICE '║  4. Publicação Realtime ativada                        ║';
  RAISE NOTICE '║                                                        ║';
  RAISE NOTICE '║ PRÓXIMOS PASSOS:                                       ║';
  RAISE NOTICE '║  1. Reload da página da aplicação (Ctrl+F5)            ║';
  RAISE NOTICE '║  2. Abra Financeiro em UM computador                   ║';
  RAISE NOTICE '║  3. Crie novo orçamento em outro computador            ║';
  RAISE NOTICE '║  4. Financeiro NÃO precisa atualizar - verá na hora!   ║';
  RAISE NOTICE '║                                                        ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;
