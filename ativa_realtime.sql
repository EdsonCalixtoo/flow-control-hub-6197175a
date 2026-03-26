
-- ATIVANDO REALTIME PARA AS TABELAS PRINCIPAIS (SÃO PAULO)

-- 1. Habilitar a publicação 'supabase_realtime' se ela não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Adicionar as tabelas na transmissão em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_errors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_returns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warranties;

-- 3. Garantir que as tabelas tenham o 'REPLICA IDENTITY' como FULL 
-- Isso ajuda o Realtime a mandar todos os campos quando houver mudança.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
