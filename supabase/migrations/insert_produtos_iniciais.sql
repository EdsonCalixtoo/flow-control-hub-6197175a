-- ============================================================
-- INSERT DE PRODUTOS INICIAIS
-- Tabela: products (Supabase)
-- Data: 2026-03-05
-- ============================================================

INSERT INTO products (sku, name, description, category, unit_price, cost_price, stock_quantity, min_stock, unit, supplier, status)
VALUES
  (
    'PLAC-ELET-001',
    'Placa Eletrônica',
    'Placa eletrônica de controle',
    'Eletrônico Vendedor',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'PAR-NYL-ANT-001',
    'Par de nylon (antigo)',
    'Par de nylon modelo antigo',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'pc',
    NULL,
    'ativo'
  ),
  (
    'PAR-NYL-ATU-001',
    'Par de nylon (atual)',
    'Par de nylon modelo atual',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'pc',
    NULL,
    'ativo'
  ),
  (
    'CAPA-PLAS-001',
    'Capa plástica',
    'Capa plástica de proteção',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'CHICOTE-001',
    'Chicote',
    'Chicote elétrico',
    'Eletrônico Vendedor',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'SUP-COL-001',
    'Suporte da coluna',
    'Suporte estrutural da coluna',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'PROT-SUP-COL-001',
    'Proteção do Suporte da coluna',
    'Proteção para o suporte da coluna',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'CORT-CREM-001',
    'Cortina de cremalheira',
    'Cortina protetora da cremalheira',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'un',
    NULL,
    'ativo'
  ),
  (
    'CREM-1M-001',
    'Cremalheira de 1M',
    'Cremalheira com 1 metro de comprimento',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'mt',
    NULL,
    'ativo'
  ),
  (
    'CREM-090CM-001',
    'Cremalheira de 0,90cm',
    'Cremalheira com 0,90 cm de comprimento',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'mt',
    NULL,
    'ativo'
  ),
  (
    'CREM-120CM-001',
    'Cremalheira de 1,20cm',
    'Cremalheira com 1,20 cm de comprimento',
    'Geral',
    0.00,
    0.00,
    0,
    1,
    'mt',
    NULL,
    'ativo'
  );
