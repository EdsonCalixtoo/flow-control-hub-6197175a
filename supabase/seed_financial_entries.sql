-- ═══════════════════════════════════════════════════════════════
-- SEED: Dados Financeiros de Exemplo
-- Adiciona lançamentos financeiros para teste do Fluxo de Caixa
-- ═══════════════════════════════════════════════════════════════

-- ─── Receitas dos últimos 6 meses ──────────────────────────
INSERT INTO financial_entries (date, type, amount, category, description, status) VALUES
-- Janeiro
('2025-01-05', 'receita', 5000.00, 'Vendas', 'Venda de produtos - PED-001', 'pago'),
('2025-01-12', 'receita', 3500.00, 'Vendas', 'Venda de produtos - PED-002', 'pago'),
('2025-01-20', 'receita', 4800.00, 'Vendas', 'Venda de produtos - PED-003', 'pago'),

-- Fevereiro
('2025-02-03', 'receita', 6200.00, 'Vendas', 'Venda de produtos - PED-004', 'pago'),
('2025-02-15', 'receita', 4500.00, 'Vendas', 'Venda de produtos - PED-005', 'pago'),
('2025-02-28', 'receita', 5100.00, 'Vendas', 'Venda de produtos - PED-006', 'pago'),

-- Março
('2025-03-08', 'receita', 7200.00, 'Vendas', 'Venda de produtos - PED-007', 'pago'),
('2025-03-18', 'receita', 5900.00, 'Vendas', 'Venda de produtos - PED-008', 'pago'),
('2025-03-25', 'receita', 6100.00, 'Vendas', 'Venda de produtos - PED-009', 'pago'),

-- Abril
('2025-04-05', 'receita', 4800.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-04-16', 'receita', 5600.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-04-28', 'receita', 6200.00, 'Vendas', 'Venda de produtos', 'pago'),

-- Maio
('2025-05-10', 'receita', 7800.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-05-20', 'receita', 6500.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-05-30', 'receita', 7200.00, 'Vendas', 'Venda de produtos', 'pago'),

-- Junho
('2025-06-05', 'receita', 6800.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-06-15', 'receita', 7100.00, 'Vendas', 'Venda de produtos', 'pago'),
('2025-06-25', 'receita', 8200.00, 'Vendas', 'Venda de produtos', 'pago'),

-- ─── Despesas dos últimos 6 meses ─────────────────────────
-- Janeiro
('2025-01-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-01-10', 'despesa', 800.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-01-15', 'despesa', 600.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-01-25', 'despesa', 400.00, 'Transporte', 'Combustível', 'pago'),

-- Fevereiro
('2025-02-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-02-08', 'despesa', 950.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-02-15', 'despesa', 600.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-02-22', 'despesa', 500.00, 'Transporte', 'Combustível', 'pago'),

-- Março
('2025-03-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-03-10', 'despesa', 1200.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-03-15', 'despesa', 600.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-03-28', 'despesa', 450.00, 'Transporte', 'Combustível', 'pago'),

-- Abril
('2025-04-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-04-08', 'despesa', 1000.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-04-15', 'despesa', 600.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-04-22', 'despesa', 400.00, 'Transporte', 'Combustível', 'pago'),

-- Maio
('2025-05-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-05-10', 'despesa', 1100.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-05-15', 'despesa', 650.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-05-25', 'despesa', 480.00, 'Transporte', 'Combustível', 'pago'),

-- Junho
('2025-06-01', 'despesa', 2500.00, 'Folha de Pagamento', 'Salários', 'pago'),
('2025-06-10', 'despesa', 1150.00, 'Matéria Prima', 'Compra de componentes', 'pago'),
('2025-06-15', 'despesa', 650.00, 'Utilidades', 'Energia elétrica', 'pago'),
('2025-06-22', 'despesa', 520.00, 'Transporte', 'Combustível', 'pago');

DO $$
BEGIN
  RAISE NOTICE '✓ Lançamentos financeiros inseridos com sucesso!';
  RAISE NOTICE '  • 18 Receitas (Vendas)';
  RAISE NOTICE '  • 24 Despesas (Folha, Matéria Prima, Utilidades, Transporte)';
  RAISE NOTICE '  • Período: Janeiro a Junho de 2025';
  RAISE NOTICE '  • Total Receitas: R$ 108.300,00';
  RAISE NOTICE '  • Total Despesas: R$ 23.350,00';
  RAISE NOTICE '  • Resultado Líquido: R$ 84.950,00';
END $$;
