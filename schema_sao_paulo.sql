-- SQL PARA CRIAR TABELAS EM SÃO PAULO

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  role TEXT,
  avatar_url JSONB,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  name TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  email JSONB,
  address TEXT,
  bairro JSONB,
  city TEXT,
  state TEXT,
  cep JSONB,
  notes JSONB,
  consignado BOOLEAN,
  created_at TEXT,
  updated_at TEXT,
  is_site BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  unit_price NUMERIC,
  cost_price NUMERIC,
  stock_quantity NUMERIC,
  min_stock NUMERIC,
  unit TEXT,
  supplier JSONB,
  status TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT,
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
  payment_method JSONB,
  payment_status JSONB,
  installments JSONB,
  delivery_date TEXT,
  receipt_url TEXT,
  receipt_urls JSONB,
  order_type TEXT,
  status_history JSONB,
  carrier TEXT,
  is_cronograma JSONB,
  financeiro_aprovado BOOLEAN,
  status_pagamento TEXT,
  status_producao JSONB,
  scheduled_date JSONB,
  volumes NUMERIC,
  requires_invoice BOOLEAN,
  comprovantes_vistos NUMERIC,
  is_consigned JSONB,
  is_warranty JSONB,
  installation_date JSONB,
  installation_time JSONB,
  installation_payment_type JSONB,
  production_status JSONB,
  production_started_at JSONB,
  production_finished_at JSONB,
  released_at JSONB,
  released_by JSONB,
  qr_code JSONB,
  migrado_r2 JSONB,
  created_at TEXT,
  updated_at TEXT,
  requires_shipping_note BOOLEAN,
  parent_order_id JSONB,
  parent_order_number JSONB,
  is_site BOOLEAN,
  attachment_url JSONB,
  attachment_name JSONB
);

CREATE TABLE IF NOT EXISTS public.barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  scanned_by TEXT,
  success BOOLEAN,
  note TEXT,
  scanned_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.delivery_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  deliverer_name TEXT,
  photo_url TEXT,
  signature_url TEXT,
  note JSONB,
  batch_id TEXT,
  migrado_r2 BOOLEAN,
  picked_up_at TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  description TEXT,
  amount NUMERIC,
  category TEXT,
  status TEXT,
  date JSONB,
  order_id TEXT,
  order_number TEXT,
  client_id TEXT,
  client_name TEXT,
  payment_method TEXT,
  due_date JSONB,
  paid_at JSONB,
  receipt_url JSONB,
  receipt_urls JSONB,
  transaction_id JSONB,
  card_last_digits JSONB,
  migrado_r2 BOOLEAN,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  resolution JSONB,
  carrier TEXT,
  history JSONB,
  created_at TEXT,
  updated_at TEXT,
  order_type TEXT,
  installation_date JSONB,
  installation_time JSONB
);

CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  items JSONB,
  reason TEXT,
  status JSONB,
  created_at TEXT,
  client_name TEXT,
  reported_by TEXT,
  resolved BOOLEAN,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS public.delay_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  client_name TEXT,
  order_total NUMERIC,
  reason TEXT,
  sent_by TEXT,
  order_type TEXT,
  delivery_date TEXT,
  sent_at TEXT,
  read_at TEXT
);

CREATE TABLE IF NOT EXISTS public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  seller_id TEXT,
  client_name TEXT,
  date TEXT,
  time TEXT,
  payment_type TEXT,
  type TEXT,
  created_at TEXT,
  product_name JSONB
);

CREATE TABLE IF NOT EXISTS public.monthly_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT,
  seller_name TEXT,
  reference_month TEXT,
  closing_date TEXT,
  total_sold NUMERIC,
  order_count NUMERIC,
  outstanding_value NUMERIC,
  details JSONB,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS public.client_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT,
  reward_type TEXT,
  kits_required NUMERIC,
  kits_completed NUMERIC,
  kits_consumed NUMERIC,
  kits_adjustment NUMERIC,
  reward_status TEXT,
  reward_redeemed_at JSONB,
  updated_at TEXT,
  created_at TEXT
);

