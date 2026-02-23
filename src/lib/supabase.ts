import { createClient } from '@supabase/supabase-js';

// Valores do .env — se estiverem vazios, usa fallback hardcoded
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)
    || 'https://ajmmnexllfhlghpktjqy.supabase.co';

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbW1uZXhsbGZobGdocGt0anF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDczMTksImV4cCI6MjA4NzI4MzMxOX0.5yg82Uc4REYjPrdAzPs1m0eKQKnKEZG5KCkkazLXJ1Q';

console.info('[Supabase] Inicializando cliente:', supabaseUrl ? '✓ URL ok' : '✗ URL FALTANDO');

// Fix: desabilita o LockManager do Supabase que causa timeout em múltiplas abas
// O erro "Navigator LockManager lock timed out" ocorre quando o Web Locks API
// fica bloqueado. Usamos um lock fake que resolve imediatamente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
            return await fn();
        }
    }
});





// ─── Tipos do banco alinhados ao schema ─────────────────────
export type DbOrder = {
    id: string;
    number: string;
    client_id: string;
    client_name: string;
    seller_id: string | null;
    seller_name: string;
    subtotal: number;
    taxes: number;
    total: number;
    status: string;
    notes: string;
    payment_method: string | null;
    payment_status: string | null;
    installments: number | null;
    rejection_reason: string | null;
    receipt_url: string | null;
    qr_code: string | null;
    production_started_at: string | null;
    production_finished_at: string | null;
    released_at: string | null;
    released_by: string | null;
    created_at: string;
    updated_at: string;
};

export type DbOrderItem = {
    id: string;
    order_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    discount_type: 'percent' | 'value';
    total: number;
    created_at: string;
};

export type DbOrderStatusHistory = {
    id: string;
    order_id: string;
    status: string;
    changed_by: string;
    note: string | null;
    created_at: string;
};

export type DbClient = {
    id: string;
    name: string;
    cpf_cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    cep: string;
    notes: string;
    created_at: string;
    updated_at: string;
};

export type DbProduct = {
    id: string;
    sku: string;
    name: string;
    description: string;
    category: string;
    unit_price: number;
    cost_price: number;
    stock_quantity: number;
    min_stock: number;
    unit: string;
    supplier: string;
    status: 'ativo' | 'inativo' | 'esgotado';
    created_at: string;
    updated_at: string;
};

export type DbFinancialEntry = {
    id: string;
    type: 'receita' | 'despesa';
    description: string;
    amount: number;
    category: string;
    entry_date: string;
    status: 'pago' | 'pendente';
    order_id: string | null;
    created_at: string;
    updated_at: string;
};

export type DbProfile = {
    id: string;
    name: string;
    email: string;
    role: 'vendedor' | 'financeiro' | 'gestor' | 'producao';
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
};
