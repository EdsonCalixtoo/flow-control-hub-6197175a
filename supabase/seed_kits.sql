-- ═══════════════════════════════════════════════════════════
-- SEED: KITs de Produtos
-- Adiciona 9 KITs diferentes ao banco de dados
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════

INSERT INTO products (id, sku, name, description, category, unit_price, cost_price, stock_quantity, min_stock, unit, supplier, status, created_at, updated_at) VALUES

-- KIT SPRINTER .N
('550e8400-e29b-41d4-a716-446655440001', 'KIT-SPR-N', 'KIT SPRINTER .N', 
'1 – Chicote
1 – Suporte da coluna
1 – Courinho com capinha
3 – Enforca gato pequeno
1 – Fusível
1 – Trava em U
1 – Parafuso Allen
5 – Espaçador 40mm
2 – Espaçador 60mm
2 – Adesivos
1 – Garantia
1 – Colar azul
1 – Cremalheira 1,20m', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT DAILY .N
('550e8400-e29b-41d4-a716-446655440002', 'KIT-DAI-N', 'KIT DAILY .N',
'1 – Chicote
1 – Suporte da coluna
1 – Courinho com capinha
3 – Enforca gato pequeno
1 – Fusível
1 – Trava em U
1 – Parafuso Allen
5 – Espaçador 40mm
2 – Espaçador 60mm
2 – Adesivos
1 – Garantia
1 – Colar azul
1 – Cremalheira 1,20m', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT DUCATO
('550e8400-e29b-41d4-a716-446655440003', 'KIT-DUC', 'KIT DUCATO',
'6 – Espaçador 40mm
1 – Porta fusível
1 – Parafuso Allen
1 – Trava cabo
3 – Enforca gato
1 – Courinho com capinha
1 – Suporte da coluna
3 – Adesivos
1 – Garantia
1 – Cremalheira 1,10m
1 – Chicote', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT BOXER
('550e8400-e29b-41d4-a716-446655440004', 'KIT-BOX', 'KIT BOXER',
'6 – Espaçador 40mm
1 – Porta fusível
1 – Parafuso Allen
1 – Trava cabo
3 – Enforca gato
1 – Courinho com capinha
1 – Suporte da coluna
3 – Adesivos
1 – Garantia
1 – Cremalheira 1,10m
1 – Chicote', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT JUMPER
('550e8400-e29b-41d4-a716-446655440005', 'KIT-JUM', 'KIT JUMPER',
'6 – Espaçador 40mm
1 – Porta fusível
1 – Parafuso Allen
1 – Trava cabo
3 – Enforca gato
1 – Courinho com capinha
1 – Suporte da coluna
3 – Adesivos
1 – Garantia
1 – Cremalheira 1,10m
1 – Chicote', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT KOMBI
('550e8400-e29b-41d4-a716-446655440006', 'KIT-KOM', 'KIT KOMBI',
'6 – Espaçador 40mm
1 – Porta fusível
1 – Parafuso Allen
1 – Trava cabo
3 – Enforca gato
1 – Courinho com capinha
1 – Suporte da coluna
3 – Adesivos
1 – Garantia
1 – Cremalheira 1,10m
1 – Chicote', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT MASTER .N
('550e8400-e29b-41d4-a716-446655440007', 'KIT-MAS-N', 'KIT MASTER .N',
'1 – Chicote
1 – Suporte da coluna
1 – Courinho com capinha
3 – Enforca gato pequeno
1 – Fusível
1 – Parafuso Allen
5 – Espaçador 40mm
2 – Espaçador 60mm
2 – Adesivos
1 – Garantia
1 – Colar azul
1 – Cremalheira 1,20m', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT MASTER .A
('550e8400-e29b-41d4-a716-446655440008', 'KIT-MAS-A', 'KIT MASTER .A',
'1 – Chicote
1 – Suporte da coluna
1 – Courinho com capinha
3 – Enforca gato pequeno
1 – Fusível
1 – Parafuso Allen
1 – Trava cabo
5 – Espaçador pequeno
2 – Adesivos
1 – Garantia
1 – Colar azul
1 – Cremalheira 1,00m', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW()),

-- KIT SPRINTER .A
('550e8400-e29b-41d4-a716-446655440009', 'KIT-SPR-A', 'KIT SPRINTER .A',
'1 – Chicote
1 – Suporte da coluna
1 – Courinho com capinha
3 – Enforca gato pequeno
1 – Fusível
1 – Parafuso Allen
1 – Trava cabo
5 – Espaçador pequeno
2 – Adesivos
1 – Garantia
1 – Colar azul
1 – Cremalheira 0,90m', 'Kits', 0.00, 0.00, 100, 100, 'un', 'Dataionika', 'ativo', NOW(), NOW());

-- Confirmação
SELECT COUNT(*) as "Total de KITs inseridos" FROM products WHERE category = 'Kits';
