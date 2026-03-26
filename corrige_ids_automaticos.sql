
-- CORREÇÃO COMPLETA DE IDs AUTOMÁTICOS (SÃO PAULO)
-- Adiciona gen_random_uuid() como default para TODAS as tabelas principais

ALTER TABLE public.clients ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.orders ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.warranties ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.financial_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chat_messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Tabelas secundárias (podem dar erro se não existirem, pode ignorar)
DO $$ BEGIN
  ALTER TABLE public.order_returns ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.production_errors ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.delay_reports ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.barcode_scans ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN NULL; END $$;
