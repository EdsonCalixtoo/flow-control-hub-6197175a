-- ════════════════════════════════════════════════════════════════
-- Migration v7: Adicionar coluna sensor_type para itens de pedido
-- Objetivo: Rastrear se produto KIT é com ou sem sensor
-- ════════════════════════════════════════════════════════════════

-- Garantir que product_description existe (de v2)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_description TEXT NOT NULL DEFAULT '';

-- Adicionar coluna sensor_type à tabela order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS sensor_type VARCHAR(20) DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN order_items.product_description IS 'Descrição detalhada do produto';
COMMENT ON COLUMN order_items.sensor_type IS 'Tipo de sensor para produtos KIT: com_sensor ou sem_sensor';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_order_items_sensor_type ON order_items(sensor_type);

-- Confirmação
SELECT 'Migration v7 aplicada com sucesso' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name IN ('product_description', 'sensor_type');
