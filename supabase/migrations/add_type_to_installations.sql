-- Adiciona a coluna type na tabela installations
ALTER TABLE public.installations 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'instalacao' CHECK (type IN ('instalacao', 'manutencao'));

-- Comentário para documentação
COMMENT ON COLUMN public.installations.type IS 'Define se o agendamento é uma instalação ou uma manutenção';
