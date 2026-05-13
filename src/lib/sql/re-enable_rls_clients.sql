-- 1. Garante que o RLS está habilitado na tabela de clientes
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Sellers can view own or linked clients" ON public.clients;
DROP POLICY IF EXISTS "Users can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Admin view all clients" ON public.clients;
DROP POLICY IF EXISTS "Sellers can update own or linked clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Clients SELECT Policy" ON public.clients;
DROP POLICY IF EXISTS "Clients UPDATE Policy" ON public.clients;
DROP POLICY IF EXISTS "Clients INSERT Policy" ON public.clients;
DROP POLICY IF EXISTS "Clients DELETE Policy" ON public.clients;

-- 3. Política de SELECT (Visualização)
-- Restringe vendedores APENAS ao que eles criaram (user_id = auth.uid())
-- Permite acesso total para administradores, gestores, financeiro e produção.
CREATE POLICY "Clients SELECT Policy"
ON public.clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text -- Sou o dono (vendedor que cadastrou)
  OR
  (auth.jwt() ->> 'email') IN ('ericasousa@gmail.com', 'juninho.caxto@gmail.com', 'edsoncalixto@gmail.com') -- Admin God Mode por email
  OR
  EXISTS ( -- Admin/Gestor/Financeiro/Produção pela tabela users
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
    AND users.role IN ('admin', 'gestor', 'super_admin', 'financeiro', 'producao', 'garantia')
  )
);

-- 4. Política de UPDATE (Atualização)
CREATE POLICY "Clients UPDATE Policy"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text -- Apenas o dono pode editar
  OR
  EXISTS ( -- Ou administradores
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
    AND users.role IN ('admin', 'gestor', 'super_admin')
  )
);

-- 5. Política de INSERT (Inserção)
CREATE POLICY "Clients INSERT Policy"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text IS NOT NULL -- Qualquer usuário autenticado pode criar
);

-- 6. Política de DELETE (Exclusão)
CREATE POLICY "Clients DELETE Policy"
ON public.clients
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text 
  OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
    AND users.role IN ('admin', 'gestor', 'super_admin')
  )
);
