/**
 * supabaseService.ts
 * Camada de dados: conecta o frontend ao Supabase.
 * Cada função mapeia snake_case do banco -> camelCase do frontend.
 */
import { supabase } from './supabase';
import type {
    Order, Client, Product, FinancialEntry, QuoteItem,
    StatusHistoryEntry, OrderStatus, ChatMessage, OrderReturn, ProductionError
} from '@/types/erp';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function mapItem(i: Record<string, unknown>): QuoteItem {
    return {
        id: i.id as string,
        product: i.product_name as string,
        description: (i.product_description as string) ?? '',
        quantity: i.quantity as number,
        unitPrice: i.unit_price as number,
        discount: (i.discount as number) ?? 0,
        discountType: (i.discount_type as 'percent' | 'value') ?? 'percent',
        total: i.total as number,
    };
}

function mapHistory(h: Record<string, unknown>): StatusHistoryEntry {
    return {
        status: h.status as OrderStatus,
        timestamp: h.created_at as string,
        user: h.changed_by as string,
        note: h.note as string | undefined,
    };
}

function mapOrder(
    o: Record<string, unknown>,
    items: QuoteItem[],
    history: StatusHistoryEntry[]
): Order {
    return {
        id: o.id as string,
        number: o.number as string,
        clientId: o.client_id as string,
        clientName: o.client_name as string,
        sellerId: o.seller_id as string,
        sellerName: o.seller_name as string,
        items,
        subtotal: Number(o.subtotal) ?? 0,
        taxes: Number(o.taxes) ?? 0,
        total: Number(o.total) ?? 0,
        status: o.status as OrderStatus,
        notes: (o.notes as string) ?? '',
        observation: (o.observation as string) ?? '',
        paymentMethod: o.payment_method as string | undefined,
        paymentStatus: o.payment_status as Order['paymentStatus'],
        installments: o.installments as number | undefined,
        rejectionReason: o.rejection_reason as string | undefined,
        receiptUrl: o.receipt_url as string | undefined,
        qrCode: o.qr_code as string | undefined,
        productionStartedAt: o.production_started_at as string | undefined,
        productionFinishedAt: o.production_finished_at as string | undefined,
        releasedAt: o.released_at as string | undefined,
        releasedBy: o.released_by as string | undefined,
        deliveryDate: o.delivery_date as string | undefined,
        scheduledDate: o.scheduled_date as string | undefined,
        orderType: o.order_type as Order['orderType'],
        productionStatus: o.production_status as Order['productionStatus'],
        createdAt: o.created_at as string,
        updatedAt: o.updated_at as string,
        statusHistory: history,
    };
}

function mapClient(c: Record<string, unknown>): Client {
    return {
        id: c.id as string,
        name: c.name as string,
        cpfCnpj: c.cpf_cnpj as string,
        phone: (c.phone as string) ?? '',
        email: (c.email as string) ?? '',
        address: (c.address as string) ?? '',
        bairro: (c.bairro as string) ?? '',
        city: (c.city as string) ?? '',
        state: (c.state as string) ?? '',
        cep: (c.cep as string) ?? '',
        notes: (c.notes as string) ?? '',
        consignado: (c.consignado as boolean) ?? false,
        createdAt: c.created_at as string,
    };
}

function mapProduct(p: Record<string, unknown>): Product {
    return {
        id: p.id as string,
        sku: p.sku as string,
        name: p.name as string,
        description: (p.description as string) ?? '',
        category: (p.category as string) ?? 'Outros',
        unitPrice: Number(p.unit_price) ?? 0,
        costPrice: Number(p.cost_price) ?? 0,
        stockQuantity: Number(p.stock_quantity) ?? 0,
        minStock: Number(p.min_stock) ?? 0,
        unit: (p.unit as string) ?? 'un',
        supplier: (p.supplier as string) ?? '',
        status: p.status as Product['status'],
        createdAt: p.created_at as string,
        updatedAt: p.updated_at as string,
    };
}

function mapFinancialEntry(e: Record<string, unknown>): FinancialEntry {
    return {
        id: e.id as string,
        type: e.type as 'receita' | 'despesa',
        description: e.description as string,
        amount: Number(e.amount) ?? 0,
        category: (e.category as string) ?? 'Outros',
        date: e.entry_date as string,
        status: e.status as 'pago' | 'pendente',
    };
}

function mapChatMessage(m: Record<string, unknown>): ChatMessage {
    return {
        id: m.id as string,
        orderId: m.order_id as string,
        senderId: m.sender_id as string | undefined,
        senderName: m.sender_name as string,
        senderRole: m.sender_role as ChatMessage['senderRole'],
        message: m.message as string,
        createdAt: m.created_at as string,
        readBy: (m.read_by as string[]) ?? [],
    };
}

function logError(fn: string, error: unknown) {
    console.error(`[Supabase] ${fn}:`, error);
}

// ─────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────
export async function fetchOrders(): Promise<Order[]> {
    const { data: ordersRaw, error: ordErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (ordErr) { logError('fetchOrders', ordErr); throw ordErr; }
    if (!ordersRaw || ordersRaw.length === 0) return [];

    const orderIds = ordersRaw.map(o => o.id);

    const [{ data: itemsRaw, error: iErr }, { data: historyRaw, error: hErr }] = await Promise.all([
        supabase.from('order_items').select('*').in('order_id', orderIds),
        supabase.from('order_status_history').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
    ]);

    if (iErr) logError('fetchOrders/items', iErr);
    if (hErr) logError('fetchOrders/history', hErr);

    return ordersRaw.map(o => {
        const items = (itemsRaw ?? []).filter(i => i.order_id === o.id).map(mapItem);
        const history = (historyRaw ?? []).filter(h => h.order_id === o.id).map(mapHistory);
        return mapOrder(o as Record<string, unknown>, items, history);
    });
}

export async function createOrder(order: Order): Promise<void> {
    // 1. Inserir o pedido principal
    const basePayload = {
        id: order.id,
        number: order.number,
        client_id: order.clientId,
        client_name: order.clientName,
        seller_id: order.sellerId || null,
        seller_name: order.sellerName,
        subtotal: order.subtotal,
        taxes: order.taxes,
        total: order.total,
        status: order.status,
        notes: order.notes ?? '',
        payment_method: order.paymentMethod ?? null,
        payment_status: order.paymentStatus ?? null,
        installments: order.installments ?? null,
        receipt_url: order.receiptUrl ?? null,
        delivery_date: order.deliveryDate ?? null,
        order_type: order.orderType ?? null,
    };

    // Campos adicionados na migration v2 (podem não existir ainda)
    const extendedPayload = {
        ...basePayload,
        observation: order.observation ?? '',
        scheduled_date: order.scheduledDate ?? null,
        production_status: order.productionStatus ?? null,
    };

    let { error: ordErr } = await supabase.from('orders').insert(extendedPayload);

    // Se a migration v2 ainda não foi aplicada, tenta sem os campos novos
    if (ordErr) {
        const errMsg = String((ordErr as any).message ?? '').toLowerCase();
        const errCode = String((ordErr as any).code ?? '');
        const errStatus = (ordErr as any).status ?? (ordErr as any).statusCode ?? 0;
        const isColumnError = errCode === '42703'
            || errMsg.includes('column')
            || errMsg.includes('observation')
            || errMsg.includes('scheduled_date')
            || errMsg.includes('production_status')
            || errStatus === 400;
        if (isColumnError) {
            console.warn('[ERP] Migration v2 não aplicada — criando pedido sem campos novos. Rode update_schema_v2.sql no Supabase.');
            const result = await supabase.from('orders').insert(basePayload);
            ordErr = result.error;
        }
    }

    if (ordErr) {
        logError('createOrder/order', ordErr);
        throw ordErr;
    }

    // 2. Inserir os itens
    if (order.items.length > 0) {
        const baseItems = order.items.map(i => ({
            order_id: order.id,
            product_name: i.product,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            discount: i.discount ?? 0,
            discount_type: i.discountType ?? 'percent',
            total: i.total,
        }));

        const extendedItems = order.items.map((i, idx) => ({
            ...baseItems[idx],
            product_description: i.description ?? '',
        }));

        let { error: itemErr } = await supabase.from('order_items').insert(extendedItems);

        // Fallback sem product_description
        if (itemErr) {
            const errMsg = String((itemErr as any).message ?? '').toLowerCase();
            const errCode = String((itemErr as any).code ?? '');
            const errStatus = (itemErr as any).status ?? (itemErr as any).statusCode ?? 0;
            if (errCode === '42703' || errMsg.includes('column') || errMsg.includes('product_description') || errStatus === 400) {
                console.warn('[ERP] Migration v2 — criando itens sem product_description');
                const result = await supabase.from('order_items').insert(baseItems);
                itemErr = result.error;
            }
        }

        if (itemErr) { logError('createOrder/items', itemErr); throw itemErr; }
    }

    // 3. Inserir histórico de status
    if (order.statusHistory.length > 0) {
        const { error: histErr } = await supabase.from('order_status_history').insert(
            order.statusHistory.map(h => ({
                order_id: order.id,
                status: h.status,
                changed_by: h.user,
                note: h.note ?? null,
                created_at: h.timestamp,
            }))
        );
        if (histErr) { logError('createOrder/history', histErr); throw histErr; }
    }
}

export async function updateOrderStatusDb(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<Order>,
    userName?: string,
    note?: string
): Promise<void> {
    const patch: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    };
    if (extra?.paymentStatus !== undefined) patch.payment_status = extra.paymentStatus;
    if (extra?.receiptUrl !== undefined) patch.receipt_url = extra.receiptUrl;
    if (extra?.rejectionReason !== undefined) patch.rejection_reason = extra.rejectionReason;
    if (extra?.productionStartedAt !== undefined) patch.production_started_at = extra.productionStartedAt;
    if (extra?.productionFinishedAt !== undefined) patch.production_finished_at = extra.productionFinishedAt;
    if (extra?.releasedAt !== undefined) patch.released_at = extra.releasedAt;
    if (extra?.releasedBy !== undefined) patch.released_by = extra.releasedBy;
    if (extra?.qrCode !== undefined) patch.qr_code = extra.qrCode;
    if (extra?.scheduledDate !== undefined) patch.scheduled_date = extra.scheduledDate;
    if (extra?.productionStatus !== undefined) patch.production_status = extra.productionStatus;

    let { error: updErr } = await supabase.from('orders').update(patch).eq('id', orderId);

    // Fallback: se colunas v2 não existem, tenta sem elas
    if (updErr) {
        const errMsg = (updErr as any).message ?? '';
        const errCode = (updErr as any).code ?? '';
        const isColumnError = errCode === '42703' || errMsg.includes('column') || errMsg.includes('scheduled_date') || errMsg.includes('production_status');
        if (isColumnError) {
            console.warn('[ERP] Migration v2 — atualizando sem campos novos');
            const patchFallback = { ...patch };
            delete patchFallback.scheduled_date;
            delete patchFallback.production_status;
            const result = await supabase.from('orders').update(patchFallback).eq('id', orderId);
            updErr = result.error;
        }
    }

    if (updErr) { logError('updateOrderStatusDb/update', updErr); throw updErr; }

    const { error: histErr } = await supabase.from('order_status_history').insert({
        order_id: orderId,
        status,
        changed_by: userName ?? 'Sistema',
        note: note ?? null,
    });
    if (histErr) { logError('updateOrderStatusDb/history', histErr); throw histErr; }
}

export async function updateOrderFields(orderId: string, fields: Partial<Order>): Promise<void> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.observation !== undefined) patch.observation = fields.observation;
    if (fields.scheduledDate !== undefined) patch.scheduled_date = fields.scheduledDate;
    if (fields.productionStatus !== undefined) patch.production_status = fields.productionStatus;

    const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (error) {
        // Se for erro de coluna inexistente (migration v2 não aplicada), ignora silenciosamente
        const errMsg = (error as any).message ?? '';
        const errCode = (error as any).code ?? '';
        if (errCode === '42703' || errMsg.includes('column') || errMsg.includes('observation') || errMsg.includes('scheduled_date') || errMsg.includes('production_status')) {
            console.warn('[ERP] updateOrderFields: campo(s) não existem ainda — rode update_schema_v2.sql');
            return;
        }
        logError('updateOrderFields', error);
        throw error;
    }
}

// Atualiza TODOS os dados de um orçamento (edição completa)
export async function updateOrderFull(order: Order): Promise<void> {
    const patch: Record<string, unknown> = {
        client_id: order.clientId,
        client_name: order.clientName,
        subtotal: order.subtotal,
        taxes: order.taxes,
        total: order.total,
        notes: order.notes ?? '',
        observation: order.observation ?? '',
        delivery_date: order.deliveryDate ?? null,
        order_type: order.orderType ?? null,
        updated_at: new Date().toISOString(),
    };
    const { error: updErr } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (updErr) { logError('updateOrderFull/order', updErr); throw updErr; }

    // Remove itens antigos e insere novos
    await supabase.from('order_items').delete().eq('order_id', order.id);
    if (order.items.length > 0) {
        const newItems = order.items.map(i => ({
            order_id: order.id,
            product_name: i.product,
            product_description: i.description ?? '',
            quantity: i.quantity,
            unit_price: i.unitPrice,
            discount: i.discount ?? 0,
            discount_type: i.discountType ?? 'percent',
            total: i.total,
        }));
        const { error: itemErr } = await supabase.from('order_items').insert(newItems);
        if (itemErr) { logError('updateOrderFull/items', itemErr); }
    }
}

// ─────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────
export async function fetchClients(): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) { logError('fetchClients', error); throw error; }
    return (data ?? []).map(c => mapClient(c as Record<string, unknown>));
}

export async function createClient(client: Client): Promise<void> {
    const payload: Record<string, unknown> = {
        id: client.id,
        name: client.name,
        cpf_cnpj: client.cpfCnpj,
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        cep: client.cep ?? '',
        notes: client.notes ?? '',
        consignado: client.consignado ?? false,
        bairro: client.bairro ?? '',
    };
    let { error } = await supabase.from('clients').insert(payload);
    // fallback sem bairro se coluna ainda não existe
    if (error) {
        const msg = String((error as any).message ?? '').toLowerCase();
        if ((error as any).code === '42703' || msg.includes('bairro')) {
            const { bairro: _b, ...rest } = payload;
            const result = await supabase.from('clients').insert(rest);
            error = result.error;
        }
    }
    if (error) { logError('createClient', error); throw error; }
}

export async function updateClient(client: Client): Promise<void> {
    const payload: Record<string, unknown> = {
        id: client.id,
        name: client.name,
        cpf_cnpj: client.cpfCnpj,
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        city: client.city ?? '',
        state: client.state ?? '',
        cep: client.cep ?? '',
        notes: client.notes ?? '',
        consignado: client.consignado ?? false,
        bairro: client.bairro ?? '',
    };
    let { error } = await supabase.from('clients').upsert(payload);
    if (error) {
        const msg = String((error as any).message ?? '').toLowerCase();
        if ((error as any).code === '42703' || msg.includes('bairro')) {
            const { bairro: _b, ...rest } = payload;
            const result = await supabase.from('clients').upsert(rest);
            error = result.error;
        }
    }
    if (error) { logError('updateClient', error); throw error; }
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) { logError('fetchProducts', error); throw error; }
    return (data ?? []).map(p => mapProduct(p as Record<string, unknown>));
}

export async function upsertProduct(product: Product): Promise<void> {
    const { error } = await supabase.from('products').upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description ?? '',
        category: product.category ?? 'Outros',
        unit_price: product.unitPrice ?? 0,
        cost_price: product.costPrice ?? 0,
        stock_quantity: product.stockQuantity ?? 0,
        min_stock: product.minStock ?? 0,
        unit: product.unit ?? 'un',
        supplier: product.supplier ?? '',
        status: product.status ?? 'ativo',
    });
    if (error) { logError('upsertProduct', error); throw error; }
}

export async function deleteProductDb(productId: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) { logError('deleteProduct', error); throw error; }
}

// ─────────────────────────────────────────────────────────────
// FINANCIAL ENTRIES
// ─────────────────────────────────────────────────────────────
export async function fetchFinancialEntries(): Promise<FinancialEntry[]> {
    const { data, error } = await supabase
        .from('financial_entries')
        .select('*')
        .order('entry_date', { ascending: false });
    if (error) { logError('fetchFinancialEntries', error); throw error; }
    return (data ?? []).map(e => mapFinancialEntry(e as Record<string, unknown>));
}

export async function createFinancialEntry(entry: FinancialEntry, orderId?: string): Promise<void> {
    const { error } = await supabase.from('financial_entries').insert({
        id: entry.id,
        type: entry.type,
        description: entry.description,
        amount: entry.amount,
        category: entry.category ?? 'Outros',
        entry_date: entry.date,
        status: entry.status,
        order_id: orderId ?? null,
    });
    if (error) { logError('createFinancialEntry', error); throw error; }
}

// ─────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────
export async function fetchOrderChat(orderId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('order_chat')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
    if (error) { logError('fetchOrderChat', error); return []; }
    return (data ?? []).map(m => mapChatMessage(m as Record<string, unknown>));
}

export async function sendChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt' | 'readBy'>): Promise<ChatMessage | null> {
    const { data, error } = await supabase.from('order_chat').insert({
        order_id: msg.orderId,
        sender_id: msg.senderId ?? null,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        message: msg.message,
        read_by: [msg.senderRole],
    }).select().single();
    if (error) { logError('sendChatMessage', error); return null; }
    return mapChatMessage(data as Record<string, unknown>);
}

export async function markChatRead(orderId: string, role: string): Promise<void> {
    // Marca todas as mensagens do pedido como lidas para o role
    const { data: messages } = await supabase
        .from('order_chat')
        .select('id, read_by')
        .eq('order_id', orderId)
        .not('read_by', 'cs', `{${role}}`);

    if (!messages?.length) return;

    for (const msg of messages) {
        const newReadBy = [...((msg.read_by as string[]) ?? []), role];
        await supabase.from('order_chat').update({ read_by: newReadBy }).eq('id', msg.id);
    }
}

// ─────────────────────────────────────────────────────────────
// ORDER RETURNS (Pedidos Devolvidos)
// ─────────────────────────────────────────────────────────────
export async function fetchOrderReturns(): Promise<OrderReturn[]> {
    const { data, error } = await supabase
        .from('order_returns')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { logError('fetchOrderReturns', error); return []; }
    return (data ?? []).map(r => ({
        id: r.id as string,
        orderId: r.order_id as string,
        orderNumber: r.order_number as string,
        clientName: r.client_name as string,
        reason: r.reason as string,
        reportedBy: r.reported_by as string,
        createdAt: r.created_at as string,
    }));
}

export async function createOrderReturn(ret: Omit<OrderReturn, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('order_returns').insert({
        order_id: ret.orderId,
        order_number: ret.orderNumber,
        client_name: ret.clientName,
        reason: ret.reason,
        reported_by: ret.reportedBy,
    });
    if (error) { logError('createOrderReturn', error); throw error; }
}

// ─────────────────────────────────────────────────────────────
// PRODUCTION ERRORS
// ─────────────────────────────────────────────────────────────
export async function fetchProductionErrors(): Promise<ProductionError[]> {
    const { data, error } = await supabase
        .from('production_errors')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) { logError('fetchProductionErrors', error); return []; }
    return (data ?? []).map(e => ({
        id: e.id as string,
        orderId: e.order_id as string | undefined,
        orderNumber: e.order_number as string | undefined,
        clientName: e.client_name as string | undefined,
        description: e.description as string,
        reportedBy: e.reported_by as string,
        severity: e.severity as ProductionError['severity'],
        resolved: e.resolved as boolean,
        createdAt: e.created_at as string,
        resolvedAt: e.resolved_at as string | undefined,
    }));
}

export async function createProductionError(err: Omit<ProductionError, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase.from('production_errors').insert({
        order_id: err.orderId ?? null,
        order_number: err.orderNumber ?? null,
        client_name: err.clientName ?? null,
        description: err.description,
        reported_by: err.reportedBy,
        severity: err.severity,
        resolved: err.resolved ?? false,
    });
    if (error) { logError('createProductionError', error); throw error; }
}

export async function resolveProductionError(errorId: string): Promise<void> {
    const { error } = await supabase.from('production_errors').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
    }).eq('id', errorId);
    if (error) { logError('resolveProductionError', error); throw error; }
}

// ─────────────────────────────────────────────────────────────
// RESET — Remove todos os dados (apenas Gestor)
// ─────────────────────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
    const tables = ['order_chat', 'order_returns', 'production_errors', 'financial_entries', 'orders', 'clients', 'products'];
    for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) { logError(`clearAllData(${table})`, error); throw error; }
        console.log(`[ERP] Tabela ${table} limpa.`);
    }
}
