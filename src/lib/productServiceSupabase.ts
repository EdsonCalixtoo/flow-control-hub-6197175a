import { apiFetch } from './api';
import type { Product } from '@/types/erp';

// ── Converter DB → TypeScript ─────────────────────────────────────────
const supabaseToProduct = (data: any): Product => ({
    id: data.id,
    sku: data.sku,
    name: data.name,
    description: data.description || '',
    category: data.category || 'Geral',
    unitPrice: data.unit_price ? Number(data.unit_price) : 0,
    costPrice: data.cost_price ? Number(data.cost_price) : 0,
    stockQuantity: data.stock_quantity ? Number(data.stock_quantity) : 0,
    minStock: data.min_stock ? Number(data.min_stock) : 0,
    unit: data.unit || 'un',
    supplier: data.supplier || '',
    status: data.status || 'ativo',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

// ── Converter TypeScript → DB ─────────────────────────────────────────
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

// ── Buscar todos os produtos ──────
export const fetchProducts = async (): Promise<Product[]> => {
    try {
        console.log('[Products] 📝 Buscando produtos via API local...');
        const data = await apiFetch('/products');
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
        console.log('[Products] 📝 Criando novo produto local:', product.name);
        const payload = productToSupabase(product);
        const data = await apiFetch('/products', {
            method: 'POST',
            body: payload,
        });

        if (!data) {
            throw new Error('A API não retornou o produto criado.');
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
        console.log('[Products] 📝 Atualizando produto local:', product.id);
        const payload = productToSupabase(product);
        const data = await apiFetch(`/products/${product.id}`, {
            method: 'PUT',
            body: payload,
        });

        if (!data) {
            throw new Error('A API não retornou o produto atualizado.');
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
        console.log('[Products] 🗑️ Deletando produto local:', productId);
        await apiFetch(`/products/${productId}`, {
            method: 'DELETE',
        });
        console.log('[Products] ✅ Produto deletado:', productId);
        return true;
    } catch (err: any) {
        console.error('[Products] ❌ Erro ao deletar produto:', err.message);
        throw err;
    }
};
