-- Migração para adicionar suporte a vendas internacionais
-- Execute este script no editor SQL do Supabase (https://supabase.com)

-- 1. Adicionar coluna 'is_international' na tabela 'clients'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT FALSE;

-- 2. Adicionar coluna 'is_international' na tabela 'orders'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT FALSE;

-- 3. Habilitar RLS e garantir que a nova coluna seja visível
-- Se já houver políticas criadas, o Supabase as aplicará automaticamente para as novas colunas
COMMENT ON COLUMN clients.is_international IS 'Indica se o cliente reside fora do Brasil e não possui CPF/CNPJ';
COMMENT ON COLUMN orders.is_international IS 'Indica se a venda é internacional (isenta de CPF/CNPJ)';
