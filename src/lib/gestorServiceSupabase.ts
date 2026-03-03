import { supabase } from './supabase';
import type { FinancialEntry, DelayReport, OrderReturn, ProductionError } from '@/types/erp';

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
    date: data.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    createdAt: data.created_at,
});

export const fetchFinancialEntries = async (): Promise<FinancialEntry[]> => {
    try {
        const { data, error } = await supabase.from('financial_entries').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(supabaseToFinancial);
    } catch (err: any) {
        console.error('[Financial] Erro ao buscar lançamentos:', err.message);
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
        };
        const { data, error } = await supabase.from('financial_entries').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToFinancial(data);
    } catch (err: any) {
        console.error('[Financial] Erro ao criar lançamento:', err.message);
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
        const { data, error } = await supabase.from('delay_reports').select('*').order('sent_at', { ascending: false });
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
    createdAt: data.created_at,
});

export const fetchOrderReturns = async (): Promise<OrderReturn[]> => {
    try {
        const { data, error } = await supabase.from('order_returns').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(supabaseToReturn);
    } catch (err: any) {
        console.error('[Returns] Erro ao buscar devoluções:', err.message);
        return [];
    }
};

export const createOrderReturnSupabase = async (ret: Omit<OrderReturn, 'id' | 'createdAt'>): Promise<OrderReturn | null> => {
    try {
        const payload = {
            order_id: ret.orderId,
            order_number: ret.orderNumber,
            client_name: ret.clientName,
            reason: ret.reason,
            reported_by: ret.reportedBy,
        };
        const { data, error } = await supabase.from('order_returns').insert([payload]).select().single();
        if (error) throw error;
        return supabaseToReturn(data);
    } catch (err: any) {
        console.error('[Returns] Erro ao criar devolução:', err.message);
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
        const { data, error } = await supabase.from('production_errors').select('*').order('created_at', { ascending: false });
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
