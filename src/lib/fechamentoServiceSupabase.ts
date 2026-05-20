import { apiFetch } from './api';
import type { MonthlyClosing } from '@/types/erp';

export const fetchMonthlyClosings = async (): Promise<MonthlyClosing[]> => {
  try {
    console.log('[Fechamento] 📝 Buscando fechamentos mensais locais...');
    const data = await apiFetch('/gestor/monthly-closings');
    return (data || []).map((m: any) => ({
      id: m.id,
      sellerId: m.seller_id,
      sellerName: m.seller_name,
      referenceMonth: m.reference_month,
      closingDate: m.closing_date,
      totalSold: Number(m.total_sold),
      orderCount: Number(m.order_count),
      outstandingValue: Number(m.outstanding_value),
      details: m.details,
      createdAt: m.created_at
    }));
  } catch (error) {
    console.error('Error fetching monthly closings:', error);
    return [];
  }
};

export const createMonthlyClosing = async (closing: Omit<MonthlyClosing, 'id' | 'createdAt'>): Promise<MonthlyClosing | null> => {
  try {
    console.log('[Fechamento] 📝 Criando fechamento mensal local...');
    const payload = {
      seller_id: closing.sellerId,
      seller_name: closing.sellerName,
      reference_month: closing.referenceMonth,
      closing_date: closing.closingDate,
      total_sold: closing.totalSold,
      order_count: closing.orderCount,
      outstanding_value: closing.outstandingValue,
      details: closing.details
    };
    const data = await apiFetch('/gestor/monthly-closings', {
      method: 'POST',
      body: payload,
    });
    if (!data) {
      throw new Error('A API não retornou o fechamento mensal criado.');
    }
    return {
      id: data.id,
      sellerId: data.seller_id,
      sellerName: data.seller_name,
      referenceMonth: data.reference_month,
      closingDate: data.closing_date,
      totalSold: Number(data.total_sold),
      orderCount: Number(data.order_count),
      outstandingValue: Number(data.outstanding_value),
      details: data.details,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error creating monthly closing:', error);
    return null;
  }
};

export const updateMonthlyClosing = async (id: string, closing: Partial<MonthlyClosing>): Promise<MonthlyClosing | null> => {
  try {
    console.log('[Fechamento] 📝 Atualizando fechamento mensal local:', id);
    const updateData: any = {};
    if (closing.totalSold !== undefined) updateData.total_sold = closing.totalSold;
    if (closing.orderCount !== undefined) updateData.order_count = closing.orderCount;
    if (closing.outstandingValue !== undefined) updateData.outstanding_value = closing.outstandingValue;
    if (closing.details !== undefined) updateData.details = closing.details;

    const data = await apiFetch(`/gestor/monthly-closings/${id}`, {
      method: 'PUT',
      body: updateData,
    });
    if (!data) {
      throw new Error('A API não retornou o fechamento mensal atualizado.');
    }
    return {
      id: data.id,
      sellerId: data.seller_id,
      sellerName: data.seller_name,
      referenceMonth: data.reference_month,
      closingDate: data.closing_date,
      totalSold: Number(data.total_sold),
      orderCount: Number(data.order_count),
      outstandingValue: Number(data.outstanding_value),
      details: data.details,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error updating monthly closing:', error);
    return null;
  }
};
