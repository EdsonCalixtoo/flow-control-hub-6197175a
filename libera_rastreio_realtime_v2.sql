
-- DESTRAVA GERAL PARA RASTREIO E REALTIME (SÃO PAULO) - V2

-- 1. Liberar leitura de PEDIDOS para público (Essencial para o Rastreio e Realtime)
DROP POLICY IF EXISTS "Acesso a pedidos" ON public.orders;
DROP POLICY IF EXISTS "Teste Realtime Aberto" ON public.orders;
DROP POLICY IF EXISTS "Permissões de Pedidos" ON public.orders;
DROP POLICY IF EXISTS "Leitura de Pedidos Pública" ON public.orders;

-- Política de leitura: Permite buscar dados do pedido pelo número para o rastreio
CREATE POLICY "Leitura de Pedidos Pública" ON public.orders 
FOR SELECT USING (true);

-- Política de escrita: Apenas vendedores ou gestores
CREATE POLICY "Escrita de Pedidos Restrita" ON public.orders 
FOR ALL 
TO authenticated
USING (
    seller_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'producao'])
)
WITH CHECK (
    seller_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'producao', 'vendedor'])
);

-- 2. Liberar leitura de CLIENTES
DROP POLICY IF EXISTS "Acesso a clientes" ON public.clients;
DROP POLICY IF EXISTS "Permissões de Clientes" ON public.clients;
DROP POLICY IF EXISTS "Leitura de Clientes Pública" ON public.clients;
CREATE POLICY "Leitura de Clientes Pública" ON public.clients FOR SELECT USING (true);

-- Política de escrita para Clientes
CREATE POLICY "Escrita de Clientes Restrita" ON public.clients 
FOR ALL 
TO authenticated
USING (
    user_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'garantia'])
)
WITH CHECK (
    user_id = auth.uid()::text 
    OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'garantia', 'vendedor'])
);

-- 3. Habilitar o modo de Realtime irrestrito
-- Apagar a publicação antiga e criar uma mestre que pegue TODAS as tabelas
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 4. Garantir registros completos de mudanças
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
