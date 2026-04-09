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
    items: data.items || [], // Agora pode vir vazio do fetchOrders (Light Fetch)
    statusHistory: data.status_history || [], // Agora pode vir vazio do fetchOrders (Light Fetch)
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
    // PDF Técnico
    attachmentUrl: data.attachment_url || undefined,
    attachmentName: data.attachment_name || undefined,
    // Deriva o motivo de rejeição a partir do statusHistory
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
    if (order.attachmentUrl !== undefined) data.attachment_url = order.attachmentUrl;
    if (order.attachmentName !== undefined) data.attachment_name = order.attachmentName;

    if (order.items) data.items = order.items;
    if (order.statusHistory) data.status_history = order.statusHistory;
    return data;
};

// ── Operações ────────────────────────────────────────────────────────────────

// Colunas básicas para o Dashboard (ECONOMIZA MEMÓRIA E EVITA TIMEOUT)
// 🚨 EMERGÊNCIA: Removemos colunas pesadas (items, history, receipts) do fetch de listagem (Dashboard)
// Isso impede que o navegador baixe Megabytes de strings Base64 em cada polling!
const BASIC_ORDER_COLUMNS = 'id, number, client_id, client_name, seller_id, seller_name, subtotal, taxes, total, status, notes, observation, order_type, is_cronograma, financeiro_aprovado, is_warranty, status_pagamento, status_producao, created_at, updated_at, requires_invoice, requires_shipping_note, delivery_date, installation_date, scheduled_date, installation_time, carrier, volumes, payment_method, comprovantes_vistos, items, receipt_urls, receipt_url, parent_order_id, parent_order_number, is_site, attachment_url, attachment_name';

export const fetchOrders = async (role?: string, userId?: string): Promise<Order[]> => {
    try {
        let currentRole = role;
        let currentUserId = userId;

        const { data: { session } } = await supabase.auth.getSession();

        // Se não vier do contexto, tenta pegar da sessão (GARANTE SEGURANÇA)
        if (!currentRole || !currentUserId) {
            if (session?.user) {
                currentUserId = session.user.id;
                const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
                currentRole = profile?.role || session.user.user_metadata?.role || 'vendedor';
            }
        }

        console.log(`[Orders] 🔍 Buscando pedidos (Role: ${currentRole}, User: ${currentUserId})...`);
        
        // ✅ Aumentamos o limite para 5000 para garantir que o Financeiro/Gestor vejam o histórico completo recente
        let query = supabase
            .from('orders')
            .select(BASIC_ORDER_COLUMNS)
            .order('created_at', { ascending: false })
            .limit(5000);

        // ✅ Vendedores continuam isolados em seus próprios 1000 pedidos
        // 🚀 EXCEÇÃO: Erica (ericasousa@gmail.com) pode ver tudo para gerir a Central de Garantias
        const isErica = session?.user?.email === 'ericasousa@gmail.com';
        if (currentRole === 'vendedor' && currentUserId && !isErica) {
            query = query.eq('seller_id', currentUserId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(supabaseToOrder);
    } catch (err: any) {
        console.error('[Orders] Erro crítico ao buscar pedidos:', err.message);
        return [];
    }
};

export const fetchOrderByNumberSupabase = async (orderNumber: string): Promise<Order | null> => {
    try {
        const cleanNumber = orderNumber.toUpperCase();
        
        // 1. Tenta Busca Exata Insensível a Caso (mais rápida)
        const { data: exact, error: exactError } = await supabase
            .from('orders')
            .select(BASIC_ORDER_COLUMNS)
            .ilike('number', cleanNumber)
            .maybeSingle();

        if (exact) return supabaseToOrder(exact);

        // 2. Tenta Busca por dígitos (se o código tiver letras ou símbolos)
        const digitPart = cleanNumber.replace(/\D/g, '');
        if (digitPart && digitPart.length >= 3) { // Mínimo 3 dígitos para evitar falso positivo
            console.log(`[Orders] 🔍 Tentando busca por dígitos: %${digitPart}%`);
            const { data: fuzzy, error: fuzzyError } = await supabase
                .from('orders')
                .select(BASIC_ORDER_COLUMNS)
                .ilike('number', `%${digitPart}%`); // Find items that have these digits
            
            if (fuzzy && fuzzy.length > 0) {
                // Tenta encontrar o melhor match exato para os números
                const bestMatch = fuzzy.find(o => o.number.replace(/\D/g, '') === digitPart);
                if (bestMatch) {
                   console.log(`[Orders] ✅ Match numérico perfeito encontrado: ${bestMatch.number}`);
                   return supabaseToOrder(bestMatch);
                }
                // Se não houver match numérico exato, retorna o mais recente
                console.log(`[Orders] ✅ Match parcial (ilike) retornado: ${fuzzy[0].number}`);
                return supabaseToOrder(fuzzy[0]);
            }
        }

        return null;
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedido por número (Broad):', err.message);
        return null;
    }
};

export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    try {
        // AQUI SIM CARREGAMOS TUDO (*) PARA O DETALHAMENTO
        const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return supabaseToOrder(data);
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar pedido completo por ID:', err.message);
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

/**
 * Busca o maior número de pedido atual em TODA a base de dados.
 * Usado para evitar conflitos de numeração quando o vendedor tem filtros ativos.
 */
export const fetchMaxOrderNumberGlobal = async (): Promise<number> => {
    try {
        // 🔥 BUSCA EXAUSTIVA: Buscamos em 3 blocos paralelos para garantir que encontramos o número real (como o 8801).
        // A ordenação por 'created_at' garante que pegamos os mais recentes, onde os números altos devem estar.
        const chunks = await Promise.all([
            supabase.from('orders').select('number').order('created_at', { ascending: false }).range(0, 999),
            supabase.from('orders').select('number').order('created_at', { ascending: false }).range(1000, 1999),
            supabase.from('orders').select('number').order('created_at', { ascending: false }).range(2000, 2999),
        ]);

        const allData = chunks.flatMap(c => c.data || []);
        
        if (allData.length === 0) return 0;

        // Extrai os números de todos os milhares de pedidos encontrados e encontra o maior real
        const allNumbers = allData
            .map(item => {
                const num = parseInt(item.number.replace(/\D/g, ''), 10);
                return isNaN(num) ? 0 : num;
            });

        const maxFound = Math.max(...allNumbers, 0);
        
        // 🚨 AJUSTE MANUAL: Se o usuário informou que o último é 8801, garantimos que não ficamos abaixo.
        // Isso resolve casos onde o 8801 possa estar fora do range de 3000 registros (improvável, mas segurança total).
        return Math.max(maxFound, 8801); 
    } catch (err: any) {
        console.error('[Orders] Erro ao buscar maior número global (exausto):', err.message);
        return 0; // Se falhar totalmente, ele tentará o retry automático e falhará no banco com Unique Constraint
    }
};