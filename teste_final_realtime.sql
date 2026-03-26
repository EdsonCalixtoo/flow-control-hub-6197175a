
-- DIAGNÓSTICO DEFINITIVO (SÃO PAULO)

-- 1. Desativar RLS temporariamente para teste (Remover o cadeado)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões de uso no esquema do Realtime
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA realtime TO authenticated;

-- 3. Resetar publicação
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
