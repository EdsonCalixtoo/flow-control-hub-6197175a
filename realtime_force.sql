
-- ATIVAÇÃO FORÇADA DE REALTIME (SÃO PAULO)

-- 1. Recriar a publicação para garantir que pegue tudo
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Garantir que as tabelas principais informem todas as mudanças
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 3. Dar permissão total de acesso ao Realtime para usuários logados
-- Isso é necessário para que o canal de transmissão aceite os ouvintes
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
