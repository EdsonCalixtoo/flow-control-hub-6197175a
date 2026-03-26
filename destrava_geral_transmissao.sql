
-- DESTRAVA GERAL DE TRANSMISSÃO EM TEMPO REAL (SÃO PAULO)

-- 1. Garantir que a extensão do Realtime está em dia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Garantir permissões de rádio para as tabelas principais
-- Se este comando der erro, não tem problema, continue para o próximo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 3. Escancarar a porta para as notificações passarem
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Unificar as "antenas" (Ignorando se a protegida der erro)
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders, public.financial_entries, public.chat_messages, public.production_errors';
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Já estava adicionada ou sem permissão, ignoramos
END $$;

-- 5. Dar "REPLICA IDENTITY FULL" para o rádio mandar os dados completos
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;

-- 6. O Pulo do Gato: Permissão no schema de rádio (Realtime)
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA realtime TO authenticated;
