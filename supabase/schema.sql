-- ============================================================
-- ERP LOVABLE — Schema Supabase
-- Gerado em: 2026-02-21
-- Cole no SQL Editor do Supabase e execute tudo de uma vez.
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMs ─────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'vendedor', 'financeiro', 'gestor', 'producao'
);

CREATE TYPE order_status AS ENUM (
  'rascunho',
  'enviado',
  'aprovado_cliente',
  'aguardando_financeiro',
  'aprovado_financeiro',
  'rejeitado_financeiro',
  'aguardando_gestor',
  'aprovado_gestor',
  'rejeitado_gestor',
  'aguardando_producao',
  'em_producao',
  'producao_finalizada',
  'produto_liberado'
);

CREATE TYPE payment_status AS ENUM ('pago', 'parcial', 'pendente');
CREATE TYPE discount_type   AS ENUM ('percent', 'value');
CREATE TYPE entry_type      AS ENUM ('receita', 'despesa');
CREATE TYPE entry_status    AS ENUM ('pago', 'pendente');
CREATE TYPE product_status  AS ENUM ('ativo', 'inativo', 'esgotado');

-- ─── TABELA: profiles (extensão do auth.users) ─────────────
-- Criado automaticamente quando um usuário se registra via Supabase Auth.
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       user_role   NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── TABELA: clients ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  cpf_cnpj   TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  city       TEXT        NOT NULL DEFAULT '',
  state      CHAR(2)     NOT NULL DEFAULT '',
  cep        TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_clients_name    ON clients(name);
CREATE INDEX idx_clients_cpf_cnpj ON clients(cpf_cnpj);

-- ─── TABELA: products (estoque) ─────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku            TEXT           NOT NULL UNIQUE,
  name           TEXT           NOT NULL,
  description    TEXT           NOT NULL DEFAULT '',
  category       TEXT           NOT NULL DEFAULT 'Outros',
  unit_price     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  cost_price     NUMERIC(12,2)  NOT NULL DEFAULT 0,
  stock_quantity INTEGER        NOT NULL DEFAULT 0,
  min_stock      INTEGER        NOT NULL DEFAULT 0,
  unit           TEXT           NOT NULL DEFAULT 'un',
  supplier       TEXT           NOT NULL DEFAULT '',
  status         product_status NOT NULL DEFAULT 'ativo',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status   ON products(status);

-- ─── TABELA: orders ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  number                TEXT          NOT NULL UNIQUE,          -- PED-001
  client_id             UUID          NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  client_name           TEXT          NOT NULL,                 -- denormalizado para histórico
  seller_id             UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  seller_name           TEXT          NOT NULL,
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxes                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                order_status  NOT NULL DEFAULT 'rascunho',
  notes                 TEXT          NOT NULL DEFAULT '',
  payment_method        TEXT,
  payment_status        payment_status,
  installments          INTEGER,
  rejection_reason      TEXT,
  receipt_url           TEXT,
  qr_code               TEXT,
  production_started_at TIMESTAMPTZ,
  production_finished_at TIMESTAMPTZ,
  released_at           TIMESTAMPTZ,
  released_by           UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_client_id  ON orders(client_id);
CREATE INDEX idx_orders_seller_id  ON orders(seller_id);
CREATE INDEX idx_orders_number     ON orders(number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ─── TABELA: order_items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name   TEXT          NOT NULL,            -- nome livre (não FK para permitir produtos deletados)
  quantity       INTEGER       NOT NULL DEFAULT 1,
  unit_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type  discount_type NOT NULL DEFAULT 'percent',
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ─── TABELA: order_status_history ────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  changed_by TEXT         NOT NULL DEFAULT 'Sistema',   -- nome do usuário
  note       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id   ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- ─── TABELA: financial_entries (lançamentos) ─────────────────
CREATE TABLE IF NOT EXISTS financial_entries (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          entry_type   NOT NULL,
  description   TEXT         NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  category      TEXT         NOT NULL DEFAULT 'Outros',
  entry_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
  status        entry_status NOT NULL DEFAULT 'pendente',
  order_id      UUID         REFERENCES orders(id) ON DELETE SET NULL,  -- vincula ao pedido de origem
  created_by    UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_financial_entries_updated_at
  BEFORE UPDATE ON financial_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_financial_entries_type     ON financial_entries(type);
CREATE INDEX idx_financial_entries_status   ON financial_entries(status);
CREATE INDEX idx_financial_entries_date     ON financial_entries(entry_date DESC);
CREATE INDEX idx_financial_entries_order_id ON financial_entries(order_id);

-- ─── TRIGGER: auto-cria lançamento ao aprovar pedido ─────────
-- Equivale ao que o frontend faz em updateOrderStatus quando status = 'aprovado_financeiro'
CREATE OR REPLACE FUNCTION auto_create_financial_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Somente quando muda PARA aprovado_financeiro
  IF NEW.status = 'aprovado_financeiro' AND (OLD.status IS DISTINCT FROM 'aprovado_financeiro') THEN
    -- Evita duplicata
    IF NOT EXISTS (
      SELECT 1 FROM financial_entries
      WHERE order_id = NEW.id AND type = 'receita'
    ) THEN
      INSERT INTO financial_entries (type, description, amount, category, entry_date, status, order_id)
      VALUES (
        'receita',
        'Pagamento ' || NEW.number || ' - ' || NEW.client_name,
        NEW.total,
        'Vendas',
        CURRENT_DATE,
        'pago',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_financial_entry
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_create_financial_entry();

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

-- profiles: usuário vê/edita próprio perfil; service role vê tudo
CREATE POLICY "profiles: own read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas gerais: usuários autenticados têm acesso completo (ajuste por role se quiser granular)
CREATE POLICY "auth users: all on clients"         ON clients          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users: all on products"        ON products         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users: all on orders"          ON orders           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users: all on order_items"     ON order_items      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users: all on status_history"  ON order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth users: all on financial"       ON financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── FUNÇÃO: gerar próximo número de pedido ──────────────────
CREATE OR REPLACE FUNCTION next_order_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM orders
  WHERE number LIKE 'PED-%';
  RETURN 'PED-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- ─── SEED DATA (dados iniciais de exemplo) ───────────────────
-- Descomente se quiser inserir dados de exemplo para testar.
/*

INSERT INTO clients (name, cpf_cnpj, phone, email, address, city, state, cep, notes) VALUES
  ('Tech Solutions Ltda',    '12.345.678/0001-90', '(11) 98765-4321', 'contato@techsolutions.com', 'Av. Paulista, 1000',   'São Paulo',   'SP', '01310-100', 'Cliente premium'),
  ('Inovatech S.A.',         '98.765.432/0001-10', '(21) 99876-5432', 'financeiro@inovatech.com',  'Rua do Comércio, 200', 'Rio de Janeiro','RJ','20040-020', ''),
  ('Digital Corp ME',        '11.222.333/0001-44', '(31) 97654-3210', 'hello@digitalcorp.com',     'Av. Afonso Pena, 300', 'Belo Horizonte','MG','30130-001', ''),
  ('Sistemas Avançados Ltda','44.555.666/0001-77', '(41) 96543-2109', 'comercial@sistemasav.com',  'Rua XV de Novembro, 400', 'Curitiba', 'PR', '80020-310', '');

INSERT INTO products (sku, name, description, category, unit_price, cost_price, stock_quantity, min_stock, unit, supplier, status) VALUES
  ('SRV-DELL-01', 'Servidor Dell PowerEdge',    'Servidor rack Dell PowerEdge R740',           'Servidores',    15000, 11000,  8, 3,  'un', 'Dell Brasil',    'ativo'),
  ('NTB-LNV-01',  'Notebook Lenovo ThinkPad',   'Notebook Lenovo ThinkPad T14 Gen 3',          'Notebooks',      4500,  3200, 15, 5,  'un', 'Lenovo Brasil',  'ativo'),
  ('SWT-CSC-01',  'Switch Cisco 48 portas',      'Switch Gerenciável Cisco Catalyst 2960',       'Redes',          3200,  2400, 12, 4,  'un', 'Cisco Systems',  'ativo'),
  ('MON-LG-27',   'Monitor LG 27"',             'Monitor LG UltraWide 27" IPS',               'Monitores',      1800,  1200,  2, 5,  'un', 'LG Electronics', 'ativo'),
  ('CBL-CAT6-01', 'Cabo de rede Cat6 (cx)',      'Caixa 305m cabo UTP Cat6',                   'Cabeamento',      180,   120, 45, 10, 'cx', 'Furukawa',       'ativo'),
  ('TEC-MEC-01',  'Teclado Mecânico',           'Teclado Mecânico RGB Switch Blue',            'Periféricos',     350,   200,  0, 10, 'un', 'Redragon',       'esgotado'),
  ('HD-SSD-500',  'SSD 500GB NVMe',             'SSD Kingston NV2 500GB NVMe M.2',            'Armazenamento',   280,   180, 30, 8,  'un', 'Kingston',       'ativo');

INSERT INTO financial_entries (type, description, amount, category, entry_date, status) VALUES
  ('receita', 'Pagamento PED-003', 35200,  'Vendas',          '2025-12-03', 'pago'),
  ('despesa', 'Aluguel escritório', 5500,  'Infraestrutura',  '2025-12-01', 'pago'),
  ('despesa', 'Energia elétrica',   1200,  'Infraestrutura',  '2025-12-05', 'pendente'),
  ('receita', 'Pagamento PED-006',  7700,  'Vendas',          '2025-12-07', 'pago'),
  ('despesa', 'Folha de pagamento', 28000, 'Pessoal',         '2025-12-05', 'pago'),
  ('receita', 'Pagamento PED-005',  8415,  'Vendas',          '2025-12-06', 'pago');

*/

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
