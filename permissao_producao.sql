
-- PERMISSÕES DE ATUALIZAÇÃO PARA PRODUÇÃO (V2 — Com cast de tipo)

DROP POLICY IF EXISTS "producao_update_orders" ON public.orders;
DROP POLICY IF EXISTS "vendedor_update_own_orders" ON public.orders;

-- Política única: permite atualizar se for dono do pedido OU tiver cargo especial
CREATE POLICY "update_orders_by_role"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  seller_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('producao', 'financeiro', 'gestor', 'admin')
  )
)
WITH CHECK (
  seller_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('producao', 'financeiro', 'gestor', 'admin')
  )
);
