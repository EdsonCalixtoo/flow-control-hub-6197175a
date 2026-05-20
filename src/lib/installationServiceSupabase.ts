import { apiFetch } from './api';

export interface InstallationAppointment {
    id: string;
    order_id: string;
    seller_id: string;
    client_name: string;
    product_name?: string; // Produto específico agendado
    date: string;
    time: string;
    payment_type: 'pago' | 'pagar_na_hora';
    type?: 'instalacao' | 'manutencao';
    created_at?: string;
}

export const fetchInstallations = async (date?: string): Promise<InstallationAppointment[]> => {
    try {
        console.log('[Installations] 📝 Buscando instalações locais...');
        let path = '/gestor/installations';
        if (date) {
            path += `?date=${encodeURIComponent(date)}`;
        }
        const data = await apiFetch(path);
        return data || [];
    } catch (err: any) {
        console.error('[Installations] Erro ao buscar instalações:', err.message);
        return [];
    }
};

export const checkInstallationConflict = async (date: string, time: string, excludeOrderId?: string): Promise<boolean> => {
    try {
        console.log('[Installations] 🔍 Verificando conflito local...');
        let path = `/gestor/installations/conflict?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
        if (excludeOrderId) {
            path += `&exclude_order_id=${encodeURIComponent(excludeOrderId)}`;
        }
        const data = await apiFetch(path);
        return !!data;
    } catch (err: any) {
        console.error('[Installations] Erro ao verificar conflito:', err.message);
        return false;
    }
};

export const saveInstallation = async (appointment: Omit<InstallationAppointment, 'id'>): Promise<InstallationAppointment | null> => {
    try {
        const payload = {
            ...appointment,
            id: crypto.randomUUID()
        };

        console.log('[Installations] 📝 Salvando agendamento local:', payload);
        const data = await apiFetch('/gestor/installations', {
            method: 'POST',
            body: payload,
        });

        return data;
    } catch (err: any) {
        console.error('[Installations] Erro ao salvar instalação:', err.message);
        throw err;
    }
};

export const deleteInstallationByOrder = async (orderId: string): Promise<void> => {
    try {
        console.log('[Installations] 🗑️ Deletando agendamento por pedido local:', orderId);
        await apiFetch(`/gestor/installations/order/${orderId}`, {
            method: 'DELETE',
        });
    } catch (err: any) {
        console.error('[Installations] Erro ao deletar instalação:', err.message);
    }
};
