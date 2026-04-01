import { supabase } from './supabase';
import type { FinancialEntry, DelayReport, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup } from '@/types/erp';

// ── Financial Entries ────────────────────────────────────────────────────────
const supabaseToFinancial = (data: any): FinancialEntry => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientId: data.client_id,
    clientName: data.client_name,
    amount: Number(data.amount),
    type: data.type,
    category: data.category,
    description: data.description || '',
    status: data.status,
    paymentMethod: data.payment_method || '',
    dueDate: data.due_date || undefined,
    paidAt: data.paid_at || undefined,
    receiptUrl: data.receipt_url || undefined,
    receiptUrls: data.receipt_urls || (data.receipt_url ? [data.receipt_url] : []),
    transactionId: data.transaction_id || undefined,
    cardLastDigits: data.card_last_digits || undefined,
    date: data.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    createdAt: data.created_at,
});

export const fetchFinancialEntries = async (): Promise<FinancialEntry[]> => {
    try {
        // 🚨 EMERGÊNCIA: Removemos colunas pesadas (receipts) do fetch de listagem do financeiro
        const BASIC_FINANCIAL_COLUMNS = 'id, order_id, order_number, client_id, client_name, amount, type, category, description, status, payment_method, due_date, paid_at, transaction_id, card_last_digits, created_at, receipt_urls';

        const { data, error } = await supabase.from('financial_entries')
            .select(BASIC_FINANCIAL_COLUMNS)
            .order('created_at', { ascending: false })
            .limit(300);
        if (error) throw error;
        return (data || []).map(supabaseToFinancial);
    } catch (err: any) {
        console.error('[Financial] Erro ao buscar lançamentos:', err.message);
        return [];
    }
};

export const fetchFinancialEntriesByOrderId = async (orderId: string): Promise<FinancialEntry[]> => {
    try {
        const { data, error } = await supabase.from('financial_entries')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(supabaseToFinancial);
    } catch (err: any) {
        console.error('[Financial] Erro ao buscar lançamentos por Pedido:', err.message);
        return [];
    }
};

export const createFinancialEntrySupabase = async (entry: FinancialEntry): Promise<FinancialEntry | null> => {
    try {
        const payload = {
            order_id: entry.orderId,
            order_number: entry.orderNumber,
            client_id: entry.clientId,
            client_name: entry.clientName,
            amount: entry.amount,
            type: entry.type,
            category: entry.category,
            description: entry.description || null,
            status: entry.status,
            payment_method: entry.paymentMethod || null,
            due_date: entry.dueDate || null,
            paid_at: entry.paidAt || null,
            receipt_url: entry.receiptUrl || null,
            receipt_urls: entry.receiptUrls || [],
            transaction_id: entry.transactionId || null,
            card_last_digits: entry.cardLastDigits || null,
        };
        const { data, error } = await supabase.from('financial_entries').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToFinancial(data);
    } catch (err: any) {
        console.error('[Financial] Erro ao criar lançamento:', err.message);
        throw err;
    }
};

export const updateFinancialEntrySupabase = async (id: string, updates: Partial<FinancialEntry>): Promise<FinancialEntry | null> => {
    try {
        const payload: any = {};
        if (updates.status) payload.status = updates.status;
        if (updates.description) payload.description = updates.description;
        if (updates.amount) payload.amount = updates.amount;
        if (updates.receiptUrl !== undefined) payload.receipt_url = updates.receiptUrl;
        if (updates.receiptUrls !== undefined) payload.receipt_urls = updates.receiptUrls;
        if (updates.transactionId) payload.transaction_id = updates.transactionId;
        if (updates.cardLastDigits) payload.card_last_digits = updates.cardLastDigits;

        const { data, error } = await supabase.from('financial_entries')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return supabaseToFinancial(data);
    } catch (err: any) {
        console.error('[Financial] Erro ao atualizar lançamento:', err.message);
        throw err;
    }
};

// ── Delay Reports ───────────────────────────────────────────────────────────
const supabaseToDelay = (data: any): DelayReport => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientName: data.client_name,
    orderTotal: Number(data.order_total || 0),
    reason: data.reason,
    sentBy: data.sent_by,
    orderType: data.order_type as any,
    deliveryDate: data.delivery_date || undefined,
    sentAt: data.sent_at,
    readAt: data.read_at || undefined,
});

export const fetchDelayReports = async (): Promise<DelayReport[]> => {
    try {
        // ⚡ OTIMIZAÇÃO
        const { data, error } = await supabase.from('delay_reports')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return (data || []).map(supabaseToDelay);
    } catch (err: any) {
        console.error('[DelayReports] Erro ao buscar alertas de atraso:', err.message);
        return [];
    }
};

export const createDelayReportSupabase = async (report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>): Promise<DelayReport | null> => {
    try {
        const payload = {
            order_id: report.orderId,
            order_number: report.orderNumber,
            client_name: report.clientName,
            order_total: report.orderTotal,
            reason: report.reason,
            sent_by: report.sentBy,
            order_type: report.orderType,
            delivery_date: report.deliveryDate || null,
        };
        const { data, error } = await supabase.from('delay_reports').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToDelay(data);
    } catch (err: any) {
        console.error('[DelayReports] Erro ao criar alerta:', err.message);
        throw err;
    }
};

export const markDelayReportReadSupabase = async (reportId: string): Promise<DelayReport | null> => {
    try {
        const { data, error } = await supabase.from('delay_reports').update({ read_at: new Date().toISOString() }).eq('id', reportId).select().single();
        if (error) throw error;
        return supabaseToDelay(data);
    } catch (err: any) {
        console.error('[DelayReports] Erro ao marcar como lido:', err.message);
        throw err;
    }
};

// ── Order Returns ────────────────────────────────────────────────────────────
const supabaseToReturn = (data: any): OrderReturn => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientName: data.client_name,
    reason: data.reason,
    reportedBy: data.reported_by,
    resolved: data.resolved || false,
    resolvedAt: data.resolved_at || undefined,
    createdAt: data.created_at,
});

export const fetchOrderReturns = async (): Promise<OrderReturn[]> => {
    try {
        // ⚡ OTIMIZAÇÃO
        const { data, error } = await supabase.from('order_returns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return (data || []).map(supabaseToReturn);
    } catch (err: any) {
        console.error('[Returns] Erro ao buscar devoluções:', err.message);
        return [];
    }
};

export const createOrderReturnSupabase = async (ret: Omit<OrderReturn, 'id' | 'createdAt' | 'resolvedAt'>): Promise<OrderReturn | null> => {
    try {
        const payload = {
            order_id: ret.orderId,
            order_number: ret.orderNumber,
            client_name: ret.clientName,
            reason: ret.reason,
            reported_by: ret.reportedBy,
            resolved: ret.resolved || false,
        };
        const { data, error } = await supabase.from('order_returns').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToReturn(data);
    } catch (err: any) {
        console.error('[Returns] Erro ao criar devolução:', err.message);
        throw err;
    }
};

export const resolveOrderReturnSupabase = async (returnId: string): Promise<OrderReturn | null> => {
    try {
        const { data, error } = await supabase.from('order_returns')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', returnId)
            .select()
            .single();
        if (error) throw error;
        return supabaseToReturn(data);
    } catch (err: any) {
        console.error('[Returns] Erro ao resolver devolução:', err.message);
        throw err;
    }
};

// ── Production Errors ────────────────────────────────────────────────────────
const supabaseToProdError = (data: any): ProductionError => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientName: data.client_name,
    description: data.description,
    reportedBy: data.reported_by,
    severity: data.severity as any,
    resolved: data.resolved || false,
    resolvedAt: data.resolved_at || undefined,
    createdAt: data.created_at,
});

export const fetchProductionErrors = async (): Promise<ProductionError[]> => {
    try {
        // ⚡ OTIMIZAÇÃO
        const { data, error } = await supabase.from('production_errors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return (data || []).map(supabaseToProdError);
    } catch (err: any) {
        console.error('[ProdErrors] Erro ao buscar erros de produção:', err.message);
        return [];
    }
};

export const createProductionErrorSupabase = async (err: Omit<ProductionError, 'id' | 'createdAt' | 'resolvedAt'>): Promise<ProductionError | null> => {
    try {
        const payload = {
            order_id: err.orderId || null,
            order_number: err.orderNumber || null,
            client_name: err.clientName || null,
            description: err.description,
            reported_by: err.reportedBy,
            severity: err.severity,
            resolved: err.resolved,
        };
        const { data, error } = await supabase.from('production_errors').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToProdError(data);
    } catch (err: any) {
        console.error('[ProdErrors] Erro ao criar erro de produção:', err.message);
        throw err;
    }
};

export const resolveProductionErrorSupabase = async (errorId: string): Promise<ProductionError | null> => {
    try {
        const { data, error } = await supabase.from('production_errors').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', errorId).select().single();
        if (error) throw error;
        return supabaseToProdError(data);
    } catch (err: any) {
        console.error('[ProdErrors] Erro ao resolver erro de produção:', err.message);
        throw err;
    }
};

// ── Barcode Scans ────────────────────────────────────────────────────────────
const supabaseToBarcodeScan = (data: any): BarcodeScan => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    scannedBy: data.scanned_by,
    scannedAt: data.created_at,
    success: data.success,
    note: data.note,
});

export const fetchBarcodeScans = async (): Promise<BarcodeScan[]> => {
    try {
        // ⚡ OTIMIZAÇÃO
        const { data, error } = await supabase.from('barcode_scans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;
        return (data || []).map(supabaseToBarcodeScan);
    } catch (err: any) {
        console.error('[BarcodeScans] Erro ao buscar leituras:', err.message);
        return [];
    }
};

export const createBarcodeScanSupabase = async (scan: Omit<BarcodeScan, 'id' | 'scannedAt'>): Promise<BarcodeScan | null> => {
    try {
        const payload = {
            id: crypto.randomUUID(),
            order_id: scan.orderId,
            order_number: scan.orderNumber,
            scanned_by: scan.scannedBy,
            success: scan.success,
            note: scan.note,
        };
        const { data, error } = await supabase.from('barcode_scans').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToBarcodeScan(data);
    } catch (err: any) {
        console.error('[BarcodeScans] Erro ao criar leitura:', err.message);
        throw err;
    }
};

// ── Delivery Pickups ─────────────────────────────────────────────────────────
const supabaseToDeliveryPickup = (data: any): DeliveryPickup => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    delivererName: data.deliverer_name,
    photoUrl: data.photo_url,
    signatureUrl: data.signature_url,
    pickedUpAt: data.created_at,
    batchId: data.batch_id,
    note: data.note,
});

export const fetchDeliveryPickups = async (): Promise<DeliveryPickup[]> => {
    try {
        // 🚨 EMERGÊNCIA: Adicionamos colunas de fotos/assinaturas para o relatório de logística funcionar corretamente
        const BASIC_PICKUP_COLUMNS = 'id, order_id, order_number, deliverer_name, created_at, batch_id, note, photo_url, signature_url';

        const { data, error } = await supabase.from('delivery_pickups')
            .select(BASIC_PICKUP_COLUMNS)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return (data || []).map(supabaseToDeliveryPickup);
    } catch (err: any) {
        console.error('[DeliveryPickups] Erro ao buscar retiradas:', err.message);
        return [];
    }
};

export const createDeliveryPickupSupabase = async (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>): Promise<DeliveryPickup | null> => {
    try {
        const payload = {
            id: crypto.randomUUID(),
            order_id: pickup.orderId,
            order_number: pickup.orderNumber,
            deliverer_name: pickup.delivererName,
            photo_url: pickup.photoUrl,
            signature_url: pickup.signatureUrl,
            batch_id: pickup.batchId,
            note: pickup.note,
        };
        const { data, error } = await supabase.from('delivery_pickups').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToDeliveryPickup(data);
    } catch (err: any) {
        console.error('[DeliveryPickups] Erro ao criar retirada:', err.message);
        throw err;
    }
};

