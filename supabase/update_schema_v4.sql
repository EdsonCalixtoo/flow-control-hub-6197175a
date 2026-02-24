-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v4 — Flow Control Hub ERP
-- Adiciona suporte a:
--   1. Leituras de código de barras pela Produção
--   2. Retiradas dos Entregadores (foto + assinatura)
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tabela de leituras de código de barras ───────────────
CREATE TABLE IF NOT EXISTS barcode_scans (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT       NOT NULL,
  scanned_by  TEXT        NOT NULL,             -- nome do usuário de produção
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success     BOOLEAN     NOT NULL DEFAULT true,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_barcode_scans_order_id  ON barcode_scans(order_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_scanned_at ON barcode_scans(scanned_at DESC);

-- RLS: usuários autenticados podem ler e inserir
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on barcode_scans"
  ON barcode_scans FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── 2. Tabela de retiradas pelos entregadores ───────────────
CREATE TABLE IF NOT EXISTS delivery_pickups (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number    TEXT        NOT NULL,
  deliverer_name  TEXT        NOT NULL,
  photo_url       TEXT        NOT NULL,          -- base64 ou URL da foto do rosto
  signature_url   TEXT        NOT NULL,          -- base64 da assinatura
  picked_up_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note            TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_pickups_order_id   ON delivery_pickups(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pickups_picked_up  ON delivery_pickups(picked_up_at DESC);

-- RLS
ALTER TABLE delivery_pickups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on delivery_pickups"
  ON delivery_pickups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Confirmação ───────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migração v4 aplicada com sucesso ✓';
  RAISE NOTICE '  - Tabela barcode_scans: %',   (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_scans'));
  RAISE NOTICE '  - Tabela delivery_pickups: %', (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_pickups'));
END $$;
