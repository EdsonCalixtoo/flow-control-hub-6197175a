import { supabase } from './supabase';
import type { Product } from '@/types/erp';

// ── Converter Supabase → TypeScript ─────────────────────────────────────────
const supabaseToProduct = (data: any): Product => ({
    id: data.id,
    sku: data.sku,
    name: data.name,
    description: data.description || '',
    category: data.category || 'Geral',
    unitPrice: data.unit_price ?? 0,
    costPrice: data.cost_price ?? 0,
    stockQuantity: data.stock_quantity ?? 0,
    minStock: data.min_stock ?? 0,
    unit: data.unit || 'un',
    supplier: data.supplier || '',
    status: data.status || 'ativo',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

// ── Converter TypeScript → Supabase ─────────────────────────────────────────
const productToSupabase = (product: Partial<Product>) => ({
    sku: product.sku,
    name: product.name,
    description: product.description || null,
    category: product.category || 'Geral',
    unit_price: product.unitPrice ?? 0,
    cost_price: product.costPrice ?? 0,
    stock_quantity: product.stockQuantity ?? 0,
    min_stock: product.minStock ?? 0,
    unit: product.unit || 'un',
    supplier: product.supplier || null,
    status: product.status || 'ativo',
});

// ── Buscar todos os produtos (todos os usuários veem todos os produtos) ──────
export const fetchProducts = async (): Promise<Product[]> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true })
            .limit(1000); // ⚡ OTIMIZAÇÃO: Evita carregar milhares de produtos de uma vez

        if (error) {
            console.error('[Products] ❌ Erro ao buscar produtos:', error.message);
            return [];
        }

        const products = (data || []).map(supabaseToProduct);
        console.log('[Products] ✅ Produtos carregados:', products.length);
        return products;
    } catch (err: any) {
        console.error('[Products] ❌ Erro ao buscar produtos:', err.message);
        return [];
    }
};

// ── Criar produto (apenas gestor) ────────────────────────────────────────────
export const createProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    try {
        const payload = productToSupabase(product);

        const { data, error } = await supabase
            .from('products')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('[Products] ❌ Erro ao criar produto:', error);
            throw new Error(error.message);
        }

        const newProduct = supabaseToProduct(data);
        console.log('[Products] ✅ Produto criado:', newProduct.id, newProduct.name);
        return newProduct;
    } catch (err: any) {
        console.error('[Products] ❌ Erro ao criar produto:', err.message);
        throw err;
    }
};

// ── Atualizar produto ────────────────────────────────────────────────────────
export const updateProductSupabase = async (product: Product): Promise<Product | null> => {
    try {
        const payload = productToSupabase(product);

        const { data, error } = await supabase
            .from('products')
            .update(payload)
            .eq('id', product.id)
            .select()
            .single();

        if (error) {
            console.error('[Products] ❌ Erro ao atualizar produto:', error.message);
            throw new Error(error.message);
        }

        const updated = supabaseToProduct(data);
        console.log('[Products] ✅ Produto atualizado:', updated.id);
        return updated;
    } catch (err: any) {
        console.error('[Products] ❌ Erro ao atualizar produto:', err.message);
        throw err;
    }
};

// ── Deletar produto ──────────────────────────────────────────────────────────
export const deleteProductSupabase = async (productId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            console.error('[Products] ❌ Erro ao deletar produto:', error.message);
            throw new Error(error.message);
        }

        console.log('[Products] ✅ Produto deletado:', productId);
        return true;
    } catch (err: any) {
        console.error('[Products] ❌ Erro ao deletar produto:', err.message);
        throw err;
    }
};
