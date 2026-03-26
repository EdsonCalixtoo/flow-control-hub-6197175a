
-- SCRIPT DESTRAVA - CORREÇÃO DE RECURSÃO INFINITA (SÃO PAULO)

-- 1. Remover as políticas que estão causando o conflito
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Gestores podem ver todos os perfis" ON public.users;
DROP POLICY IF EXISTS "Vendedores veem seus clientes" ON public.clients;
DROP POLICY IF EXISTS "Acesso a clientes" ON public.clients;
DROP POLICY IF EXISTS "Vendedores veem seus pedidos" ON public.orders;
DROP POLICY IF EXISTS "Gestores editam produtos" ON public.products;
DROP POLICY IF EXISTS "Acesso financeiro" ON public.financial_entries;
DROP POLICY IF EXISTS "Vendedores veem suas garantias" ON public.warranties;
DROP POLICY IF EXISTS "Gestão de garantias" ON public.warranties;

-- 2. Criar função de verificação de cargo que não causa recursão
CREATE OR REPLACE FUNCTION public.check_user_role(target_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = ANY(target_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER ignora RLS interno

-- 3. Recriar Políticas Sem Conflito

-- USERS
CREATE POLICY "Leitura de perfil" ON public.users FOR SELECT 
USING (auth.uid()::text = id OR check_user_role(ARRAY['gestor', 'admin']));

-- CLIENTS
CREATE POLICY "Acesso a clientes" ON public.clients FOR ALL 
USING (user_id = auth.uid()::text OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'garantia']));

-- ORDERS
CREATE POLICY "Acesso a pedidos" ON public.orders FOR ALL 
USING (seller_id = auth.uid()::text OR check_user_role(ARRAY['gestor', 'admin', 'financeiro', 'producao']));

-- PRODUCTS (Leitura liberada, escrita para adm)
CREATE POLICY "Qualquer um vê produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Ajuste de estoque" ON public.products FOR UPDATE USING (check_user_role(ARRAY['gestor', 'admin', 'producao', 'financeiro']));

-- FINANCIAL
CREATE POLICY "Acesso financeiro" ON public.financial_entries FOR ALL 
USING (check_user_role(ARRAY['gestor', 'admin', 'financeiro']));

-- WARRANTIES
CREATE POLICY "Acesso a garantias" ON public.warranties FOR ALL 
USING (seller_id = auth.uid()::text OR check_user_role(ARRAY['gestor', 'admin', 'garantia']));

-- CATEGORIES
CREATE POLICY "Leitura de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Leitura de subcategorias" ON public.subcategories FOR SELECT USING (true);

-- CHAT
CREATE POLICY "Acesso ao chat" ON public.chat_messages FOR ALL 
USING (order_id IN (SELECT id FROM public.orders WHERE seller_id = auth.uid()::text OR check_user_role(ARRAY['gestor', 'admin'])));
