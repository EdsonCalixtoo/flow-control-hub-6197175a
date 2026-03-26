
-- SQL DEFINITIVO (SÃO PAULO) - V4 SEGURANÇA TOTAL
-- (Adaptado para aceitar tanto UUIDs quanto IDs Manuais como "RET-")

-- 0. Limpeza Final
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
  id TEXT PRIMARY KEY, -- Usando TEXT para aceitar qualquer ID original
  name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE public.clients (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Pode ser UUID ou código manual
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
  consignado BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Produtos
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price NUMERIC,
  cost_price NUMERIC,
  stock_quantity NUMERIC,
  min_stock NUMERIC,
  unit TEXT,
  supplier TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pedidos (Tabela Core)
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  client_id TEXT,
  client_name TEXT,
  seller_id TEXT,
  seller_name TEXT,
  items JSONB,
  subtotal NUMERIC,
  taxes NUMERIC,
  total NUMERIC,
  status TEXT,
  notes TEXT,
  observation TEXT,
  payment_method TEXT,
  payment_status TEXT,
  installments NUMERIC,
  delivery_date TEXT,
  receipt_url TEXT,
  receipt_urls JSONB,
  order_type TEXT,
  status_history JSONB,
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
  migrado_r2 BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Financeiro
CREATE TABLE public.financial_entries (
  id TEXT PRIMARY KEY,
  type TEXT,
  description TEXT,
  amount NUMERIC,
  category TEXT,
  status TEXT,
  date TEXT,
  order_id TEXT,
  order_number TEXT,
  client_id TEXT,
  client_name TEXT,
  payment_method TEXT,
  due_date TEXT,
  paid_at TEXT,
  receipt_url TEXT,
  receipt_urls JSONB,
  transaction_id TEXT,
  card_last_digits TEXT,
  migrado_r2 BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Entregadores
CREATE TABLE public.delivery_pickups (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  deliverer_name TEXT,
  photo_url TEXT,
  signature_url TEXT,
  note TEXT,
  batch_id TEXT, -- Aqui foi onde o RET- parou da última vez!
  migrado_r2 BOOLEAN,
  picked_up_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Garantias
CREATE TABLE public.warranties (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  client_id TEXT,
  client_name TEXT,
  seller_id TEXT,
  seller_name TEXT,
  product TEXT,
  description TEXT,
  status TEXT,
  receipt_urls JSONB,
  resolution TEXT,
  carrier TEXT,
  history JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Apoio e Relatórios
CREATE TABLE public.barcode_scans (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  scanned_by TEXT,
  success BOOLEAN,
  note TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.delay_reports (
  id TEXT PRIMARY KEY,
  order_id TEXT,
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
  id TEXT PRIMARY KEY,
  order_id TEXT,
  seller_id TEXT,
  client_name TEXT,
  date TEXT,
  time TEXT,
  payment_type TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    sender_id TEXT,
    sender_name TEXT,
    sender_role TEXT,
    message TEXT,
    read_by JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rewards (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    reward_type TEXT,
    kits_required NUMERIC,
    kits_completed NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
