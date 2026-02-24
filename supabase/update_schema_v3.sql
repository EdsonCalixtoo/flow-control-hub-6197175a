-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v3 — Flow Control Hub ERP
-- Adiciona campos 'bairro' e 'created_by' na tabela clients
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Adiciona coluna bairro na tabela clients (se ainda não existir)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS bairro TEXT NOT NULL DEFAULT '';

-- 2. Adiciona coluna created_by para rastrear qual vendedor cadastrou o cliente
--    Necessário para filtrar clientes por vendedor no dropdown de orçamentos
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT NULL;

-- 3. Confirma alterações
DO $$
BEGIN
  RAISE NOTICE 'Migração v3 aplicada com sucesso ✓';
  RAISE NOTICE '  - Coluna bairro: %', (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'bairro'));
  RAISE NOTICE '  - Coluna created_by: %', (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'created_by'));
END $$;

