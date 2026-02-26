-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v5 — Flow Control Hub ERP
-- Atualiza tabelas para sincronização em tempo real:
--   1. barcode_scans: Já OK da v4, apenas confirma
--   2. delivery_pickups: Corrige colunas para usar delivery_person_id
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── Recriar delivery_pickups com estrutura correta ──────────
-- (Se já existe, será dropada e recriada)
DROP TABLE IF EXISTS delivery_pickups CASCADE;

CREATE TABLE delivery_pickups (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number        TEXT        NOT NULL,
  delivery_person_id  TEXT        NOT NULL,     -- UUID ou ID do entregador
  delivery_person_name TEXT       NOT NULL,     -- Nome do entregador
  picked_up_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_pickups_order_id   ON delivery_pickups(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pickups_person_id  ON delivery_pickups(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pickups_picked_up  ON delivery_pickups(picked_up_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_pickups_order_num  ON delivery_pickups(order_number);

-- RLS: usuários autenticados podem ler e inserir
ALTER TABLE delivery_pickups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users: all on delivery_pickups"
  ON delivery_pickups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Validação: barcode_scans ─────────────────────────────
-- Criação se não existir (compatibilidade com v4)
CREATE TABLE IF NOT EXISTS barcode_scans (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT       NOT NULL,
  scanned_by  TEXT        NOT NULL,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success     BOOLEAN     NOT NULL DEFAULT true,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_barcode_scans_order_id  ON barcode_scans(order_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_scanned_at ON barcode_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_order_num  ON barcode_scans(order_number);

-- RLS
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "auth users: all on barcode_scans"
  ON barcode_scans FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Confirmação ───────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✓ Migração v5 aplicada com sucesso!';
  RAISE NOTICE '  - Tabela barcode_scans: %',   (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barcode_scans'));
  RAISE NOTICE '  - Tabela delivery_pickups: %', (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_pickups'));
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Reload da página da aplicação';
  RAISE NOTICE '  2. Teste scanning de pedido em produção';
  RAISE NOTICE '  3. Verifique se entregadores veem em tempo real';
END $$;
