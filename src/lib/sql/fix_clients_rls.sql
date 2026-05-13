-- Melhoria nas políticas de RLS para a tabela public.clients
-- Permite que vendedores vejam clientes que eles cadastraram OU que possuem pedidos vinculados a eles.

-- 1. Removemos a política restritiva antiga
DROP POLICY IF EXISTS "Users can read own clients" ON public.clients;

-- 2. Criamos uma política mais abrangente para visualização (SELECT)
CREATE POLICY "Sellers can view own or linked clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Sou o dono
  OR 
  EXISTS ( -- Ou tenho um pedido com este cliente
    SELECT 1 FROM public.orders
    WHERE orders.client_id = clients.id
    AND orders.seller_id = auth.uid()
  )
  OR
  (auth.jwt() ->> 'email') IN ('ericasousa@gmail.com', 'juninho.caxto@gmail.com', 'edsoncalixto@gmail.com') -- Ou sou admin por email
  OR
  EXISTS ( -- Ou tenho role administrativa
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'gestor', 'super_admin')
  )
);

-- 3. Garantir que vendedores possam ATUALIZAR clientes que eles podem ver
-- (Isso permite corrigir dados de clientes vinculados por pedido)
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Sellers can update own or linked clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.client_id = clients.id
    AND orders.seller_id = auth.uid()
  )
);

-- 4. Inserção continua restrita ao próprio user_id (Garante integridade)
-- Já existe a política "Users can insert own clients" que usa WITH CHECK (user_id = auth.uid())
