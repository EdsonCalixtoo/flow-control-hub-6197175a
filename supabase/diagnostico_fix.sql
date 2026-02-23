-- ============================================================
-- DIAGNÓSTICO E CORREÇÃO COMPLETA
-- Execute no SQL Editor do Supabase
-- ============================================================

-- PASSO 1: Teste direto de insert em products (como service_role, ignora RLS)
-- Isso confirma se a tabela está OK estruturalmente
INSERT INTO products (id, sku, name, description, category, unit_price, cost_price, stock_quantity, min_stock, unit, supplier, status)
VALUES (
  gen_random_uuid(),
  'TESTE-DIAG-001',
  'Produto de Diagnóstico',
  'Verificação de conectividade',
  'Geral',
  100.00,
  50.00,
  10,
  2,
  'un',
  'Sistema',
  'ativo'
);

-- PASSO 2: Confirmar que inseriu
SELECT id, sku, name, status FROM products;

-- PASSO 3: Verificar se o RLS está bloqueando usuários autenticados
-- Mostra as políticas atuais
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products';

-- PASSO 4: Deletar o produto de teste
DELETE FROM products WHERE sku = 'TESTE-DIAG-001';

-- ============================================================
-- SE O INSERT ACIMA FUNCIONOU MAS O FRONTEND NÃO FUNCIONA:
-- O problema é o RLS. Execute o bloco abaixo:
-- ============================================================

-- Opção A: Desabilitar RLS completamente (mais simples para teste)
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_status_history DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_entries DISABLE ROW LEVEL SECURITY;

-- Opção B: Política que permite TUDO (sem verificar autenticação)
-- Use isso se a Opção A não for desejada
DROP POLICY IF EXISTS "products_all" ON products;
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clients_all" ON clients;
CREATE POLICY "clients_all" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_all" ON orders;
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_all" ON order_items;
CREATE POLICY "order_items_all" ON order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "history_all" ON order_status_history;
CREATE POLICY "history_all" ON order_status_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "financial_all" ON financial_entries;
CREATE POLICY "financial_all" ON financial_entries FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('products', 'clients', 'orders')
ORDER BY tablename;
