import { supabase } from './supabase';
import type { Warranty } from '@/types/erp';

const supabaseToWarranty = (data: any): Warranty => ({
    id: data.id,
    orderId: data.order_id,
    orderNumber: data.order_number,
    clientId: data.client_id,
    clientName: data.client_name,
    product: data.product,
    description: data.description,
    status: data.status,
    receiptUrls: data.receipt_urls || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    resolution: data.resolution || undefined,
});

const warrantyToSupabase = (w: Partial<Warranty>) => {
    const data: any = {};
    if (w.orderId) data.order_id = w.orderId;
    if (w.orderNumber) data.order_number = w.orderNumber;
    if (w.clientId) data.client_id = w.clientId;
    if (w.clientName) data.client_name = w.clientName;
    if (w.product) data.product = w.product;
    if (w.description) data.description = w.description;
    if (w.status) data.status = w.status;
    if (w.receiptUrls) data.receipt_urls = w.receiptUrls;
    if (w.resolution) data.resolution = w.resolution;
    return data;
};

export const fetchWarranties = async (): Promise<Warranty[]> => {
    const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(supabaseToWarranty);
};

export const createWarranty = async (warranty: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warranty> => {
    const payload = warrantyToSupabase(warranty);
    const { data, error } = await supabase
        .from('warranties')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return supabaseToWarranty(data);
};

export const updateWarranty = async (id: string, updates: Partial<Warranty>): Promise<Warranty> => {
    const payload = warrantyToSupabase(updates);
    const { data, error } = await supabase
        .from('warranties')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return supabaseToWarranty(data);
};
