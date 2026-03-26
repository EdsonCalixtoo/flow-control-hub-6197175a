
-- SQL DEFINITIVO PARA MIGRAÇÃO (SÃO PAULO) 
-- Versão 3.0 (ALINHADA 100% COM O BACKUP)

-- 0. Limpeza para Rebuild (Cuidado: Garante que começamos do zero no projeto novo)
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.subcategories CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.installations CASCADE;
DROP TABLE IF EXISTS public.delay_reports CASCADE;
DROP TABLE IF EXISTS public.barcode_scans CASCADE;
DROP TABLE IF EXISTS public.warranties CASCADE;
DROP TABLE IF EXISTS public.delivery_pickups CASCADE;
DROP TABLE IF EXISTS public.financial_entries CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 1. Usuários
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- vendedor
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  bairro TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  notes TEXT,
  consignado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'un',
  supplier TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pedidos (Tabela Core)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  client_id UUID,
  client_name TEXT,
  seller_id UUID,
  seller_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  taxes NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT,
  notes TEXT,
  observation TEXT,
  payment_method TEXT,
  payment_status TEXT,
  installments NUMERIC,
  delivery_date TEXT,
  receipt_url TEXT,
  receipt_urls JSONB DEFAULT '[]'::jsonb,
  order_type TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  carrier TEXT,
  is_cronograma BOOLEAN,
  financeiro_aprovado BOOLEAN,
  status_pagamento TEXT,
  status_producao TEXT,
  scheduled_date TEXT,
  volumes NUMERIC,
  requires_invoice BOOLEAN,
  comprovantes_vistos NUMERIC,
  is_consigned BOOLEAN,
  is_warranty BOOLEAN,
  installation_date TEXT,
  installation_time TEXT,
  installation_payment_type TEXT,
  production_status TEXT,
  production_started_at TIMESTAMPTZ,
  production_finished_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_by TEXT,
  qr_code TEXT,
  migrado_r2 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Financeiro
CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  status TEXT DEFAULT 'pendente',
  date TEXT,
  order_id UUID,
  order_number TEXT,
  client_id UUID,
  client_name TEXT,
  payment_method TEXT,
  due_date TEXT,
  paid_at TEXT,
  receipt_url TEXT,
  receipt_urls JSONB DEFAULT '[]'::jsonb,
  transaction_id TEXT,
  card_last_digits TEXT,
  migrado_r2 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Entregadores
CREATE TABLE public.delivery_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  deliverer_name TEXT,
  photo_url TEXT,
  signature_url TEXT,
  note TEXT,
  batch_id UUID,
  migrado_r2 BOOLEAN DEFAULT false,
  picked_up_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Garantias
CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  client_id UUID,
  client_name TEXT,
  seller_id UUID,
  seller_name TEXT,
  product TEXT,
  description TEXT,
  status TEXT,
  receipt_urls JSONB DEFAULT '[]'::jsonb,
  resolution TEXT,
  carrier TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Apoio e Relatórios
CREATE TABLE public.barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  scanned_by TEXT,
  success BOOLEAN,
  note TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.delay_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  client_name TEXT,
  order_total NUMERIC,
  reason TEXT,
  sent_by TEXT,
  order_type TEXT,
  delivery_date TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  seller_id UUID,
  client_name TEXT,
  date TEXT,
  time TEXT,
  payment_type TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sender_id UUID,
    sender_name TEXT,
    sender_role TEXT,
    message TEXT,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    reward_type TEXT,
    kits_required NUMERIC,
    kits_completed NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
