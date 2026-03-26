
-- SQL DE CORREÇÃO (SÃO PAULO)
-- Adicionando colunas que faltaram na tabela orders

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS installation_date TEXT,
ADD COLUMN IF NOT EXISTS installation_time TEXT,
ADD COLUMN IF NOT EXISTS installation_payment_type TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS production_status TEXT;

-- Ajustando a tabela financial_entries
ALTER TABLE public.financial_entries
ADD COLUMN IF NOT EXISTS paid_at TEXT,
ADD COLUMN IF NOT EXISTS due_date TEXT;

-- Garantindo que a tabela users tenha o campo email
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT;
