import { supabase } from './supabase';
import type { MonthlyClosing } from '@/types/erp';

export const fetchMonthlyClosings = async (): Promise<MonthlyClosing[]> => {
  const { data, error } = await supabase
    .from('monthly_closings')
    .select('*')
    .order('closing_date', { ascending: false });

  if (error) {
    console.error('Error fetching monthly closings:', error);
    return [];
  }

  return data.map(m => ({
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
};

export const createMonthlyClosing = async (closing: Omit<MonthlyClosing, 'id' | 'createdAt'>): Promise<MonthlyClosing | null> => {
  const { data, error } = await supabase
    .from('monthly_closings')
    .insert([{
      id: crypto.randomUUID(),
      seller_id: closing.sellerId,
      seller_name: closing.sellerName,
      reference_month: closing.referenceMonth,
      closing_date: closing.closingDate,
      total_sold: closing.totalSold,
      order_count: closing.orderCount,
      outstanding_value: closing.outstandingValue,
      details: closing.details
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating monthly closing:', error);
    return null;
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
};

export const updateMonthlyClosing = async (id: string, closing: Partial<MonthlyClosing>): Promise<MonthlyClosing | null> => {
  const updateData: any = {};
  if (closing.totalSold !== undefined) updateData.total_sold = closing.totalSold;
  if (closing.orderCount !== undefined) updateData.order_count = closing.orderCount;
  if (closing.outstandingValue !== undefined) updateData.outstanding_value = closing.outstandingValue;
  if (closing.details !== undefined) updateData.details = closing.details;

  const { data, error } = await supabase
    .from('monthly_closings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating monthly closing:', error);
    return null;
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
};
