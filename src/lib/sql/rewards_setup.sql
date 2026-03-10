-- Create client_rewards table
CREATE TABLE IF NOT EXISTS public.client_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL, -- 'tier_1', 'tier_2', 'tier_3'
    kits_required INTEGER NOT NULL,
    kits_completed INTEGER NOT NULL DEFAULT 0,
    reward_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'liberado', 'resgatado'
    reward_redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_rewards_client_id ON public.client_rewards(client_id);

-- Ranking suggestion (as a view or just handled in app logic)
-- GOLD: 20 kits
-- SILVER: 10 kits
-- BRONZE: 5 kits
