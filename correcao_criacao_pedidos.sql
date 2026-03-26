
-- CORREÇÃO DE CRIAÇÃO DE PEDIDOS (SÃO PAULO)

-- 1. Remover a política antiga de pedidos
DROP POLICY IF EXISTS "Acesso a pedidos" ON public.orders;
DROP POLICY IF EXISTS "Teste Realtime Aberto" ON public.orders;

-- 2. Criar uma política mais robusta que permite INSERÇÃO
CREATE POLICY "Permissões de Pedidos" ON public.orders 
FOR ALL 
USING (
    seller_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'producao'])
)
WITH CHECK (
    -- Para inserção, permitimos que o vendedor insira seu próprio ID 
    -- ou que o sistema aceite a inserção se ele for um desses cargos.
    seller_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'producao', 'vendedor'])
);

-- 3. Garantir acesso às tabelas auxiliares que podem barrar a criação do pedido
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Liberar a criação de clientes para vendedores também
DROP POLICY IF EXISTS "Acesso a clientes" ON public.clients;
CREATE POLICY "Permissões de Clientes" ON public.clients 
FOR ALL 
USING (
    user_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'garantia'])
)
WITH CHECK (
    user_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'garantia', 'vendedor'])
);
