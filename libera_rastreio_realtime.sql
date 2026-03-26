
-- DESTRAVA GERAL PARA RASTREIO E REALTIME (SÃO PAULO)

-- 1. Liberar leitura de PEDIDOS para público (Essencial para o Rastreio e Realtime)
-- Removendo políticas anteriores de pedidos
DROP POLICY IF EXISTS "Acesso a pedidos" ON public.orders;
DROP POLICY IF EXISTS "Teste Realtime Aberto" ON public.orders;
DROP POLICY IF EXISTS "Permissões de Pedidos" ON public.orders;

-- Política de leitura: Qualquer pessoa (mesmo sem login) pode ver os dados de um pedido
-- para o rastreio funcionar pelo número.
CREATE POLICY "Leitura de Pedidos Pública" ON public.orders 
FOR SELECT USING (true);

-- Política de escrita: Apenas vendedores ou gestores podem criar ou editar
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

-- 2. Abrir visualização de CLIENTES para poder carregar o nome no rastreio se necessário
DROP POLICY IF EXISTS "Acesso a clientes" ON public.clients;
DROP POLICY IF EXISTS "Permissões de Clientes" ON public.clients;
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

-- 3. Habilitar o modo de Realtime irrestrito na publicação
-- Isso garante que as notificações não sejam filtradas antes de chegar na tela.
ALTER PUBLICATION supabase_realtime OWNER TO postgres;
ALTER PUBLICATION supabase_realtime SET ALL TABLES;

-- 4. Re-garantir que as tabelas informam todas as mudanças
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
