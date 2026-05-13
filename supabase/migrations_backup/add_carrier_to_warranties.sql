-- Adiciona colunas possivelmente ausentes na tabela warranties
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS receipt_urls JSONB DEFAULT '[]';
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS seller_id TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Garantia criada';
