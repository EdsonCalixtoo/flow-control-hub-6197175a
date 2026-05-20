-- Criar tabela de controle de galvanização
CREATE TABLE IF NOT EXISTS public.galvanizacao_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    quantity_sent INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pendente', -- pendente, recebido_parcial, recebido_total
    sent_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.galvanizacao_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Gestores podem ver tudo" ON public.galvanizacao_logs
    FOR SELECT USING (true);

CREATE POLICY "Gestores podem inserir" ON public.galvanizacao_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Gestores podem atualizar" ON public.galvanizacao_logs
    FOR UPDATE USING (true);

CREATE POLICY "Gestores podem deletar" ON public.galvanizacao_logs
    FOR DELETE USING (true);

-- (Removido ALTER PUBLICATION pois o Supabase_realtime já está FOR ALL TABLES)
