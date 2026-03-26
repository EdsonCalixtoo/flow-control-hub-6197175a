
-- PERMISSÕES DA TABELA WARRANTIES (GARANTIAS)

-- 1. Permitir que vendedores CRIEM garantias
DROP POLICY IF EXISTS "vendedor_insert_warranties" ON public.warranties;
CREATE POLICY "vendedor_insert_warranties"
ON public.warranties
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('vendedor', 'gestor', 'admin', 'garantia')
  )
);

-- 2. Permitir que todos os autenticados LEIAM garantias
DROP POLICY IF EXISTS "authenticated_select_warranties" ON public.warranties;
CREATE POLICY "authenticated_select_warranties"
ON public.warranties
FOR SELECT
TO authenticated
USING (true);

-- 3. Permitir que vendedores e gestores ATUALIZEM garantias
DROP POLICY IF EXISTS "authenticated_update_warranties" ON public.warranties;
CREATE POLICY "authenticated_update_warranties"
ON public.warranties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('vendedor', 'gestor', 'financeiro', 'producao', 'admin', 'garantia')
  )
);

-- 4. Garantir que o ID é gerado automaticamente
ALTER TABLE public.warranties ALTER COLUMN id SET DEFAULT gen_random_uuid();
