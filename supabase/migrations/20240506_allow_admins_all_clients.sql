-- Adiciona política para permitir que Juninho e Edson vejam todos os clientes via RLS
-- Isso é necessário porque o RLS na tabela public.clients restringe o SELECT ao user_id

-- 1. Primeiro removemos a política se já existir para evitar erros
DROP POLICY IF EXISTS "Admins by email can read all clients" ON public.clients;

-- 2. Criamos a nova política
CREATE POLICY "Admins by email can read all clients"
ON public.clients
FOR SELECT
USING (
  (auth.jwt() ->> 'email') IN ('juninho.caxto@gmail.com', 'edsoncalixto@gmail.com')
);

-- 3. Também permitimos para quem tem role de admin ou gestor na tabela users
DROP POLICY IF EXISTS "Admins and Gestores can read all clients" ON public.clients;
CREATE POLICY "Admins and Gestores can read all clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'gestor')
  )
);
