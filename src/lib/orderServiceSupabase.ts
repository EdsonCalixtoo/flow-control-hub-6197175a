import { supabase } from './supabase';
import type { Order, OrderStatus } from '@/types/erp';

// ── Helpers ──────────────────────────────────────────────────────────────────
export const supabaseToOrder = (data: any): Order => ({
    id: data.id,
    number: data.number,
    clientId: data.client_id,
    clientName: data.client_name,
    sellerId: data.seller_id,
    sellerName: data.seller_name,
    subtotal: Number(data.subtotal),
    taxes: Number(data.taxes),
    total: Number(data.total),
    status: data.status as OrderStatus,
    notes: data.notes || '',
    observation: data.observation || '',
    deliveryDate: data.delivery_date || undefined,
    orderType: data.order_type || 'entrega',
    receiptUrl: data.receipt_url || undefined,
    receiptUrls: data.receipt_urls || (data.receipt_url ? [data.receipt_url] : []),
    items: data.items || [],
    statusHistory: data.status_history || [],
    installationDate: data.installation_date || undefined,
    installationTime: data.installation_time || undefined,
    installationPaymentType: data.installation_payment_type || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    carrier: data.carrier || undefined,
    isCronograma: data.is_cronograma || false,
    financeiroAprovado: data.financeiro_aprovado || false,
    statusPagamento: data.status_pagamento || 'pendente',
    paymentStatus: data.status_pagamento || 'pendente',
    statusProducao: data.status_producao || '',
    scheduledDate: data.scheduled_date || undefined,
    volumes: data.volumes || 1,
    requiresInvoice: data.requires_invoice || false,
});

export const orderToSupabase = (order: Partial<Order>) => {
    const data: any = {};
    if (order.id) data.id = order.id;
    if (order.number) data.number = order.number;
    if (order.clientId) data.client_id = order.clientId;
    if (order.clientName) data.client_name = order.clientName;
    if (order.sellerId) data.seller_id = order.sellerId;
    if (order.sellerName) data.seller_name = order.sellerName;
    if (order.subtotal !== undefined) data.subtotal = order.subtotal;
    if (order.taxes !== undefined) data.taxes = order.taxes;
    if (order.total !== undefined) data.total = order.total;
    if (order.status) data.status = order.status;
    if (order.notes !== undefined) data.notes = order.notes;
    if (order.observation !== undefined) data.observation = order.observation;
    if (order.deliveryDate !== undefined) data.delivery_date = order.deliveryDate;
    if (order.orderType) data.order_type = order.orderType;
    if (order.receiptUrl !== undefined) data.receipt_url = order.receiptUrl;
    if (order.receiptUrls !== undefined) data.receipt_urls = order.receiptUrls;
    if (order.installationDate !== undefined) data.installation_date = order.installationDate;
    if (order.installationTime !== undefined) data.installation_time = order.installationTime;
    if (order.installationPaymentType !== undefined) data.installation_payment_type = order.installationPaymentType;
    if (order.carrier !== undefined) data.carrier = order.carrier;
    if (order.isCronograma !== undefined) data.is_cronograma = order.isCronograma;
    if (order.financeiroAprovado !== undefined) data.financeiro_aprovado = order.financeiroAprovado;
    if (order.statusPagamento !== undefined) data.status_pagamento = order.statusPagamento;
    if (order.paymentStatus !== undefined) data.status_pagamento = order.paymentStatus;
    if (order.statusProducao !== undefined) data.status_producao = order.statusProducao;
    if (order.scheduledDate !== undefined) data.scheduled_date = order.scheduledDate;
    if (order.volumes !== undefined) data.volumes = order.volumes;
    if (order.requiresInvoice !== undefined) data.requires_invoice = order.requiresInvoice;

    if (order.items) data.items = order.items;
    if (order.statusHistory) data.status_history = order.statusHistory;
    return data;
};

// ── Operações ────────────────────────────────────────────────────────────────

export const fetchOrders = async (role?: string, userId?: string): Promise<Order[]> => {
    try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

        // Vendedores só veem seus próprios pedidos
        if (role === 'vendedor' && userId) {
            query = query.eq('seller_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(supabaseToOrder);
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedidos:', err.message);
        return [];
    }
};

export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedido por ID:', err.message);
        return null;
    }
};

export const createOrderSupabase = async (order: Order): Promise<Order | null> => {
    try {
        const payload = orderToSupabase(order);
        const { data, error } = await supabase.from('orders').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao criar pedido:', err.message);
        throw err;
    }
};

export const updateOrderSupabase = async (orderId: string, fields: Partial<Order>): Promise<Order | null> => {
    try {
        const payload = orderToSupabase(fields);
        const { data, error } = await supabase.from('orders').update(payload).eq('id', orderId).select().single();
        if (error) throw error;
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao atualizar pedido:', err.message);
        throw err;
    }
};

export const deleteOrderSupabase = async (orderId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if (error) throw error;
    } catch (err: any) {
        console.error('[Orders] Erro ao deletar pedido:', err.message);
        throw err;
    }
};
