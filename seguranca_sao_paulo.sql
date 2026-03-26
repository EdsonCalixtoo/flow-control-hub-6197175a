
-- SCHEMA DE SEGURANÇA (SÃO PAULO)
-- Ativando RLS e Políticas de Acesso

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_errors ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS PARA A TABELA USERS
CREATE POLICY "Usuários podem ver o próprio perfil" ON public.users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Gestores podem ver todos os perfis" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin')));

-- 2. POLÍTICAS PARA A TABELA CLIENTS
CREATE POLICY "Vendedores veem seus clientes" ON public.clients FOR ALL USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin' OR role = 'financeiro')));

-- 3. POLÍTICAS PARA A TABELA ORDERS
CREATE POLICY "Vendedores veem seus pedidos" ON public.orders FOR ALL USING (seller_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin' OR role = 'financeiro' OR role = 'producao')));

-- 4. POLÍTICAS PARA A TABELA PRODUCTS (Leitura liberada para todos autenticados)
CREATE POLICY "Todos veem produtos" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestores editam produtos" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin')));

-- 5. POLÍTICAS PARA FINANCIAL_ENTRIES
CREATE POLICY "Acesso financeiro" ON public.financial_entries FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin' OR role = 'financeiro')));

-- 6. POLÍTICAS PARA WARRANTIES
CREATE POLICY "Vendedores veem suas garantias" ON public.warranties FOR ALL USING (seller_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND (role = 'gestor' OR role = 'admin')));

-- 7. POLÍTICAS PARA CATEGORIES (Leitura liberada)
CREATE POLICY "Todos veem categorias" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Todos veem subcategorias" ON public.subcategories FOR SELECT USING (auth.role() = 'authenticated');

-- 8. POLÍTICA PARA SERVICE_ROLE (Backup/Gestão Total)
-- O Supabase já ignora RLS para o service_role, mas vamos garantir o acesso total
CREATE POLICY "Acesso total Service Role" ON public.users FOR ALL USING (auth.role() = 'service_role');
-- (Repetir para outras tabelas se necessário, mas por padrão o service_role pula RLS)
