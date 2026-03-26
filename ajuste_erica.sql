
-- AJUSTE DE CARGO E SEGURANÇA PARA A ERICA (SÃO PAULO)

-- 1. Definir o cargo da Erica como 'garantia'
UPDATE public.users 
SET role = 'garantia', name = 'ERICA' 
WHERE email = 'ericasousa@gmail.com';

-- 2. Atualizar as políticas de Clientes para permitir o cargo 'garantia' ver tudo
DROP POLICY IF EXISTS "Vendedores veem seus clientes" ON public.clients;
CREATE POLICY "Acesso a clientes" ON public.clients 
FOR ALL USING (
    user_id = auth.uid()::text 
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid()::text 
        AND (role IN ('gestor', 'admin', 'financeiro', 'garantia'))
    )
);

-- 3. Atualizar as políticas de Garantias para permitir o cargo 'garantia' gerenciar tudo
DROP POLICY IF EXISTS "Vendedores veem suas garantias" ON public.warranties;
CREATE POLICY "Gestão de garantias" ON public.warranties 
FOR ALL USING (
    seller_id = auth.uid()::text 
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid()::text 
        AND (role IN ('gestor', 'admin', 'garantia'))
    )
);
