import { supabase } from './supabase';
import type { ClientReward, ClientRanking, Order, QuoteItem } from '@/types/erp';
import { supabaseToOrder } from './orderServiceSupabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isKit = (item: QuoteItem) => {
    const productName = (item.product || '').toUpperCase().trim();
    // Qualquer produto que contenha "KIT" ou "SPRINTER" ou tenha sensorType é um kit
    if (productName.includes('KIT')) return true;
    if (productName.includes('SPRINTER')) return true;
    if (item.sensorType) return true;
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

        // Buscar pedidos aprovados
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
                // Pular se não for kit ou se já for um item de prêmio (não gera novos prêmios)
                if (!isKit(item) || item.isReward) return;

                const qty = item.quantity;
                const price = item.unitPrice;

                // Totalizador Geral
                totalKits += qty;
                
                // Tier 1: 5 kits (Qualquer Kit conta)
                tier1Count += qty;

                // Tier 2: 7 kits (Preço entre 1450 e 2000)
                if (price >= 1450 && price <= 2000) {
                    tier2Count += qty;
                }

                // Tier 3: 10 kits (Preço entre 1100 e 1400)
                if (price >= 1100 && price <= 1400) {
                    tier3Count += qty;
                }

                // Breakdown
                breakdownMap[item.product] = (breakdownMap[item.product] || 0) + qty;
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
            kitsConsumed: r.kits_consumed || 0,
            kitsAdjustment: r.kits_adjustment || 0,
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

export const redeemReward = async (rewardId: string, quantity: number = 1): Promise<boolean> => {
    try {
        // Buscar dados atuais para saber quantos kits consumir
        const { data: rewardData, error: fetchError } = await supabase
            .from('client_rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (fetchError || !rewardData) throw fetchError || new Error('Prêmio não encontrado');

        const totalToConsume = rewardData.kits_required * quantity;

        const { error } = await supabase
            .from('client_rewards')
            .update({
                reward_status: (rewardData.kits_completed - totalToConsume) >= rewardData.kits_required ? 'liberado' : 'resgatado',
                reward_redeemed_at: new Date().toISOString(),
                kits_consumed: (rewardData.kits_consumed || 0) + totalToConsume
            })
            .eq('id', rewardId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('[Rewards] Erro ao resgatar prêmio:', err.message);
        return false;
    }
};

export const cancelRedeemReward = async (rewardId: string, quantity: number = 1): Promise<boolean> => {
    try {
        const { data: rewardData, error: fetchError } = await supabase
            .from('client_rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (fetchError || !rewardData) throw fetchError || new Error('Prêmio não encontrado');

        // Só cancela se estiver no status 'resgatado' ou 'liberado' (em processo)
        if (rewardData.reward_status !== 'resgatado' && rewardData.reward_status !== 'liberado') return false;

        const kitsToRestore = rewardData.kits_required * quantity;

        const { error } = await supabase
            .from('client_rewards')
            .update({
                reward_status: 'liberado', 
                reward_redeemed_at: null,
                kits_consumed: Math.max(0, (rewardData.kits_consumed || 0) - kitsToRestore),
                updated_at: new Date().toISOString()
            })
            .eq('id', rewardId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('[Rewards] Erro ao cancelar resgate de prêmio:', err.message);
        return false;
    }
};

export const resetReward = async (rewardId: string, currentBalance: number): Promise<boolean> => {
    try {
        // Buscar dados atuais para saber o ajuste atual
        const { data: rewardData, error: fetchError } = await supabase
            .from('client_rewards')
            .select('kits_adjustment')
            .eq('id', rewardId)
            .single();

        if (fetchError || !rewardData) throw fetchError || new Error('Prêmio não encontrado');

        const currentAdjustment = rewardData.kits_adjustment || 0;
        const newAdjustment = currentAdjustment - currentBalance;

        const { error } = await supabase
            .from('client_rewards')
            .update({
                kits_adjustment: newAdjustment,
                kits_completed: 0,
                reward_status: 'pendente',
                updated_at: new Date().toISOString()
            })
            .eq('id', rewardId);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('[Rewards] Erro ao zerar premiação:', err.message);
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
            // Pegar todas as premiações deste tipo (caso existam duplicados)
            const matches = existingRewards.filter(r => r.rewardType === tier.type);
            let existing = matches[0];
            
            // Se houver mais de um, deletar os extras e manter o primeiro (mais antigo)
            if (matches.length > 1) {
                console.warn(`[Rewards] Duplicidade detectada para o cliente ${clientId} no tier ${tier.type}. Removendo extras...`);
                // Mantém o primeiro, deleta os outros do banco
                const extras = matches.slice(1);
                for (const extra of extras) {
                    await supabase.from('client_rewards').delete().eq('id', extra.id);
                }
            }

            // Lógica de Cálculo: (Vendas Reais + Ajuste Manual) - (Kits já Consumidos)
            const consumed = existing?.kitsConsumed || 0;
            const adjustment = existing?.kitsAdjustment || 0;
            const currentEffectiveKits = Math.max(0, (tier.current + adjustment) - consumed);
            const newStatus = currentEffectiveKits >= tier.required ? 'liberado' : 'pendente';

            if (existing) {
                // Atualiza o registro existente com o novo total efetivo
                if (existing.rewardStatus === 'resgatado' && currentEffectiveKits >= tier.required) {
                    await supabase
                        .from('client_rewards')
                        .update({
                            kits_completed: currentEffectiveKits,
                            reward_status: 'liberado',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                } else if (existing.rewardStatus !== 'resgatado') {
                    await supabase
                        .from('client_rewards')
                        .update({
                            kits_completed: currentEffectiveKits,
                            reward_status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                } else {
                    // Se for resgatado e não tem kits suficientes para novo resgate, só atualiza o saldo
                    await supabase
                        .from('client_rewards')
                        .update({
                            kits_completed: currentEffectiveKits,
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
                        kits_completed: currentEffectiveKits,
                        reward_status: newStatus
                    }]);
            }
        }
    } catch (err: any) {
        console.error('[Rewards] Erro ao atualizar premiações automaticamente:', err.message);
    }
};
