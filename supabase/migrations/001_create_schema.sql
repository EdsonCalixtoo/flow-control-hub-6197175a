-- ===============================================
-- SCHEMA DO ERP - FLOW CONTROL HUB
-- ===============================================

-- 1. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('vendedor', 'financeiro', 'gestor', 'producao', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf_cnpj TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  address TEXT,
  bairro TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  notes TEXT,
  consignado BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE ORÇAMENTOS
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'enviado', 'aprovado_cliente', 'aguardando_financeiro',
    'aprovado_financeiro', 'rejeitado_financeiro', 'aguardando_gestor',
    'aprovado_gestor', 'rejeitado_gestor', 'aguardando_producao',
    'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
  )),
  subtotal DECIMAL(12, 2) DEFAULT 0,
  taxes DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  observation TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pendente' CHECK (payment_status IN ('pago', 'parcial', 'pendente')),
  installments INTEGER DEFAULT 1,
  rejection_reason TEXT,
  qr_code TEXT,
  receipt_url TEXT,
  production_started_at TIMESTAMP WITH TIME ZONE,
  production_finished_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delivery_date DATE,
  scheduled_date DATE,
  order_type TEXT CHECK (order_type IN ('entrega', 'instalacao')),
  production_status TEXT CHECK (production_status IN ('em_producao', 'agendado', 'atrasado', 'finalizado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE ITENS DO ORÇAMENTO
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount DECIMAL(12, 2) DEFAULT 0 CHECK (discount >= 0),
  discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent', 'value')),
  total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
  sensor_type TEXT CHECK (sensor_type IN ('com_sensor', 'sem_sensor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE HISTÓRICO DE STATUS
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE MENSAGENS (CHAT)
CREATE TABLE IF NOT EXISTS order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ===============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- PROFILES: Cada usuário vê seu próprio perfil e admins veem todos
CREATE POLICY "profiles_select_self" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_all_by_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CLIENTS: Vendedor vê seus clientes, outros veem todos
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor'))
  );

CREATE POLICY "clients_insert_vendedor" ON clients
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendedor')
  );

CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- QUOTES: Vendedor vê seus orçamentos, financeiro vê todos, etc
CREATE POLICY "quotes_select_vendedor" ON quotes
  FOR SELECT USING (
    seller_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
  );

CREATE POLICY "quotes_insert_vendedor" ON quotes
  FOR INSERT WITH CHECK (
    seller_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendedor')
  );

CREATE POLICY "quotes_update_vendedor" ON quotes
  FOR UPDATE USING (
    seller_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
  );

-- QUOTE_ITEMS: Acesso baseado no acesso ao orçamento
CREATE POLICY "quote_items_select" ON quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND (
        seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
      )
    )
  );

CREATE POLICY "quote_items_insert" ON quote_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND seller_id = auth.uid()
    )
  );

-- ORDER_STATUS_HISTORY: Todos podem ver o histórico dos orçamentos que têm acesso
CREATE POLICY "status_history_select" ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND (
        seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
      )
    )
  );

CREATE POLICY "status_history_insert" ON order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND (
        seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
      )
    )
  );

-- ORDER_MESSAGES: Chat do orçamento
CREATE POLICY "messages_select" ON order_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND (
        seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
      )
    )
  );

CREATE POLICY "messages_insert" ON order_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM quotes WHERE id = quote_id AND (
        seller_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'financeiro', 'gestor', 'producao'))
      )
    )
  );

-- ===============================================
-- ÍNDICES PARA PERFORMANCE
-- ===============================================

CREATE INDEX idx_clients_seller ON clients(created_by);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_seller ON quotes(seller_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_status_history_quote ON order_status_history(quote_id);
CREATE INDEX idx_messages_quote ON order_messages(quote_id);
CREATE INDEX idx_messages_sender ON order_messages(sender_id);

-- ===============================================
-- FUNÇÕES PARA AUTOMAÇÃO
-- ===============================================

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON order_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
