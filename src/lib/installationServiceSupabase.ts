import { supabase } from './supabase';

export interface InstallationAppointment {
    id: string;
    order_id: string;
    seller_id: string;
    client_name: string;
    date: string;
    time: string;
    payment_type: 'pago' | 'pagar_na_hora';
    type?: 'instalacao' | 'manutencao';
    created_at?: string;
}

export const fetchInstallations = async (date?: string): Promise<InstallationAppointment[]> => {
    try {
        let query = supabase.from('installations').select('*');
        if (date) {
            query = query.eq('date', date);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err: any) {
        console.error('[Installations] Erro ao buscar instalações:', err.message);
        return [];
    }
};

export const checkInstallationConflict = async (date: string, time: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('installations')
            .select('id')
            .eq('date', date)
            .eq('time', time)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (err: any) {
        console.error('[Installations] Erro ao verificar conflito:', err.message);
        return false;
    }
};

export const saveInstallation = async (appointment: Omit<InstallationAppointment, 'id'>): Promise<InstallationAppointment | null> => {
    try {
        // 🔥 CORREÇÃO: Geramos o UUID no client-side para evitar erro de 'null id' no Supabase
        const payload = {
            ...appointment,
            id: crypto.randomUUID()
        };

        console.log('[Installations] Salvando agendamento:', payload);

        const { data, error } = await supabase
            .from('installations')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err: any) {
        console.error('[Installations] Erro ao salvar instalação:', err.message);
        throw err;
    }
};

export const deleteInstallationByOrder = async (orderId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('installations')
            .delete()
            .eq('order_id', orderId);

        if (error) throw error;
    } catch (err: any) {
        console.error('[Installations] Erro ao deletar instalação:', err.message);
    }
};
