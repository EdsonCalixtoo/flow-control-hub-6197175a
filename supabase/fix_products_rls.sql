-- ═══════════════════════════════════════════════════════════━━━
-- FIX: Permissões RLS para tabela PRODUCTS
-- Problema: Gestor não consegue salvar produtos
-- Solução: Aplicar políticas RLS que permitem todos os usuários autenticados
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- Ativar RLS na tabela products (se não estiver ativado)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que possam estar conflitando
DROP POLICY IF EXISTS "auth users: all on products" ON products;
DROP POLICY IF EXISTS "products_all" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products;

-- Criar nova política permissiva para usuários autenticados
CREATE POLICY "authenticated users full access to products"
  ON products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Confirmar que tudo está ok
RAISE NOTICE '✓ Políticas RLS para products configuradas!';
RAISE NOTICE '  • Usuários autenticados podem ler todos os produtos';
RAISE NOTICE '  • Usuários autenticados podem criar/editar/deletar produtos';
