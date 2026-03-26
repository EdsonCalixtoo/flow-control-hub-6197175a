
-- UNIFICAÇÃO DE CANAIS (SÃO PAULO)

-- 1. Apagar as publicações que estão competindo entre si
-- Isso limpa a "sujeira" do sinal.
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP PUBLICATION IF EXISTS supabase_realtime_messages_publication;

-- 2. Criar UMA ÚNICA publicação para todas as tabelas
-- Esse comando cria o canal supremo que o seu site espera escutar.
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 3. Garantir que o banco mande os dados COMPLETOS
-- (Essencial para o aviso sonoro com o nome do cliente)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.production_errors REPLICA IDENTITY FULL;

-- 4. Abrir permissões de rádio para o sistema de notificações
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
