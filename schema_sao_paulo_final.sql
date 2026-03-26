
-- SQL PROFISSIONAL PARA MIGRAÇÃO (SÃO PAULO)
-- Versão 2.0 (Fiel ao Schema Original)

-- 1. Tabela de Usuários (Base)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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
CREATE TABLE IF NOT EXISTS public.products (
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

-- 4. Pedidos (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
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
  status TEXT DEFAULT 'rascunho',
  notes TEXT,
  observation TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pendente',
  installments NUMERIC DEFAULT 1,
  delivery_date TEXT,
  receipt_url TEXT,
  receipt_urls JSONB DEFAULT '[]'::jsonb,
  order_type TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  carrier TEXT,
  is_cronograma BOOLEAN DEFAULT false,
  financeiro_aprovado BOOLEAN DEFAULT false,
  status_pagamento TEXT DEFAULT 'pendente',
  status_producao TEXT,
  scheduled_date TEXT,
  volumes NUMERIC DEFAULT 1,
  requires_invoice BOOLEAN DEFAULT false,
  comprovantes_vistos NUMERIC DEFAULT 0,
  is_consigned BOOLEAN DEFAULT false,
  is_warranty BOOLEAN DEFAULT false,
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
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- receita / despesa
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

-- 6. Entregadores / Retiradas
CREATE TABLE IF NOT EXISTS public.delivery_pickups (
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
CREATE TABLE IF NOT EXISTS public.warranties (
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

-- 8. Outros (Barcode, Reports)
CREATE TABLE IF NOT EXISTS public.barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  order_number TEXT,
  scanned_by TEXT,
  success BOOLEAN DEFAULT true,
  note TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delay_reports (
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

CREATE TABLE IF NOT EXISTS public.installations (
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

-- 9. Categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sender_id UUID,
    sender_name TEXT,
    sender_role TEXT,
    message TEXT,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    reward_type TEXT,
    kits_required NUMERIC,
    kits_completed NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
