import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import {
    Package, Plus, Search, Edit2, Trash2, X, Archive,
    Layers, DollarSign, Tag, Info
} from 'lucide-react';
import type { Product } from '@/types/erp';

const CATEGORIES = ['Geral', 'Eletrônico Vendedor', 'Outros'];
const UNITS = ['un', 'cx', 'pc', 'kg', 'mt', 'lt', 'pct'];

const emptyProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
    sku: '',
    name: '',
    description: '',
    category: 'Geral',
    unitPrice: 0,
    costPrice: 0,
    stockQuantity: 0,
    minStock: 0,
    unit: 'un',
    supplier: '',
    status: 'ativo',
};

const ProdutosPage: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useERP();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('todos');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form, setForm] = useState(emptyProduct);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');
    const [savingProduct, setSavingProduct] = useState(false);

    // Filtering
    const filtered = products.filter(p => {
        if (p.category === 'Carenagem' && user?.email !== 'higorfeerreira9@gmail.com') {
            return false;
        }
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'todos' || p.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    const openCreate = () => {
        setEditingProduct(null);
        setForm(emptyProduct);
        setShowModal(true);
    };

    const openEdit = (p: Product) => {
        setEditingProduct(p);
        setForm({
            sku: p.sku,
            name: p.name,
            description: p.description,
            category: p.category,
            unitPrice: p.unitPrice,
            costPrice: p.costPrice,
            stockQuantity: p.stockQuantity,
            minStock: p.minStock,
            unit: p.unit,
            supplier: p.supplier,
            status: p.status,
        });
        setShowModal(true);
    };

    const handleSave = () => {
        setSaveError('');
        if (!form.name.trim()) { setSaveError('Nome do produto é obrigatório'); return; }
        if (!form.sku.trim()) { setSaveError('SKU é obrigatório'); return; }
        if (!editingProduct && products.some(p => p.sku.toUpperCase() === form.sku.toUpperCase())) {
            setSaveError('SKU já existe na base de dados');
            return;
        }

        setSavingProduct(true);
        const now = new Date().toISOString();

        try {
            if (editingProduct) {
                updateProduct({
                    ...editingProduct,
                    ...form,
                    updatedAt: now,
                });
            } else {
                addProduct({
                    id: crypto.randomUUID(),
                    ...form,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            setShowModal(false);
            setForm(emptyProduct);
            setEditingProduct(null);
        } catch (err: any) {
            setSaveError(err?.message || 'Erro ao salvar produto');
        } finally {
            setSavingProduct(false);
        }
    };

    const handleDelete = (id: string) => {
        deleteProduct(id);
        setDeleteConfirm(null);
    };

    const usedCategories = [...new Set([...CATEGORIES, ...products.map(p => p.category)])];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-header">Cadastro de Produtos</h1>
                    <p className="page-subtitle">Gerencie o catálogo de produtos do sistema</p>
                </div>
                <button onClick={openCreate} className="btn-modern bg-gradient-to-r from-gestor to-gestor/80 text-primary-foreground">
                    <Plus className="w-4 h-4" /> Novo Produto
                </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input type="text" placeholder="Buscar por nome ou SKU..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-modern py-2.5 w-auto min-w-[140px]">
                    <option value="todos">Todas Categorias</option>
                    {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(product => (
                    <div key={product.id} className="card-section p-5 hover:shadow-lg transition-all border-border/40 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gestor/15 to-gestor/5 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gestor" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-foreground truncate text-sm">{product.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(product)} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setDeleteConfirm(product.id)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Categoria</span>
                                <span className="font-semibold text-foreground">{product.category}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Preço Venda</span>
                                <span className="font-extrabold text-foreground">{formatCurrency(product.unitPrice)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Custo Unit.</span>
                                <span className="text-muted-foreground">{formatCurrency(product.costPrice)}</span>
                            </div>
                        </div>

                        {deleteConfirm === product.id && (
                            <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-4 text-center rounded-2xl animate-fade-in z-10">
                                <p className="text-sm font-bold text-foreground mb-4">Deseja excluir este produto?</p>
                                <div className="flex gap-2 w-full">
                                    <button onClick={() => handleDelete(product.id)} className="btn-modern bg-destructive text-destructive-foreground flex-1 py-2">Confirmar</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="btn-modern bg-muted text-foreground flex-1 py-2">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="sticky top-0 bg-card border-b border-border/40 px-6 py-4 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-extrabold text-foreground">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Preencha os dados do catálogo</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">SKU *</label>
                                    <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} className="input-modern font-mono" placeholder="PROD-001" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Nome *</label>
                                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-modern" placeholder="Nome do produto" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Descrição</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-modern min-h-[60px] resize-none text-sm" placeholder="Descrição opcional..." />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Categoria</label>
                                    <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern" list="cat-list" />
                                    <datalist id="cat-list">{usedCategories.map(c => <option key={c} value={c} />)}</datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Unidade</label>
                                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input-modern">
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Custo (R$)</label>
                                    <input type="number" step="0.01" value={form.costPrice || ''} onChange={e => setForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} className="input-modern font-bold text-success" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Venda (R$)</label>
                                    <input type="number" step="0.01" value={form.unitPrice || ''} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} className="input-modern font-bold text-primary" />
                                </div>
                            </div>

                            {saveError && <p className="text-[10px] font-bold text-destructive bg-destructive/10 p-2 rounded-lg">{saveError}</p>}
                        </div>

                        <div className="sticky bottom-0 bg-card border-t border-border/40 px-6 py-4 flex justify-end gap-2 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)} className="btn-modern bg-muted text-foreground">Cancelar</button>
                            <button onClick={handleSave} disabled={savingProduct} className="btn-modern bg-primary text-primary-foreground min-w-[120px]">
                                {savingProduct ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProdutosPage;
