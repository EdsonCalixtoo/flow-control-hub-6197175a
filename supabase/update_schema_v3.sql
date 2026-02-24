-- ═══════════════════════════════════════════════════════════════
-- MIGRAÇÃO v3 — Flow Control Hub ERP
-- Adiciona campo 'bairro' na tabela clients
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- 1. Adiciona coluna bairro na tabela clients (se ainda não existir)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS bairro TEXT NOT NULL DEFAULT '';

-- 2. Confirma alteração
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'bairro'
  ) THEN
    RAISE NOTICE 'Coluna bairro adicionada com sucesso na tabela clients ✓';
  ELSE
    RAISE WARNING 'Coluna bairro NÃO foi adicionada — verifique permissões';
  END IF;
END $$;
