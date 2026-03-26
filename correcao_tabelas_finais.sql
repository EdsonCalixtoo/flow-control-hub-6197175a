
-- SQL DE AJUSTE (SÃO PAULO)
-- Criando as tabelas que faltaram e estão causando o erro 404 no painel.

CREATE TABLE IF NOT EXISTS public.order_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    order_number TEXT,
    items JSONB,
    reason TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_errors (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    order_number TEXT,
    error_type TEXT,
    description TEXT,
    reported_by TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantindo que o seu usuário tenha o papel de GESTOR
UPDATE public.users SET role = 'gestor' WHERE email = 'juninho.caxto@gmail.com';
