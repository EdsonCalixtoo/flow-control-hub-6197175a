import { supabase } from './supabase';
import type { RewardSettings } from '@/types/erp';

// Default fallback settings if nothing is in the database
export const DEFAULT_REWARD_SETTINGS = {
    tier_1: { required_kits: 10, min_price: 0, max_price: 999999 },
    tier_2: { required_kits: 10, min_price: 1450, max_price: 2000 }
};

export const fetchRewardSettings = async (clientId?: string): Promise<RewardSettings['settings']> => {
    try {
        // Se um clientId foi passado, busca a configuração específica dele E a global ao mesmo tempo
        let query = supabase.from('reward_settings').select('*');
        
        if (clientId) {
            query = query.or(`client_id.eq.${clientId},client_id.is.null`);
        } else {
            query = query.is('client_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            return DEFAULT_REWARD_SETTINGS;
        }

        // Tenta achar a específica do cliente
        const clientSpecific = data.find(d => d.client_id === clientId);
        if (clientSpecific) {
            return clientSpecific.settings;
        }

        // Tenta achar a global
        const globalSettings = data.find(d => d.client_id === null);
        if (globalSettings) {
            return globalSettings.settings;
        }

        return DEFAULT_REWARD_SETTINGS;
    } catch (err: any) {
        console.error('[RewardSettings] Erro ao buscar configurações:', err.message);
        return DEFAULT_REWARD_SETTINGS;
    }
};

export const fetchRawRewardSettings = async (clientId: string | null): Promise<RewardSettings | null> => {
    try {
        const query = clientId 
            ? supabase.from('reward_settings').select('*').eq('client_id', clientId)
            : supabase.from('reward_settings').select('*').is('client_id', null);
            
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        
        return data as RewardSettings | null;
    } catch (err) {
        console.error('[RewardSettings] Erro ao buscar raw settings:', err);
        return null;
    }
}

export const saveRewardSettings = async (settings: RewardSettings['settings'], clientId: string | null = null): Promise<boolean> => {
    try {
        const existing = await fetchRawRewardSettings(clientId);

        if (existing) {
            const { error } = await supabase
                .from('reward_settings')
                .update({ settings, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('reward_settings')
                .insert([{ client_id: clientId, settings }]);
            if (error) throw error;
        }

        return true;
    } catch (err: any) {
        console.error('[RewardSettings] Erro ao salvar configurações:', err.message);
        return false;
    }
};

export const deleteClientRewardSettings = async (clientId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('reward_settings')
            .delete()
            .eq('client_id', clientId);
        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('[RewardSettings] Erro ao deletar configurações:', err.message);
        return false;
    }
};
