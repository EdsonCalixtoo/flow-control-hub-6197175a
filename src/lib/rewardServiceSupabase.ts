import { supabase } from './supabase';
import type { ClientReward, ClientRanking, Order, QuoteItem } from '@/types/erp';
import { supabaseToOrder } from './orderServiceSupabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isKit = (item: QuoteItem) => {
    const productName = (item.product || '').toUpperCase();
    // KITS usually have sensorType set or "KIT" in the name
    if (item.sensorType) return true;
    if (productName.includes('KIT')) return true;
    return false;
};

// ── Operações ────────────────────────────────────────────────────────────────

export const calculateClientRanking = async (clientId: string): Promise<ClientRanking> => {
    try {
        // Statuses that represent a confirmed sale
        const confirmedStatuses = [
            'aprovado_financeiro',
            'aguardando_producao',
            'em_producao',
            'producao_finalizada',
            'produto_liberado',
            'retirado_entregador'
        ];

        // Buscar pedidos aprovados ou em estágios avançados (que implicam aprovação financeira)
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('client_id', clientId)
            .in('status', confirmedStatuses);

        if (error) throw error;

        const orders = (data || []).map(supabaseToOrder);

        let totalKits = 0;
        let tier1Count = 0;
        let tier2Count = 0;
        let tier3Count = 0;
        const breakdownMap: Record<string, number> = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                if (!isKit(item)) return;

                const qty = item.quantity;
                const price = item.unitPrice;

                totalKits += qty;
                tier1Count += qty;

                // Breakdown
                breakdownMap[item.product] = (breakdownMap[item.product] || 0) + qty;

                if (price >= 1550 && price <= 1650) {
                    tier2Count += qty;
                }
                if (price >= 1150 && price <= 1350) {
                    tier3Count += qty;
                }
            });
        });

        const breakdown = Object.entries(breakdownMap).map(([product, quantity]) => ({
            product,
            quantity
        }));

        let ranking: 'Bronze' | 'Prata' | 'Ouro' | 'Nenhum' = 'Nenhum';
        if (totalKits >= 20) ranking = 'Ouro';
        else if (totalKits >= 10) ranking = 'Prata';
        else if (totalKits >= 5) ranking = 'Bronze';

        return { totalKits, tier1Count, tier2Count, tier3Count, ranking, breakdown };
    } catch (err: any) {
        console.error('[Rewards] Erro ao calcular ranking:', err.message);
        return { totalKits: 0, tier1Count: 0, tier2Count: 0, tier3Count: 0, ranking: 'Nenhum', breakdown: [] };
    }
};

export const fetchClientRewards = async (clientId: string): Promise<ClientReward[]> => {
    try {
        const { data, error } = await supabase
            .from('client_rewards')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(r => ({
            id: r.id,
            clientId: r.client_id,
            rewardType: r.reward_type,
            kitsRequired: r.kits_required,
            kitsCompleted: r.kits_completed,
            rewardStatus: r.reward_status,
            rewardRedeemedAt: r.reward_redeemed_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    } catch (err: any) {
        console.error('[Rewards] Erro ao buscar premiações:', err.message);
        return [];
    }
};

export const redeemReward = async (rewardId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('client_rewards')
            .update({
                reward_status: 'resgatado',
                reward_redeemed_at: new Date().toISOString()
            })
            .eq('id', rewardId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('[Rewards] Erro ao resgatar prêmio:', err.message);
        return false;
    }
};

export const updateClientRewardsAuto = async (clientId: string): Promise<void> => {
    try {
        const ranking = await calculateClientRanking(clientId);
        const existingRewards = await fetchClientRewards(clientId);

        const tiers = [
            { type: 'tier_1', required: 5, current: ranking.tier1Count },
            { type: 'tier_2', required: 7, current: ranking.tier2Count },
            { type: 'tier_3', required: 10, current: ranking.tier3Count },
        ];

        for (const tier of tiers) {
            const existing = existingRewards.find(r => r.rewardType === tier.type);

            const newStatus = tier.current >= tier.required ? 'liberado' : 'pendente';

            if (existing) {
                // Só atualizamos se o status não for 'resgatado'
                if (existing.rewardStatus !== 'resgatado') {
                    await supabase
                        .from('client_rewards')
                        .update({
                            kits_completed: tier.current,
                            reward_status: tier.current >= tier.required ? 'liberado' : 'pendente',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                } else if (existing.kitsCompleted !== tier.current) {
                    // Mesmo se já resgatado, podemos querer atualizar os kits completados para mostrar o progresso atual
                    await supabase
                        .from('client_rewards')
                        .update({
                            kits_completed: tier.current,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                }
            } else {
                // Criar nova premiação
                await supabase
                    .from('client_rewards')
                    .insert([{
                        client_id: clientId,
                        reward_type: tier.type,
                        kits_required: tier.required,
                        kits_completed: tier.current,
                        reward_status: newStatus
                    }]);
            }
        }
    } catch (err: any) {
        console.error('[Rewards] Erro ao atualizar premiações automaticamente:', err.message);
    }
};
