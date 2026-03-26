-- Adiciona campos de instalação na tabela de pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS installation_date DATE,
ADD COLUMN IF NOT EXISTS installation_time TIME,
ADD COLUMN IF NOT EXISTS installation_payment_type TEXT;

-- Cria a tabela de instalações para o calendário compartilhado e controle de conflitos
CREATE TABLE IF NOT EXISTS public.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_id UUID,
    client_name TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    payment_type TEXT CHECK (payment_type IN ('pago', 'pagar_na_hora')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, time) -- Garante que não existam dois agendamentos no mesmo horário
);

-- Habilita RLS na nova tabela
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para instalações (todos os autenticados podem ver e gerenciar)
CREATE POLICY "Qualquer usuario autenticado pode ver instalacoes" 
ON public.installations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Qualquer usuario autenticado pode inserir instalacoes" 
ON public.installations FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Qualquer usuario autenticado pode atualizar instalacoes" 
ON public.installations FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Qualquer usuario autenticado pode deletar instalacoes" 
ON public.installations FOR DELETE 
TO authenticated 
USING (true);
