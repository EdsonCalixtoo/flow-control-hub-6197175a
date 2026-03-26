
-- DESTRAVA RADICAL DE TESTE (SÃO PAULO)

-- 1. Remover políitica restritiva de pedidos
DROP POLICY IF EXISTS "Acesso a pedidos" ON public.orders;

-- 2. Criar uma política Aberta (Apenas para o teste confirmarmos o Realtime)
-- CUIDADO: Isso libera a leitura para todos os logados temporariamente.
CREATE POLICY "Teste Realtime Aberto" ON public.orders FOR SELECT USING (true);

-- 3. Garantir que o token autenticado pode ouvir mudanças
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
