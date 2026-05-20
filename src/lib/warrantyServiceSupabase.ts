import { apiFetch } from './api';
import type { Warranty } from '@/types/erp';

const supabaseToWarranty = (data: any): Warranty => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientId: data.client_id,
    clientName: data.client_name,
    sellerId: data.seller_id,
    sellerName: data.seller_name,
    product: data.product,
    description: data.description,
    status: data.status,
    receiptUrls: data.receipt_urls || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    resolution: data.resolution || undefined,
    carrier: data.carrier || undefined,
    history: data.history || [],
});

const warrantyToSupabase = (w: Partial<Warranty>) => {
    const data: any = {};
    if (w.orderId) data.order_id = w.orderId;
    if (w.orderNumber) data.order_number = w.orderNumber;
    if (w.clientId) data.client_id = w.clientId;
    if (w.clientName) data.client_name = w.clientName;
    if (w.sellerId) data.seller_id = w.sellerId;
    if (w.sellerName) data.seller_name = w.sellerName;
    if (w.product) data.product = w.product;
    if (w.description) data.description = w.description;
    if (w.status) data.status = w.status;
    if (w.receiptUrls) data.receipt_urls = w.receiptUrls;
    if (w.resolution) data.resolution = w.resolution;
    if (w.carrier) data.carrier = w.carrier;
    if (w.history) data.history = w.history;
    return data;
};

export const fetchWarranties = async (): Promise<Warranty[]> => {
    try {
        console.log('[Warranties] 📝 Buscando garantias locais...');
        const data = await apiFetch('/gestor/warranties');
        return (data || []).map(supabaseToWarranty);
    } catch (err: any) {
        console.error('[Warranties] Erro ao buscar garantias:', err.message);
        return [];
    }
};

export const createWarranty = async (warranty: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warranty> => {
    try {
        const payload = { 
            id: crypto.randomUUID(), 
            ...warrantyToSupabase(warranty) 
        };
        console.log('[Warranties] 📝 Criando garantia local:', payload);
        const data = await apiFetch('/gestor/warranties', {
            method: 'POST',
            body: payload,
        });
        if (!data) {
            throw new Error('A API não retornou a garantia criada.');
        }
        return supabaseToWarranty(data);
    } catch (err: any) {
        console.error('[Warranties] Erro ao criar garantia:', err.message);
        throw err;
    }
};

export const updateWarranty = async (id: string, updates: Partial<Warranty>): Promise<Warranty> => {
    try {
        const payload = warrantyToSupabase(updates);
        console.log('[Warranties] 📝 Atualizando garantia local:', id);
        const data = await apiFetch(`/gestor/warranties/${id}`, {
            method: 'PUT',
            body: payload,
        });
        if (!data) {
            throw new Error('A API não retornou a garantia atualizada.');
        }
        return supabaseToWarranty(data);
    } catch (err: any) {
        console.error('[Warranties] Erro ao atualizar garantia:', err.message);
        throw err;
    }
};

export const fetchWarrantyByNumberSupabase = async (num: string): Promise<Warranty | null> => {
    try {
        console.log('[Warranties] 🔍 Buscando garantia por número local:', num);
        const data = await fetchWarranties();
        if (!data || data.length === 0) return null;
        
        const fuzzyMatch = data.find(w => w.orderNumber?.toLowerCase().includes(num.toLowerCase().trim()));
        return fuzzyMatch || null;
    } catch (err: any) {
        console.error('[Warranties] Erro ao buscar garantia por número:', err.message);
        return null;
    }
};
