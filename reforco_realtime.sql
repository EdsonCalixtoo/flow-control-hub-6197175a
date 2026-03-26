
-- REFORÇO DE REALTIME (SÃO PAULO)

-- 1. Garantir que a extensão do banco está ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpar a publicação antiga para recriar do zero
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 3. Criar a publicação com todas as tabelas necessárias
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.orders, 
    public.financial_entries, 
    public.chat_messages, 
    public.production_errors, 
    public.order_returns, 
    public.warranties;

-- 4. Garantir que o banco registre todas as mudanças (Importante para o Realtime)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.production_errors REPLICA IDENTITY FULL;
ALTER TABLE public.order_returns REPLICA IDENTITY FULL;
ALTER TABLE public.warranties REPLICA IDENTITY FULL;

-- 5. Dar permissão de leitura para "anon" e "authenticated" (Caso o Realtime precise)
-- (Geralmente coberto pelo RLS, mas o Realtime exige que a leitura funcione)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
