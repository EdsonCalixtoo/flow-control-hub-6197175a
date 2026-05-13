-- Script para marcar comprovantes que foram validados na migração R2
ALTER TABLE orders ADD COLUMN IF NOT EXISTS migrado_r2 BOOLEAN DEFAULT FALSE;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS migrado_r2 BOOLEAN DEFAULT FALSE;
ALTER TABLE delivery_pickups ADD COLUMN IF NOT EXISTS migrado_r2 BOOLEAN DEFAULT FALSE;

-- Marcar como migrado tudo que já possui URL do R2 nos campos principais
UPDATE orders SET migrado_r2 = TRUE WHERE receipt_url LIKE '%r2.dev%';
UPDATE financial_entries SET migrado_r2 = TRUE WHERE receipt_url LIKE '%r2.dev%';
UPDATE delivery_pickups SET migrado_r2 = TRUE WHERE photo_url LIKE '%r2.dev%' OR signature_url LIKE '%r2.dev%';
