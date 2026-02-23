-- ============================================================
-- LIMPAR TODOS OS DADOS DE TESTE — Grupo Automozia ERP
-- Execute este script no Supabase → SQL Editor
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- ============================================================

-- 1. Remove histórico de status (dep. de orders)
TRUNCATE TABLE order_status_history RESTART IDENTITY CASCADE;

-- 2. Remove itens dos pedidos (dep. de orders)
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;

-- 3. Remove lançamentos financeiros (dep. de orders)
TRUNCATE TABLE financial_entries RESTART IDENTITY CASCADE;

-- 4. Remove pedidos (dep. de clients e profiles)
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;

-- 5. Remove clientes
TRUNCATE TABLE clients RESTART IDENTITY CASCADE;

-- 6. Remove produtos / estoque
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

-- ─── Verificação ─────────────────────────────────────────────
SELECT 'order_status_history' AS tabela, COUNT(*) AS registros FROM order_status_history
UNION ALL SELECT 'order_items',          COUNT(*) FROM order_items
UNION ALL SELECT 'financial_entries',    COUNT(*) FROM financial_entries
UNION ALL SELECT 'orders',               COUNT(*) FROM orders
UNION ALL SELECT 'clients',              COUNT(*) FROM clients
UNION ALL SELECT 'products',             COUNT(*) FROM products;

-- ============================================================
-- FIM — Todas as tabelas devem mostrar registros = 0
-- ============================================================
