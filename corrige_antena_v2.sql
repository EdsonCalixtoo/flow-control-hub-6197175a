
-- CORREÇÃO DA ANTENA PRINCIPAL (SÃO PAULO) - V2

-- 1. Resetar apenas a publicação que podemos controlar
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Garantir que o banco de dados entregue tudo o que acontece
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 3. Dar liberdade para o "rádio" do Realtime ler as informações
-- (Sem isso, o aviso sonoro e a atualização automática não acontecem)
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
