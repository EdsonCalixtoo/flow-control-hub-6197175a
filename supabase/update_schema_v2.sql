-- ============================================================
-- ERP LOVABLE — Migration v2
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar campo 'observation' na tabela orders (campo de observação do orçamento)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS observation TEXT NOT NULL DEFAULT '';

-- 2. Adicionar campo 'scheduled_date' na tabela orders (data de agendamento)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- 3. Adicionar campo 'production_status' na tabela orders
-- Valores: em_producao | agendado | atrasado | finalizado
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_status TEXT;

-- 4. Adicionar campo 'description' nos order_items para descrição completa do produto
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_description TEXT NOT NULL DEFAULT '';

-- 5. Criar tabela de chat interno dos pedidos
CREATE TABLE IF NOT EXISTS order_chat (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name TEXT        NOT NULL,
  sender_role TEXT        NOT NULL,  -- vendedor | producao | financeiro | gestor
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by     TEXT[]      NOT NULL DEFAULT '{}'  -- array de role names que já leram
);

CREATE INDEX IF NOT EXISTS idx_order_chat_order_id ON order_chat(order_id);
CREATE INDEX IF NOT EXISTS idx_order_chat_created_at ON order_chat(created_at DESC);

-- RLS para order_chat
ALTER TABLE order_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on order_chat" ON order_chat FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Criar tabela de devoluções (pedidos devolvidos) para o gestor
CREATE TABLE IF NOT EXISTS order_returns (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT       NOT NULL,
  client_name TEXT        NOT NULL,
  reason      TEXT        NOT NULL,
  reported_by TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on order_returns" ON order_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Criar tabela de erros de produção reportados
CREATE TABLE IF NOT EXISTS production_errors (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  client_name TEXT,
  description TEXT        NOT NULL,
  reported_by TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'media',  -- baixa | media | alta | critica
  resolved    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE production_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on production_errors" ON production_errors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FIM DA MIGRATION v2
-- ============================================================
