-- ═══════════════════════════════════════════════════════════════
-- SEED: Produtos de Estoque
-- Adiciona 75 produtos em 3 categorias
-- ═══════════════════════════════════════════════════════════════

-- ─── CATEGORIA: PEÇAS ──────────────────────────────────────
INSERT INTO products (sku, name, category, stock_quantity, min_stock, unit_price, cost_price, unit, status) VALUES
('PEC-001', 'Parafuso PHL m6x16', 'Peças', 100, 100, 0.50, 0.25, 'un', 'ativo'),
('PEC-002', 'Parafuso PHL m6x25', 'Peças', 100, 100, 0.60, 0.30, 'un', 'ativo'),
('PEC-003', 'Parafuso PHL m6x30', 'Peças', 100, 100, 0.65, 0.33, 'un', 'ativo'),
('PEC-004', 'Parafuso PHL m6x35', 'Peças', 100, 100, 0.70, 0.35, 'un', 'ativo'),
('PEC-005', 'Parafuso PHL m6x40', 'Peças', 100, 100, 0.75, 0.38, 'un', 'ativo'),
('PEC-006', 'Parafuso PHL m6x50', 'Peças', 100, 100, 0.85, 0.42, 'un', 'ativo'),
('PEC-007', 'Parafuso PHL m6x60', 'Peças', 100, 100, 0.95, 0.48, 'un', 'ativo'),
('PEC-008', 'Parafuso allen m6', 'Peças', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('PEC-009', 'Parafuso perf. 3,5x45', 'Peças', 100, 100, 0.40, 0.20, 'un', 'ativo'),
('PEC-010', 'Parafuso perf. 3,5x25', 'Peças', 100, 100, 0.35, 0.18, 'un', 'ativo'),
('PEC-011', 'Parafuso brocante', 'Peças', 100, 100, 0.55, 0.28, 'un', 'ativo'),
('PEC-012', 'Parafuso chipboard', 'Peças', 100, 100, 0.45, 0.22, 'un', 'ativo'),
('PEC-013', 'Parlock m6', 'Peças', 100, 100, 0.35, 0.18, 'un', 'ativo'),
('PEC-014', 'Parlock m8', 'Peças', 100, 100, 0.50, 0.25, 'un', 'ativo'),
('PEC-015', 'Arruela 1/4', 'Peças', 100, 100, 0.25, 0.12, 'un', 'ativo'),
('PEC-016', 'Arruela 7/16', 'Peças', 100, 100, 0.30, 0.15, 'un', 'ativo'),
('PEC-017', 'Barra roscada M8', 'Peças', 100, 100, 2.50, 1.25, 'un', 'ativo'),
('PEC-018', 'Parafuso PHL m6x50 (inox)', 'Peças', 100, 100, 1.80, 0.90, 'un', 'ativo'),
('PEC-019', 'Parafuso m6x20 sextavado', 'Peças', 100, 100, 0.65, 0.33, 'un', 'ativo'),
('PEC-020', 'Parafuso m8x12 sextavado', 'Peças', 100, 100, 0.85, 0.42, 'un', 'ativo'),
('PEC-021', 'Porta fusivel', 'Peças', 100, 100, 1.20, 0.60, 'un', 'ativo'),
('PEC-022', 'Trava cabo', 'Peças', 100, 100, 0.75, 0.38, 'un', 'ativo'),
('PEC-023', 'Cabo de aço', 'Peças', 100, 100, 3.50, 1.75, 'un', 'ativo'),
('PEC-024', 'Rebite 4,8x12', 'Peças', 100, 100, 0.30, 0.15, 'un', 'ativo'),
('PEC-025', 'Interruptor estribo', 'Peças', 100, 100, 2.00, 1.00, 'un', 'ativo');

-- ─── CATEGORIA: ELETRÔNICO ────────────────────────────────
INSERT INTO products (sku, name, category, stock_quantity, min_stock, unit_price, cost_price, unit, status) VALUES
('ELE-001', 'Placa crua', 'Eletrônico', 100, 100, 5.00, 2.50, 'un', 'ativo'),
('ELE-002', 'Memória', 'Eletrônico', 100, 100, 3.50, 1.75, 'un', 'ativo'),
('ELE-003', 'Receptor', 'Eletrônico', 100, 100, 8.00, 4.00, 'un', 'ativo'),
('ELE-004', 'Pilha pequena', 'Eletrônico', 100, 100, 1.20, 0.60, 'un', 'ativo'),
('ELE-005', 'Pilha grande', 'Eletrônico', 100, 100, 2.50, 1.25, 'un', 'ativo'),
('ELE-006', 'C.I', 'Eletrônico', 100, 100, 4.50, 2.25, 'un', 'ativo'),
('ELE-007', 'Buzzer', 'Eletrônico', 100, 100, 1.80, 0.90, 'un', 'ativo'),
('ELE-008', 'Relé', 'Eletrônico', 100, 100, 3.00, 1.50, 'un', 'ativo'),
('ELE-009', 'Borne 2 vias', 'Eletrônico', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('ELE-010', '1K', 'Eletrônico', 100, 100, 0.15, 0.08, 'un', 'ativo'),
('ELE-011', '4K7', 'Eletrônico', 100, 100, 0.15, 0.08, 'un', 'ativo'),
('ELE-012', '4007', 'Eletrônico', 100, 100, 0.25, 0.12, 'un', 'ativo'),
('ELE-013', '104', 'Eletrônico', 100, 100, 0.20, 0.10, 'un', 'ativo'),
('ELE-014', '337', 'Eletrônico', 100, 100, 0.20, 0.10, 'un', 'ativo'),
('ELE-015', '100R', 'Eletrônico', 100, 100, 0.15, 0.08, 'un', 'ativo'),
('ELE-016', '470R', 'Eletrônico', 100, 100, 0.15, 0.08, 'un', 'ativo'),
('ELE-017', 'Led', 'Eletrônico', 100, 100, 0.35, 0.18, 'un', 'ativo'),
('ELE-018', 'Encaixe da memória', 'Eletrônico', 100, 100, 1.50, 0.75, 'un', 'ativo'),
('ELE-019', 'Encaixe do C.I', 'Eletrônico', 100, 100, 1.50, 0.75, 'un', 'ativo'),
('ELE-020', 'Botão', 'Eletrônico', 100, 100, 0.50, 0.25, 'un', 'ativo'),
('ELE-021', 'Borne 3 vias', 'Eletrônico', 100, 100, 1.00, 0.50, 'un', 'ativo'),
('ELE-022', '78L05', 'Eletrônico', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('ELE-023', 'Barra pinos 1x40 11,2mm', 'Eletrônico', 100, 100, 1.20, 0.60, 'un', 'ativo');

-- ─── CATEGORIA: DIVERSOS ──────────────────────────────────
INSERT INTO products (sku, name, category, stock_quantity, min_stock, unit_price, cost_price, unit, status) VALUES
('DIV-001', 'Motor', 'Diversos', 100, 100, 15.00, 7.50, 'un', 'ativo'),
('DIV-002', 'Fio cristal', 'Diversos', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('DIV-003', 'Fio 2 vias', 'Diversos', 100, 100, 1.50, 0.75, 'un', 'ativo'),
('DIV-004', 'Patola', 'Diversos', 100, 100, 2.50, 1.25, 'un', 'ativo'),
('DIV-005', 'Sensor antiesmagamento', 'Diversos', 100, 100, 4.00, 2.00, 'un', 'ativo'),
('DIV-006', 'Nylon quadrado', 'Diversos', 100, 100, 0.60, 0.30, 'un', 'ativo'),
('DIV-007', 'Nylon redondo', 'Diversos', 100, 100, 0.70, 0.35, 'un', 'ativo'),
('DIV-008', 'Final de curso', 'Diversos', 100, 100, 3.50, 1.75, 'un', 'ativo'),
('DIV-009', 'Rótula M8', 'Diversos', 100, 100, 2.00, 1.00, 'un', 'ativo'),
('DIV-010', 'Caixa papelão', 'Diversos', 100, 100, 1.00, 0.50, 'un', 'ativo'),
('DIV-011', 'Folha garantia', 'Diversos', 100, 100, 0.20, 0.10, 'un', 'ativo'),
('DIV-012', 'Strach pequeno', 'Diversos', 100, 100, 0.50, 0.25, 'un', 'ativo'),
('DIV-013', 'Strach grande', 'Diversos', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('DIV-014', 'Trava rosca', 'Diversos', 100, 100, 1.50, 0.75, 'un', 'ativo'),
('DIV-015', 'Cola tek bond', 'Diversos', 100, 100, 8.00, 4.00, 'un', 'ativo'),
('DIV-016', 'Fita adesiva', 'Diversos', 100, 100, 2.00, 1.00, 'un', 'ativo'),
('DIV-017', 'Tecido courvin', 'Diversos', 100, 100, 3.50, 1.75, 'un', 'ativo'),
('DIV-018', 'Imã neodimio', 'Diversos', 100, 100, 2.50, 1.25, 'un', 'ativo'),
('DIV-019', 'Imã preto', 'Diversos', 100, 100, 1.50, 0.75, 'un', 'ativo'),
('DIV-020', 'Botão verde', 'Diversos', 100, 100, 0.60, 0.30, 'un', 'ativo'),
('DIV-021', 'Abraçadeira grande', 'Diversos', 100, 100, 0.50, 0.25, 'un', 'ativo'),
('DIV-022', 'Abraçadeira pequena', 'Diversos', 100, 100, 0.30, 0.15, 'un', 'ativo'),
('DIV-023', 'Terminal olhal', 'Diversos', 100, 100, 0.40, 0.20, 'un', 'ativo'),
('DIV-024', 'Terminal mosquitinho', 'Diversos', 100, 100, 0.35, 0.18, 'un', 'ativo'),
('DIV-025', 'Estanho fio', 'Diversos', 100, 100, 2.00, 1.00, 'un', 'ativo'),
('DIV-026', 'Estanho barra', 'Diversos', 100, 100, 3.00, 1.50, 'un', 'ativo'),
('DIV-027', 'Fusivel', 'Diversos', 100, 100, 0.80, 0.40, 'un', 'ativo'),
('DIV-028', 'Controle', 'Diversos', 100, 100, 12.00, 6.00, 'un', 'ativo'),
('DIV-029', 'Cordão', 'Diversos', 100, 100, 1.20, 0.60, 'un', 'ativo');

-- ─── Confirmação ──────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✓ 75 produtos inseridos com sucesso!';
  RAISE NOTICE '  • 25 Peças';
  RAISE NOTICE '  • 23 Eletrônicos';
  RAISE NOTICE '  • 27 Diversos';
  RAISE NOTICE '  • Todos com 100 un no estoque e mínimo de 100';
END $$;
