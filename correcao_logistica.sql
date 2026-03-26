
-- CORREÇÃO DE PERMISSÕES PARA LOGÍSTICA (SÃO PAULO)
-- Habilita acesso total para usuários autenticados nas tabelas de retiradas e leituras de barcode

-- 1. Políticas para DELIVERY_PICKUPS
DROP POLICY IF EXISTS "Acesso total retiradas" ON public.delivery_pickups;
CREATE POLICY "Acesso total retiradas" 
ON public.delivery_pickups 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Políticas para BARCODE_SCANS
DROP POLICY IF EXISTS "Acesso total leituras" ON public.barcode_scans;
CREATE POLICY "Acesso total leituras" 
ON public.barcode_scans 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Políticas para PRODUCTION_ERRORS (Garantir que todos possam relatar)
DROP POLICY IF EXISTS "Todos relatam erros" ON public.production_errors;
CREATE POLICY "Todos relatam erros" 
ON public.production_errors 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Políticas para ORDER_RETURNS
DROP POLICY IF EXISTS "Todos relatam devolucoes" ON public.order_returns;
CREATE POLICY "Todos relatam devolucoes" 
ON public.order_returns 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
