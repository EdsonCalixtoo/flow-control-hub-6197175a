-- ============================================================
-- MIGRAÇÃO COMPLETA — ERP Automatiza
-- Execute este script no SQL Editor do Supabase
-- Adiciona colunas novas e corrige RLS
-- ============================================================

-- 1. Adicionar coluna consignado em clients (se não existir)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consignado BOOLEAN NOT NULL DEFAULT false;

-- 2. Adicionar delivery_date e order_type em orders (se não existir)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('entrega', 'instalacao'));

-- 3. Garantir que o campo number existe e é único em orders
-- (já existe no schema original, mas garantindo)
ALTER TABLE orders ALTER COLUMN number SET NOT NULL;

-- 4. Desabilitar RLS temporariamente para testar (OPCIONAL — apenas para debug)
-- Se quiser manter RLS, pule esta seção e vá para a seção 5.

-- 5. Recriar políticas RLS para garantir que funcionem corretamente
-- Revoga políticas antigas que possam estar com problema
DO $$
BEGIN
  -- clients
  DROP POLICY IF EXISTS "auth users: all on clients" ON clients;
  DROP POLICY IF EXISTS "clients_select" ON clients;
  DROP POLICY IF EXISTS "clients_insert" ON clients;
  DROP POLICY IF EXISTS "clients_update" ON clients;
  DROP POLICY IF EXISTS "clients_delete" ON clients;

  -- products  
  DROP POLICY IF EXISTS "auth users: all on products" ON products;
  DROP POLICY IF EXISTS "products_select" ON products;
  DROP POLICY IF EXISTS "products_insert" ON products;
  DROP POLICY IF EXISTS "products_update" ON products;
  DROP POLICY IF EXISTS "products_delete" ON products;

  -- orders
  DROP POLICY IF EXISTS "auth users: all on orders" ON orders;
  DROP POLICY IF EXISTS "orders_select" ON orders;
  DROP POLICY IF EXISTS "orders_insert" ON orders;
  DROP POLICY IF EXISTS "orders_update" ON orders;

  -- order_items
  DROP POLICY IF EXISTS "auth users: all on order_items" ON order_items;
  DROP POLICY IF EXISTS "order_items_select" ON order_items;
  DROP POLICY IF EXISTS "order_items_insert" ON order_items;

  -- order_status_history
  DROP POLICY IF EXISTS "auth users: all on status_history" ON order_status_history;
  DROP POLICY IF EXISTS "history_select" ON order_status_history;
  DROP POLICY IF EXISTS "history_insert" ON order_status_history;

  -- financial_entries
  DROP POLICY IF EXISTS "auth users: all on financial" ON financial_entries;
  DROP POLICY IF EXISTS "financial_select" ON financial_entries;
  DROP POLICY IF EXISTS "financial_insert" ON financial_entries;
  DROP POLICY IF EXISTS "financial_update" ON financial_entries;
END $$;

-- 6. Criar políticas simples e permissivas para usuários autenticados
-- CLIENTS
CREATE POLICY "clients_all" ON clients
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- PRODUCTS
CREATE POLICY "products_all" ON products
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ORDERS
CREATE POLICY "orders_all" ON orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ORDER ITEMS
CREATE POLICY "order_items_all" ON order_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ORDER STATUS HISTORY
CREATE POLICY "history_all" ON order_status_history
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- FINANCIAL ENTRIES
CREATE POLICY "financial_all" ON financial_entries
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Garantir que RLS está habilitado em todas as tabelas
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

-- 8. Verificar se tudo está ok (estas queries devem retornar linhas)
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('clients','products','orders','order_items','order_status_history','financial_entries')
ORDER BY tablename, cmd;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
