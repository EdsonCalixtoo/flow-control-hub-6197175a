import { apiFetch } from './api';
import type { FinancialEntry, DelayReport, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup } from '@/types/erp';

// ── Financial Entries ────────────────────────────────────────────────────────
const supabaseToFinancial = (data: any): FinancialEntry => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientId: data.client_id,
    clientName: data.client_name,
    amount: Number(data.amount || 0),
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
        console.log('[Gestor] 📝 Buscando lançamentos financeiros locais...');
        const data = await apiFetch('/gestor/financial');
        return (data || []).map(supabaseToFinancial);
    } catch (err: any) {
        console.error('[Financial] Erro ao buscar lançamentos:', err.message);
        return [];
    }
};

export const fetchFinancialEntriesByOrderId = async (orderId: string): Promise<FinancialEntry[]> => {
    try {
        console.log('[Gestor] 📝 Buscando lançamentos por Pedido local:', orderId);
        const data = await apiFetch(`/gestor/financial/order/${orderId}`);
        return (data || []).map(supabaseToFinancial);
    } catch (err: any) {
        console.error('[Financial] Erro ao buscar lançamentos por Pedido:', err.message);
        return [];
    }
};

export const createFinancialEntrySupabase = async (entry: FinancialEntry): Promise<FinancialEntry | null> => {
    try {
        console.log('[Gestor] 📝 Criando lançamento financeiro local...');
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
        const data = await apiFetch('/gestor/financial', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToFinancial(data) : null;
    } catch (err: any) {
        console.error('[Financial] Erro ao criar lançamento:', err.message);
        throw err;
    }
};

export const updateFinancialEntrySupabase = async (id: string, updates: Partial<FinancialEntry>): Promise<FinancialEntry | null> => {
    try {
        console.log('[Gestor] 📝 Atualizando lançamento financeiro local:', id);
        const payload: any = {};
        if (updates.status) payload.status = updates.status;
        if (updates.description) payload.description = updates.description;
        if (updates.amount) payload.amount = updates.amount;
        if (updates.receiptUrl !== undefined) payload.receipt_url = updates.receiptUrl;
        if (updates.receiptUrls !== undefined) payload.receipt_urls = updates.receiptUrls;
        if (updates.transactionId) payload.transaction_id = updates.transactionId;
        if (updates.cardLastDigits) payload.card_last_digits = updates.cardLastDigits;

        const data = await apiFetch(`/gestor/financial/${id}`, {
            method: 'PUT',
            body: payload,
        });
        return data ? supabaseToFinancial(data) : null;
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
        console.log('[Gestor] 📝 Buscando relatórios de atraso locais...');
        const data = await apiFetch('/gestor/delay-reports');
        return (data || []).map(supabaseToDelay);
    } catch (err: any) {
        console.error('[DelayReports] Erro ao buscar alertas de atraso:', err.message);
        return [];
    }
};

export const createDelayReportSupabase = async (report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>): Promise<DelayReport | null> => {
    try {
        console.log('[Gestor] 📝 Criando relatório de atraso local...');
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
        const data = await apiFetch('/gestor/delay-reports', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToDelay(data) : null;
    } catch (err: any) {
        console.error('[DelayReports] Erro ao criar alerta:', err.message);
        throw err;
    }
};

export const markDelayReportReadSupabase = async (reportId: string): Promise<DelayReport | null> => {
    try {
        console.log('[Gestor] 📝 Marcando relatório de atraso como lido local:', reportId);
        const data = await apiFetch(`/gestor/delay-reports/${reportId}/read`, {
            method: 'PUT',
        });
        return data ? supabaseToDelay(data) : null;
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
        console.log('[Gestor] 📝 Buscando devoluções locais...');
        const data = await apiFetch('/gestor/order-returns');
        return (data || []).map(supabaseToReturn);
    } catch (err: any) {
        console.error('[Returns] Erro ao buscar devoluções:', err.message);
        return [];
    }
};

export const createOrderReturnSupabase = async (ret: Omit<OrderReturn, 'id' | 'createdAt' | 'resolvedAt'>): Promise<OrderReturn | null> => {
    try {
        console.log('[Gestor] 📝 Criando devolução local...');
        const payload = {
            order_id: ret.orderId,
            order_number: ret.orderNumber,
            client_name: ret.clientName,
            reason: ret.reason,
            reported_by: ret.reportedBy,
            resolved: ret.resolved || false,
        };
        const data = await apiFetch('/gestor/order-returns', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToReturn(data) : null;
    } catch (err: any) {
        console.error('[Returns] Erro ao criar devolução:', err.message);
        throw err;
    }
};

export const resolveOrderReturnSupabase = async (returnId: string): Promise<OrderReturn | null> => {
    try {
        console.log('[Gestor] 📝 Resolvendo devolução local:', returnId);
        const data = await apiFetch(`/gestor/order-returns/${returnId}/resolve`, {
            method: 'PUT',
        });
        return data ? supabaseToReturn(data) : null;
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
        console.log('[Gestor] 📝 Buscando erros de produção locais...');
        const data = await apiFetch('/gestor/production-errors');
        return (data || []).map(supabaseToProdError);
    } catch (err: any) {
        console.error('[ProdErrors] Erro ao buscar erros de produção:', err.message);
        return [];
    }
};

export const createProductionErrorSupabase = async (err: Omit<ProductionError, 'id' | 'createdAt' | 'resolvedAt'>): Promise<ProductionError | null> => {
    try {
        console.log('[Gestor] 📝 Criando erro de produção local...');
        const payload = {
            order_id: err.orderId || null,
            order_number: err.orderNumber || null,
            client_name: err.clientName || null,
            description: err.description,
            reported_by: err.reportedBy,
            severity: err.severity,
            resolved: err.resolved,
        };
        const data = await apiFetch('/gestor/production-errors', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToProdError(data) : null;
    } catch (err: any) {
        console.error('[ProdErrors] Erro ao criar erro de produção:', err.message);
        throw err;
    }
};

export const resolveProductionErrorSupabase = async (errorId: string): Promise<ProductionError | null> => {
    try {
        console.log('[Gestor] 📝 Resolvendo erro de produção local:', errorId);
        const data = await apiFetch(`/gestor/production-errors/${errorId}/resolve`, {
            method: 'PUT',
        });
        return data ? supabaseToProdError(data) : null;
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
        console.log('[Gestor] 📝 Buscando leituras de código de barras locais...');
        const data = await apiFetch('/gestor/barcode-scans');
        return (data || []).map(supabaseToBarcodeScan);
    } catch (err: any) {
        console.error('[BarcodeScans] Erro ao buscar leituras:', err.message);
        return [];
    }
};

export const createBarcodeScanSupabase = async (scan: Omit<BarcodeScan, 'id' | 'scannedAt'>): Promise<BarcodeScan | null> => {
    try {
        console.log('[Gestor] 📝 Criando leitura de código de barras local...');
        const payload = {
            order_id: scan.orderId,
            order_number: scan.orderNumber,
            scanned_by: scan.scannedBy,
            success: scan.success,
            note: scan.note,
        };
        const data = await apiFetch('/gestor/barcode-scans', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToBarcodeScan(data) : null;
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
        console.log('[Gestor] 📝 Buscando retiradas de entrega locais...');
        const data = await apiFetch('/gestor/delivery-pickups');
        return (data || []).map(supabaseToDeliveryPickup);
    } catch (err: any) {
        console.error('[DeliveryPickups] Erro ao buscar retiradas:', err.message);
        return [];
    }
};

export const createDeliveryPickupSupabase = async (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>): Promise<DeliveryPickup | null> => {
    try {
        console.log('[Gestor] 📝 Criando retirada de entrega local...');
        const payload = {
            order_id: pickup.orderId,
            order_number: pickup.orderNumber,
            deliverer_name: pickup.delivererName,
            photo_url: pickup.photoUrl,
            signature_url: pickup.signatureUrl,
            batch_id: pickup.batchId,
            note: pickup.note,
        };
        const data = await apiFetch('/gestor/delivery-pickups', {
            method: 'POST',
            body: payload,
        });
        return data ? supabaseToDeliveryPickup(data) : null;
    } catch (err: any) {
        console.error('[DeliveryPickups] Erro ao criar retirada:', err.message);
        throw err;
    }
};

export const deleteDeliveryPickupsByOrderIdSupabase = async (orderId: string): Promise<void> => {
    try {
        console.log('[Gestor] 📝 Excluindo retiradas de entrega locais para pedido:', orderId);
        await apiFetch(`/gestor/delivery-pickups/order/${orderId}`, {
            method: 'DELETE',
        });
    } catch (err: any) {
        console.error('[DeliveryPickups] Erro ao excluir retiradas:', err.message);
        throw err;
    }
};

export const deleteBarcodeScansByOrderIdSupabase = async (orderId: string): Promise<void> => {
    try {
        console.log('[Gestor] 📝 Excluindo leituras de código de barras locais para pedido:', orderId);
        await apiFetch(`/gestor/barcode-scans/order/${orderId}`, {
            method: 'DELETE',
        });
    } catch (err: any) {
        console.error('[BarcodeScans] Erro ao excluir leituras:', err.message);
        throw err;
    }
};

