-- SQL PARA CRIAR TABELAS EM SÃO PAULO

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  name TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  email JSONB,
  address TEXT,
  bairro TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  notes JSONB,
  consignado BOOLEAN,
  created_at TEXT,
  updated_at TEXT
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
  payment_status TEXT,
  installments NUMERIC,
  delivery_date TEXT,
  receipt_url TEXT,
  order_type TEXT,
  status_history JSONB,
  created_at TEXT,
  updated_at TEXT,
  receipt_urls JSONB,
  installation_date TEXT,
  installation_time JSONB,
  installation_payment_type TEXT,
  carrier JSONB,
  is_cronograma BOOLEAN,
  financeiro_aprovado BOOLEAN,
  status_pagamento TEXT,
  status_producao TEXT,
  scheduled_date JSONB,
  volumes NUMERIC,
  requires_invoice BOOLEAN,
  comprovantes_vistos NUMERIC,
  is_consigned BOOLEAN,
  production_finished_at JSONB,
  production_started_at JSONB,
  production_status JSONB,
  released_at JSONB,
  released_by JSONB,
  qr_code JSONB,
  is_warranty BOOLEAN,
  migrado_r2 BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  scanned_by TEXT,
  success BOOLEAN,
  note TEXT,
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
  created_at TEXT,
  batch_id TEXT,
  migrado_r2 BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  description TEXT,
  amount NUMERIC,
  category TEXT,
  status TEXT,
  order_id TEXT,
  order_number TEXT,
  client_id TEXT,
  client_name TEXT,
  payment_method TEXT,
  due_date JSONB,
  paid_at JSONB,
  receipt_url JSONB,
  created_at TEXT,
  receipt_urls JSONB,
  transaction_id JSONB,
  card_last_digits JSONB,
  migrado_r2 BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT,
  order_number TEXT,
  client_id TEXT,
  client_name TEXT,
  product TEXT,
  description TEXT,
  status TEXT,
  receipt_urls JSONB,
  resolution JSONB,
  created_at TEXT,
  updated_at TEXT,
  carrier TEXT,
  history JSONB,
  seller_id TEXT,
  seller_name TEXT
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
  created_at TEXT,
  type TEXT
);

