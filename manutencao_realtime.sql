
-- LIMPEZA E ATIVAÇÃO TOTAL DE REALTIME (SÃO PAULO)

-- 1. Garantir permissões de conexão para usuários autenticados
GRANT CONNECT ON DATABASE postgres TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Garantir que a publicação aceite tudo sem filtros
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 3. Resetar o registro de identidade das tabelas (Célula de rastreio)
-- Isso força o banco a enviar os dados completos em cada mudança
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.production_errors REPLICA IDENTITY FULL;

-- 4. Abrir permissão na tabela de usuários (essencial para o Realtime validar quem ouve)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Dar permissão de SELECT no Realtime para o usuário logado
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
