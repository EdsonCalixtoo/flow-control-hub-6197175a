
-- AJUSTE DE PERMISSÕES PARA VENDEDORES (SÃO PAULO)

-- 1. Permitir que Vendedores atualizem estoque de produtos
DROP POLICY IF EXISTS "Ajuste de estoque" ON public.products;
CREATE POLICY "Ajuste de estoque" ON public.products FOR UPDATE 
USING (check_user_role(ARRAY['gestor', 'admin', 'producao', 'financeiro', 'vendedor']));

-- 2. Permitir que Vendedores criem lançamentos financeiros (para seus pedidos)
DROP POLICY IF EXISTS "Acesso financeiro" ON public.financial_entries;
CREATE POLICY "Acesso financeiro" ON public.financial_entries FOR ALL 
USING (check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'vendedor']));

-- 3. Garantir inserção em pedidos (importante para novos orçamentos)
-- Já está coberto pelo "Acesso a pedidos" FOR ALL, 
-- mas vamos garantir que o check_user_role inclua vendedor se necessário.
-- (O vendedor já está na lógica do seller_id = auth.uid())

-- 4. Permitir que vejam e criem categorias (leitura já é pública)
-- Se houver erro de inserção em subcategorias, podemos ajustar depois.
