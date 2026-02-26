-- ═══════════════════════════════════════════════════════════════
-- FIX: Visibilidade de dados entre dispositivos
-- Problema: dados só aparecem no mesmo dispositivo que fez a venda
-- Causa: RLS (Row Level Security) bloqueando acesso cross-device
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Remove políticas que bloqueiam a anon key ───────────────
-- (garante que qualquer usuário autenticado veja todos os dados)

-- ORDERS
DROP POLICY IF EXISTS "auth users: all on orders" ON orders;
CREATE POLICY "auth users: all on orders"
  ON orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- CLIENTS
DROP POLICY IF EXISTS "auth users: all on clients" ON clients;
CREATE POLICY "auth users: all on clients"
  ON clients FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- PRODUCTS
DROP POLICY IF EXISTS "auth users: all on products" ON products;
CREATE POLICY "auth users: all on products"
  ON products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ORDER ITEMS
DROP POLICY IF EXISTS "auth users: all on order_items" ON order_items;
CREATE POLICY "auth users: all on order_items"
  ON order_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ORDER STATUS HISTORY
DROP POLICY IF EXISTS "auth users: all on status_history" ON order_status_history;
CREATE POLICY "auth users: all on status_history"
  ON order_status_history FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- FINANCIAL ENTRIES
DROP POLICY IF EXISTS "auth users: all on financial" ON financial_entries;
CREATE POLICY "auth users: all on financial"
  ON financial_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ORDER CHAT
DROP POLICY IF EXISTS "auth users: all on order_chat" ON order_chat;
CREATE POLICY "auth users: all on order_chat"
  ON order_chat FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ORDER RETURNS
DROP POLICY IF EXISTS "auth users: all on order_returns" ON order_returns;
CREATE POLICY "auth users: all on order_returns"
  ON order_returns FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- PRODUCTION ERRORS
DROP POLICY IF EXISTS "auth users: all on production_errors" ON production_errors;
CREATE POLICY "auth users: all on production_errors"
  ON production_errors FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- PROFILES: permite que qualquer usuário autenticado veja todos os perfis
-- (necessário para carregamento do papel/role em outros dispositivos)
DROP POLICY IF EXISTS "profiles: own read" ON profiles;
DROP POLICY IF EXISTS "profiles: own update" ON profiles;
DROP POLICY IF EXISTS "profiles: all authenticated read" ON profiles;
CREATE POLICY "profiles: all authenticated read"
  ON profiles FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ─── 2. Habilita Realtime nas tabelas ────────────────────────────
-- (necessário para sincronização em tempo real entre dispositivos)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_entries;

-- ─── 3. Verificação ──────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== Fix RLS Visibility aplicado com sucesso ✓ ===';
  RAISE NOTICE 'Todos os usuários autenticados podem ver todos os dados';
  RAISE NOTICE 'Realtime habilitado nas tabelas principais';
END $$;
