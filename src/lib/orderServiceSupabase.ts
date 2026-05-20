import { apiFetch } from './api';
import type { Order, OrderStatus } from '@/types/erp';

// ── Token Helper ─────────────────────────────────────────────────────────────
const getLoggedUserInfo = () => {
    try {
        const token = localStorage.getItem('flow-control-token');
        if (!token) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);
        return {
            userId: decoded.sub,
            email: decoded.email,
            role: decoded.role
        };
    } catch (e) {
        console.error('Erro ao decodificar token:', e);
        return null;
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export const supabaseToOrder = (data: any): Order => ({
    id: data.id,
    number: data.number,
    clientId: data.client_id,
    clientName: data.client_name,
    sellerId: data.seller_id,
    sellerName: data.seller_name,
    subtotal: Number(data.subtotal || 0),
    taxes: Number(data.taxes || 0),
    total: Number(data.total || 0),
    status: (data.status || 'rascunho') as OrderStatus,
    notes: data.notes || '',
    observation: data.observation || '',
    deliveryDate: data.delivery_date || undefined,
    orderType: data.order_type || 'entrega',
    receiptUrl: data.receipt_url || undefined,
    receiptUrls: Array.from(new Set([
        ...(data.receipt_urls || []),
        ...(data.receipt_url ? [data.receipt_url] : [])
    ])),
    items: data.items || [],
    statusHistory: data.status_history || [],
    installationDate: data.installation_date || undefined,
    installationTime: data.installation_time || undefined,
    installationPaymentType: data.installation_payment_type || undefined,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    carrier: data.carrier || undefined,
    isCronograma: data.is_cronograma || false,
    financeiroAprovado: data.financeiro_aprovado || false,
    isWarranty: data.is_warranty || false,
    statusPagamento: data.status_pagamento || 'pendente',
    paymentStatus: data.status_pagamento || 'pendente',
    statusProducao: data.status_producao || '',
    scheduledDate: data.scheduled_date || undefined,
    volumes: data.volumes || 1,
    requiresInvoice: data.requires_invoice || false,
    requiresShippingNote: data.requires_shipping_note || false,
    comprovantesVistos: data.comprovantes_vistos || 0,
    parentOrderId: data.parent_order_id || undefined,
    parentOrderNumber: data.parent_order_number || undefined,
    isSite: data.is_site || false,
    isInternational: data.is_international || false,
    attachmentUrl: data.attachment_url || undefined,
    attachmentName: data.attachment_name || undefined,
    rejectionReason: (() => {
        const history: any[] = data.status_history || [];
        const entry = [...history].reverse().find((e: any) => e.note?.startsWith('Rejeitado:'));
        return entry ? entry.note.replace(/^Rejeitado:\s*/, '') : undefined;
    })(),
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
    if (order.isWarranty !== undefined) data.is_warranty = order.isWarranty;
    if (order.statusPagamento !== undefined) data.status_pagamento = order.statusPagamento;
    if (order.paymentStatus !== undefined) data.status_pagamento = order.paymentStatus;
    if (order.statusProducao !== undefined) data.status_producao = order.statusProducao;
    if (order.scheduledDate !== undefined) data.scheduled_date = order.scheduledDate;
    if (order.volumes !== undefined) data.volumes = order.volumes;
    if (order.requiresInvoice !== undefined) data.requires_invoice = order.requiresInvoice;
    if (order.requiresShippingNote !== undefined) data.requires_shipping_note = order.requiresShippingNote;
    if (order.comprovantesVistos !== undefined) data.comprovantes_vistos = order.comprovantesVistos;
    if (order.parentOrderId !== undefined) data.parent_order_id = order.parentOrderId;
    if (order.parentOrderNumber !== undefined) data.parent_order_number = order.parentOrderNumber;
    if (order.isSite !== undefined) data.is_site = order.isSite;
    if (order.isInternational !== undefined) data.is_international = order.isInternational;
    if (order.attachmentUrl !== undefined) data.attachment_url = order.attachmentUrl;
    if (order.attachmentName !== undefined) data.attachment_name = order.attachmentName;
    if (order.items) data.items = order.items;
    if (order.statusHistory) data.status_history = order.statusHistory;
    data.updated_at = new Date().toISOString();
    return data;
};

export const fetchOrders = async (role?: string, userId?: string): Promise<Order[]> => {
    try {
        console.log('[Orders] 📝 Buscando pedidos via API local...');
        let currentRole = role;
        let currentUserId = userId;
        let userEmail = '';

        const loggedUser = getLoggedUserInfo();
        if (loggedUser) {
            if (!currentUserId) currentUserId = loggedUser.userId;
            if (!currentRole) currentRole = loggedUser.role;
            userEmail = loggedUser.email;
        }

        const isExempt = userEmail === 'ericasousa@gmail.com' || userEmail === 'juninho.caxto@gmail.com';
        
        let path = '/orders';
        if (currentRole === 'vendedor' && currentUserId && !isExempt) {
            path = `/orders?seller_id=${currentUserId}`;
        }
        
        const data = await apiFetch(path);
        const orders = (data || []).map(supabaseToOrder);
        console.log('[Orders] ✅ Pedidos carregados:', orders.length);
        return orders;
    } catch (err: any) {
        console.error('[Orders] Erro crítico ao buscar pedidos:', err.message);
        return [];
    }
};

export const fetchOrderByNumberSupabase = async (orderNumber: string): Promise<Order | null> => {
    try {
        console.log('[Orders] 🔍 Buscando pedido por número local:', orderNumber);
        const cleanNumber = orderNumber.toUpperCase();
        const data = await apiFetch(`/orders?number=${encodeURIComponent(cleanNumber)}`);
        
        if (data && data.length > 0) {
            return supabaseToOrder(data[0]);
        }
        
        const digitPart = cleanNumber.replace(/\D/g, '');
        if (digitPart && digitPart.length >= 3) {
            const fuzzyData = await apiFetch(`/orders?number=${encodeURIComponent(digitPart)}`);
            if (fuzzyData && fuzzyData.length > 0) {
                const bestMatch = fuzzyData.find((o: any) => o.number.replace(/\D/g, '') === digitPart);
                return supabaseToOrder(bestMatch || fuzzyData[0]);
            }
        }
        return null;
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedido por número:', err.message);
        return null;
    }
};

export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    try {
        console.log('[Orders] 🔍 Buscando pedido por ID local:', orderId);
        const data = await apiFetch(`/orders/${orderId}`);
        return data ? supabaseToOrder(data) : null;
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedido por ID:', err.message);
        return null;
    }
};

export const createOrderSupabase = async (order: Order): Promise<Order | null> => {
    try {
        console.log('[Orders] 📝 Criando novo pedido local:', order.number);
        const payload = orderToSupabase(order);
        const data = await apiFetch('/orders', {
            method: 'POST',
            body: payload,
        });
        
        if (!data) {
            throw new Error('A API não retornou o pedido criado.');
        }
        
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao criar pedido:', err.message);
        throw err;
    }
};

export const updateOrderSupabase = async (orderId: string, fields: Partial<Order>): Promise<Order | null> => {
    try {
        console.log('[Orders] 📝 Atualizando pedido local:', orderId);
        const payload = orderToSupabase(fields);
        const data = await apiFetch(`/orders/${orderId}`, {
            method: 'PUT',
            body: payload,
        });
        
        if (!data) {
            throw new Error('A API não retornou o pedido atualizado.');
        }
        
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao atualizar pedido:', err.message);
        throw err;
    }
};

export const deleteOrderSupabase = async (orderId: string): Promise<void> => {
    try {
        console.log('[Orders] 🗑️ Deletando pedido local:', orderId);
        await apiFetch(`/orders/${orderId}`, {
            method: 'DELETE',
        });
        console.log('[Orders] ✅ Pedido deletado:', orderId);
    } catch (err: any) {
        console.error('[Orders] Erro ao deletar pedido:', err.message);
        throw err;
    }
};

export const fetchMaxOrderNumberGlobal = async (): Promise<number> => {
    try {
        console.log('[Orders] 🔍 Buscando maior número global via API local...');
        const res = await apiFetch('/orders/max-number');
        return res?.max || 8801;
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar maior número global:', err.message);
        return 8801;
    }
};

export const fetchOrdersByParentId = async (parentId: string): Promise<Order[]> => {
    try {
        console.log('[Orders] 🔍 Buscando pedidos filhos local por parentId:', parentId);
        const data = await apiFetch(`/orders?parent_order_id=${parentId}`);
        return (data || []).map(supabaseToOrder);
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedidos filhos:', err.message);
        return [];
    }
};

/**
 * Busca histórico COMPLETO de um cliente por ID, Nome ou CPF/CNPJ
 * Ignora filtros de vendedor para garantir que o histórico da empresa seja visível
 */
export const fetchOrdersByClientInfo = async (clientId: string, clientName: string, cpfCnpj?: string): Promise<Order[]> => {
    try {
        console.log('[Orders] 🔍 Buscando histórico de pedidos do cliente local:', clientId);
        // Primeiro tenta buscar por client_id
        let data = await apiFetch(`/orders?client_id=${clientId}`);
        
        // Se não encontrar nada ou for vazio, busca todos e filtra no cliente por nome/CPF
        if (!data || data.length === 0) {
            const allOrders = await apiFetch('/orders');
            const cleanCpf = cpfCnpj ? cpfCnpj.replace(/\D/g, '') : '';
            
            data = (allOrders || []).filter((o: any) => {
                const nameMatch = clientName && o.client_name?.toLowerCase().includes(clientName.toLowerCase().trim());
                const notesMatch = cleanCpf && o.notes?.includes(cleanCpf);
                const obsMatch = cleanCpf && o.observation?.includes(cleanCpf);
                return nameMatch || notesMatch || obsMatch;
            });
        }
        
        return (data || []).map(supabaseToOrder);
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar histórico por info do cliente:', err.message);
        return [];
    }
};