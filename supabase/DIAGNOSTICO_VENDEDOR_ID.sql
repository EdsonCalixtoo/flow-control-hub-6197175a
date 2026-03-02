-- 🔍 DIAGNÓSTICO: Verificar dados de vendedores e produtos

-- 1. Listar todos os vendedores
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM profiles
WHERE role = 'vendedor'
ORDER BY created_at DESC;

-- 2. Verificar perfil específico de Erica
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM profiles
WHERE email ILIKE '%erica%' OR name ILIKE '%erica%';

-- 3. Contar clientes no banco
SELECT 
  COUNT(*) as total_clientes,
  COUNT(DISTINCT created_by) as criados_por_usuarios
FROM clients;

-- 4. Listar primeiros 10 clientes
SELECT 
  id,
  name,
  cpf_cnpj,
  created_by,
  created_at
FROM clients
LIMIT 10;

-- 5. Verificar produtos e estoque
SELECT 
  id,
  name,
  sku,
  stock,
  price,
  status,
  created_at,
  updated_at
FROM products
ORDER BY name;

-- 6. Verificar se estoque foi atualizado recentemente
SELECT 
  id,
  name,
  stock,
  updated_at,
  status
FROM products
WHERE updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- 7. Contar pedidos por vendedor
SELECT 
  seller_id,
  COUNT(*) as qtd_pedidos
FROM orders
GROUP BY seller_id
ORDER BY qtd_pedidos DESC;

-- 8. Verificar RLS: Testar se política está funcionando
-- (Execute como vendedor se possível)
SELECT 
  id,
  name,
  cpf_cnpj
FROM clients
LIMIT 1;

-- 9. Listar produtos específicos do estoque
SELECT 
  id,
  name,
  sku,
  stock as quantidade_estoque,
  price as preco,
  status
FROM products
WHERE status = 'ativo'
ORDER BY name;

-- 10. Verificar se há duplicatas ou registros corrompidos
SELECT 
  name,
  COUNT(*) as duplicatas
FROM profiles
WHERE role = 'vendedor'
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;
