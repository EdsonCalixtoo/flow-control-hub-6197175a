-- Add volumes column to orders table
-- volumes: number of boxes/packages for this order (defaults to 1)

ALTER TABLE orders
ADD COLUMN volumes INT DEFAULT 1 NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN orders.volumes IS 'Quantidade de volumes/caixas para entrega. Exemplo: pedido 041 com 2 caixas terá volumes=2';
