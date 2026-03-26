import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import {
    Package, Plus, Search, Edit2, Trash2, X, AlertTriangle,
    ArrowUpDown, Box, TrendingDown, TrendingUp, Archive
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

const EstoquePage: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useERP();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [sortField, setSortField] = useState<'name' | 'stockQuantity' | 'unitPrice'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form, setForm] = useState(emptyProduct);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');
    const [savingProduct, setSavingProduct] = useState(false);

    // Stats
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);
    const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

    // Filtering
    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            p.supplier.toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'todos' || p.category === categoryFilter;
        const matchStatus = statusFilter === 'todos' ||
            (statusFilter === 'baixo' && p.stockQuantity > 0 && p.stockQuantity <= p.minStock) ||
            (statusFilter === 'esgotado' && p.stockQuantity === 0) ||
            (statusFilter === 'ok' && p.stockQuantity > p.minStock);
        return matchSearch && matchCategory && matchStatus;
    });

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
        const mult = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'name') return mult * a.name.localeCompare(b.name);
        return mult * ((a[sortField] as number) - (b[sortField] as number));
    });

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const openCreate = () => {
        setEditingProduct(null);
        setForm(emptyProduct);
        setShowForm(true);
        // Scroll to form if needed
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = () => {
        setSaveError('');

        // Validação
        if (!form.name.trim()) {
            setSaveError('Nome do produto é obrigatório');
            return;
        }
        if (!form.sku.trim()) {
            setSaveError('SKU é obrigatório');
            return;
        }

        // Verificar se SKU já existe (apenas para novos produtos)
        if (!editingProduct && products.some(p => p.sku.toUpperCase() === form.sku.toUpperCase())) {
            setSaveError('SKU já existe na base de dados');
            return;
        }

        setSavingProduct(true);
        const now = new Date().toISOString().slice(0, 10);
        const status: Product['status'] = form.stockQuantity === 0 ? 'esgotado' : form.status === 'inativo' ? 'inativo' : 'ativo';

        try {
            if (editingProduct) {
                console.log('[EstoquePage] Atualizando produto:', editingProduct.id);
                updateProduct({
                    ...editingProduct,
                    ...form,
                    status,
                    updatedAt: now,
                });
            } else {
                console.log('[EstoquePage] Criando novo produto:', form.name);
                addProduct({
                    id: crypto.randomUUID(),
                    ...form,
                    status,
                    createdAt: now,
                    updatedAt: now,
                });
            }
            setShowForm(false);
            setForm(emptyProduct);
            setEditingProduct(null);
            setSavingProduct(false);
        } catch (err: any) {
            console.error('[EstoquePage] Erro ao salvar:', err);
            setSaveError(err?.message || 'Erro ao salvar produto');
            setSavingProduct(false);
        }
    };

    const handleDelete = (id: string) => {
        deleteProduct(id);
        setDeleteConfirm(null);
    };

    const getStockBadge = (p: Product) => {
        if (p.stockQuantity === 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive"><AlertTriangle className="w-3 h-3" /> Esgotado</span>;
        if (p.stockQuantity <= p.minStock) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning"><TrendingDown className="w-3 h-3" /> Estoque Baixo</span>;
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success"><TrendingUp className="w-3 h-3" /> OK</span>;
    };

    const usedCategories = [...new Set([...CATEGORIES, ...products.map(p => p.category)])];


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-header">Estoque</h1>
                    <p className="page-subtitle">Gerencie seus produtos e controle de estoque</p>
                </div>
                <button onClick={() => showForm ? setShowForm(false) : openCreate()} className={`btn-modern ${showForm ? 'bg-muted text-foreground' : 'bg-gradient-to-r from-gestor to-gestor/80 text-primary-foreground'}`}>
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'Cancelar' : 'Novo Produto'}
                </button>
            </div>

            {/* Form Inline (Em vez de Modal) - MOVIDO PARA O TOPO */}
            {showForm && (
                <div className="card-section p-0 overflow-hidden border-2 border-gestor/20 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-gestor/5 border-b border-gestor/10 px-6 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-extrabold text-foreground">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{editingProduct ? 'Atualize os dados e clique em salvar' : 'Preencha os campos abaixo para cadastrar'}</p>
                        </div>
                        <button onClick={() => { setShowForm(false); setEditingProduct(null); }} className="w-7 h-7 rounded-lg bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">SKU *</label>
                                <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} className="input-modern font-mono text-sm" placeholder="SKU-001" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Nome do Produto *</label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-modern text-sm" placeholder="Ex: Kit Sprinter com Sensor" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Descrição</label>
                            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-modern text-sm" placeholder="Breve descrição do produto..." />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Categoria</label>
                                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern text-sm" list="category-list" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Unidade</label>
                                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input-modern text-sm">
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Custo (R$)</label>
                                <input type="number" step="0.01" value={form.costPrice || ''} onChange={e => setForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} className="input-modern text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Venda (R$)</label>
                                <input type="number" step="0.01" value={form.unitPrice || ''} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} className="input-modern text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Qtd Atual</label>
                                <input type="number" value={form.stockQuantity || ''} onChange={e => setForm(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} className="input-modern text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Estoque Mín</label>
                                <input type="number" value={form.minStock || ''} onChange={e => setForm(f => ({ ...f, minStock: parseInt(e.target.value) || 0 }))} className="input-modern text-sm" />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5 ml-1">Fornecedor</label>
                                <input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="input-modern text-sm" />
                            </div>
                        </div>

                        {saveError && (
                            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                                <p className="text-[11px] text-destructive font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {saveError}
                                </p>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-3 border-t border-border/40">
                            <button onClick={() => { setShowForm(false); setEditingProduct(null); setSaveError(''); }} className="px-5 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={savingProduct || !form.name.trim() || !form.sku.trim()} className="px-6 py-2 rounded-xl bg-gradient-to-r from-gestor to-gestor/80 text-primary-foreground text-xs font-bold shadow-lg shadow-gestor/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                {savingProduct ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gestor/20 to-gestor/5 flex items-center justify-center">
                            <Box className="w-5 h-5 text-gestor" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground font-medium">Total Produtos</p>
                            <p className="text-xl font-extrabold text-foreground">{totalProducts}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground font-medium">Valor em Estoque</p>
                            <p className="text-xl font-extrabold text-foreground">{formatCurrency(totalValue)}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground font-medium">Estoque Baixo</p>
                            <p className="text-xl font-extrabold text-warning">{lowStockCount}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground font-medium">Esgotados</p>
                            <p className="text-xl font-extrabold text-destructive">{outOfStockCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input type="text" placeholder="Buscar por nome, SKU ou fornecedor..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
                </div>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-modern py-2.5 w-auto min-w-[140px]">
                    <option value="todos">Todas Categorias</option>
                    {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-1.5">
                    {[
                        { value: 'todos', label: 'Todos' },
                        { value: 'ok', label: 'Em Estoque' },
                        { value: 'baixo', label: 'Baixo' },
                        { value: 'esgotado', label: 'Esgotado' },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Table */}
            {sorted.length === 0 ? (
                <div className="card-section p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Archive className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-bold text-lg">Nenhum produto encontrado</p>
                    <p className="text-sm text-muted-foreground mt-1">Cadastre novos produtos para começar</p>
                </div>
            ) : (
                <div className="card-section overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1">Produto <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                                    </th>
                                    <th>SKU</th>
                                    <th>Categoria</th>
                                    <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('stockQuantity')}>
                                        <div className="flex items-center justify-end gap-1">Estoque <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                                    </th>
                                    <th>Status</th>
                                    <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('unitPrice')}>
                                        <div className="flex items-center justify-end gap-1">Preço Venda <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                                    </th>
                                    <th className="text-right">Custo</th>
                                    <th>Fornecedor</th>
                                    <th className="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(product => (
                                    <tr key={product.id} className={product.stockQuantity === 0 ? 'bg-destructive/[0.03]' : product.stockQuantity <= product.minStock ? 'bg-warning/[0.03]' : ''}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gestor/15 to-gestor/5 flex items-center justify-center shrink-0">
                                                    <Package className="w-4 h-4 text-gestor" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground text-sm">{product.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{product.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{product.sku}</span></td>
                                        <td><span className="text-xs">{product.category}</span></td>
                                        <td className="text-right">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-bold text-sm">{product.stockQuantity} <span className="text-muted-foreground font-normal">{product.unit}</span></span>
                                                <span className="text-[10px] text-muted-foreground">Mín: {product.minStock}</span>
                                            </div>
                                        </td>
                                        <td>{getStockBadge(product)}</td>
                                        <td className="text-right font-semibold text-sm">{formatCurrency(product.unitPrice)}</td>
                                        <td className="text-right text-sm text-muted-foreground">{formatCurrency(product.costPrice)}</td>
                                        <td className="text-xs text-muted-foreground">{product.supplier}</td>
                                        <td>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEdit(product)} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" title="Editar">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {deleteConfirm === product.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleDelete(product.id)} className="w-8 h-8 rounded-lg bg-destructive flex items-center justify-center text-destructive-foreground text-[10px] font-bold" title="Confirmar">Sim</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold" title="Cancelar">Não</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(product.id)} className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors" title="Excluir">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EstoquePage;
