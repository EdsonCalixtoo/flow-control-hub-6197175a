
-- Tabela de Logs do Sistema
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT, -- 'order', 'client', 'financial', etc.
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Realtime para Logs (opcional, mas bom para monitoramento em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- Políticas de Segurança (Somente admins podem ver logs)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" 
ON public.system_logs 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Authenticated users can insert logs" 
ON public.system_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
