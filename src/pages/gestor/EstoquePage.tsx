import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import {
    Package, Plus, Search, Edit2, Trash2, X, AlertTriangle,
    ArrowUpDown, Box, TrendingDown, TrendingUp, Archive,
    Minus, PlusCircle, CheckCircle, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
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

    // Ajuste Fácil Inline
    const [quickEditId, setQuickEditId] = useState<string | null>(null);
    const [quickEditQty, setQuickEditQty] = useState<number>(0);

    const handleQuickSave = async (p: Product) => {
        if (quickEditQty < 0) return;
        try {
            const status: Product['status'] = quickEditQty === 0 ? 'esgotado' : p.status === 'inativo' ? 'inativo' : 'ativo';
            await updateProduct({
                ...p,
                stockQuantity: quickEditQty,
                status,
                updatedAt: new Date().toISOString().slice(0, 10),
            });
            toast.success(`Estoque de ${p.name} atualizado para ${quickEditQty}.`);
            setQuickEditId(null);
        } catch (error) {
            toast.error('Erro ao salvar nova quantidade.');
        }
    };

    const startQuickEdit = (p: Product) => {
        setQuickEditId(p.id);
        setQuickEditQty(p.stockQuantity);
    };

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
        if (!form.name.trim() || !form.sku.trim()) {
            toast.error('Nome e SKU são campos obrigatórios.');
            return;
        }

        if (!editingProduct && products.some(p => p.sku.toUpperCase() === form.sku.toUpperCase())) {
            toast.error('SKU já existe na base de dados.');
            return;
        }

        const now = new Date().toISOString().slice(0, 10);
        const status: Product['status'] = form.stockQuantity === 0 ? 'esgotado' : form.status === 'inativo' ? 'inativo' : 'ativo';

        try {
            if (editingProduct) {
                updateProduct({
                    ...editingProduct,
                    ...form,
                    status,
                    updatedAt: now,
                });
                toast.success('Produto atualizado com sucesso!');
            } else {
                addProduct({
                    id: crypto.randomUUID(),
                    ...form,
                    status,
                    createdAt: now,
                    updatedAt: now,
                });
                toast.success('Novo produto adicionado ao catálogo!');
            }
            setShowForm(false);
            setForm(emptyProduct);
            setEditingProduct(null);
        } catch (err) {
            toast.error((err as Error)?.message || 'Falha ao salvar produto.');
        }
    };

    const handleDelete = (id: string) => {
        deleteProduct(id);
        setDeleteConfirm(null);
        toast.info('Produto removido do sistema.');
    };

    const usedCategories = [...new Set([...CATEGORIES, ...products.map(p => p.category)])];

    return (
        <div className="space-y-10 pb-12 animate-fade-in">
            {/* Header Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 dark:bg-slate-900 border border-white/5 p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                        <Box className="w-10 h-10 text-cyan-400" />
                        Polo de Estoque
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">Gestão inteligente e ajuste ultra-rápido de produtos.</p>
                </div>
                
                <button onClick={() => showForm ? setShowForm(false) : openCreate()} className="relative z-10 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-blue-900/40 px-8 py-4 rounded-2xl font-black uppercase tracking-wider flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
                    {showForm ? <RotateCcw className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                    {showForm ? 'Voltar ao Estoque' : 'Adicionar Item'}
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-premium p-6 rounded-[2rem] border-border/40 hover:-translate-y-1 transition-transform cursor-default">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                        <Package className="w-7 h-7" />
                    </div>
                    <p className="text-3xl font-black text-foreground">{totalProducts}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Variedades</p>
                </div>
                <div className="glass-premium p-6 rounded-[2rem] border-border/40 hover:-translate-y-1 transition-transform cursor-default">
                    <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center mb-4">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <p className="text-3xl font-black text-foreground">{formatCurrency(totalValue)}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Giro Avaliado</p>
                </div>
                <div className="glass-premium p-6 rounded-[2rem] border-border/40 hover:-translate-y-1 transition-transform cursor-default">
                    <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mb-4">
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <p className="text-3xl font-black text-foreground">{lowStockCount}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Alerta de Saída</p>
                </div>
                <div className="glass-premium p-6 rounded-[2rem] border-border/40 hover:-translate-y-1 transition-transform cursor-default">
                    <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                        <Archive className="w-7 h-7" />
                    </div>
                    <p className="text-3xl font-black text-foreground">{outOfStockCount}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Zerados (Pausa)</p>
                </div>
            </div>

            {/* Main Form */}
            {showForm && (
                <div className="glass-premium border-primary/20 rounded-[2.5rem] p-8 animate-scale-in">
                    <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border/40">
                        <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                            {editingProduct ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-widest">{editingProduct ? 'Ajustes no Produto' : 'Ficha de Novo Produto'}</h2>
                            <p className="text-sm font-medium text-muted-foreground">Preencha os atributos vitais do inventário</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Código SKU</label>
                            <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} className="input-modern h-14 !rounded-2xl" placeholder="Ex: MOLA-002" />
                        </div>
                        <div className="md:col-span-9 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nomenclatura Completa</label>
                            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-modern h-14 !rounded-2xl" placeholder="Nome oficial de venda" />
                        </div>
                        <div className="md:col-span-12 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Especificação Técnica (Opcional)</label>
                            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-modern h-14 !rounded-2xl bg-muted/30" placeholder="Use para definir variações ou detalhes importantes" />
                        </div>
                        
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Classe/Categoria</label>
                            <input type="text" list="cat-list" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern h-14 !rounded-2xl" />
                            <datalist id="cat-list">{usedCategories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Medida</label>
                            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="input-modern h-14 !rounded-2xl">
                                {UNITS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Valor Aquisição</label>
                            <input type="number" step="0.01" value={form.costPrice || ''} onChange={e => setForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} className="input-modern h-14 !rounded-2xl" placeholder="R$ 0,00" />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Preço Praticado (Venda)</label>
                            <input type="number" step="0.01" value={form.unitPrice || ''} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} className="input-modern h-14 !rounded-2xl border-success/30 bg-success/5 focus:bg-background" placeholder="R$ 0,00" />
                        </div>

                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground text-primary">Saldo Entrada</label>
                            <input type="number" value={form.stockQuantity || ''} onChange={e => setForm(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} className="input-modern h-14 !rounded-2xl border-primary/30 bg-primary/5 focus:bg-background text-lg font-bold" />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground text-warning">Alerta Mínimo</label>
                            <input type="number" value={form.minStock || ''} onChange={e => setForm(f => ({ ...f, minStock: parseInt(e.target.value) || 0 }))} className="input-modern h-14 !rounded-2xl" />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Produtor/Marca</label>
                            <input type="text" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} className="input-modern h-14 !rounded-2xl" />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-10 pt-6 border-t border-border/40">
                        <button onClick={handleSave} className="flex-1 md:flex-none btn-primary !h-14 !rounded-[1.25rem] !px-12 text-base shadow-xl shadow-primary/20">
                            {editingProduct ? 'Gravar Alterações' : 'Implantar no Catálogo'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="h-14 px-8 rounded-[1.25rem] font-bold text-muted-foreground hover:bg-muted/50 transition-colors">
                            Descartar
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Filters and Search */}
            {!showForm && (
                <div className="glass-premium p-4 md:p-6 rounded-[2rem] flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                        <input type="text" placeholder="Localizar item no acervo (SKU, Nome, Fornecedor)..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-12 h-14 !rounded-2xl w-full text-sm font-medium bg-muted/50 focus:bg-background" />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                        <div className="flex items-center gap-1 bg-muted/40 p-1.5 rounded-2xl">
                            {['todos', 'ok', 'baixo', 'esgotado'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setStatusFilter(tab)}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === tab ? 'bg-white dark:bg-slate-800 text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {tab === 'ok' ? 'Disponível' : tab === 'baixo' ? 'Crítico' : tab === 'esgotado' ? 'Falta' : 'Listar Todos'}
                                </button>
                            ))}
                        </div>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-modern h-[46px] !rounded-2xl w-auto bg-muted/40 border-transparent text-sm font-bold ml-2">
                            <option value="todos">Seções (Mix)</option>
                            {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Modern Data Grid */}
            {!showForm && sorted.length === 0 ? (
                <div className="glass-premium p-16 text-center border-dashed border-2 rounded-[3.5rem] mt-10">
                    <div className="w-24 h-24 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-2xl font-black text-foreground mb-2">Acervo Vazio ou Nada Encontrado</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">Não localizamos nenhum SKUs correspondentes ao seu filtro atual. Limpe a busca ou crie um novo item.</p>
                </div>
            ) : (
                !showForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
                    {sorted.map(product => {
                        const isEsgotado = product.stockQuantity === 0;
                        const isBaixo = product.stockQuantity > 0 && product.stockQuantity <= product.minStock;
                        const isQuickEditing = quickEditId === product.id;

                        return (
                            <div key={product.id} className={`group relative glass-card !p-0 rounded-[2rem] border-2 transition-all duration-300 hover:shadow-2xl overflow-hidden flex flex-col h-full bg-background/50 ${
                                isEsgotado ? 'border-destructive/30 hover:border-destructive/50 shadow-destructive/[0.05]' : 
                                isBaixo ? 'border-warning/30 hover:border-warning/50 shadow-warning/[0.05]' : 
                                'border-transparent hover:border-primary/20'
                            }`}>
                                {/* Card Status Indicator Top Border */}
                                <div className={`h-1.5 w-full ${isEsgotado ? 'bg-destructive' : isBaixo ? 'bg-warning' : 'bg-primary/20 group-hover:bg-primary/60 transition-colors'}`} />
                                
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-mono font-black tracking-wider text-muted-foreground shrink-0">{product.sku}</span>
                                                <span className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{product.category}</span>
                                            </div>
                                            <h3 className="text-base font-black text-foreground leading-tight line-clamp-2" title={product.name}>{product.name}</h3>
                                        </div>
                                        {/* Actions Menu */}
                                        <div className="flex gap-1 shrink-0 bg-muted/20 p-1 rounded-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all origin-top-right">
                                            <button onClick={() => openEdit(product)} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary hover:scale-110 transition-transform">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            {deleteConfirm === product.id ? (
                                                <div className="flex gap-1 absolute right-0 -top-1 bg-destructive/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl z-20">
                                                    <button onClick={() => handleDelete(product.id)} className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white text-white hover:text-destructive text-[11px] font-black uppercase transition-colors">Excluir</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-xl bg-black/20 text-white hover:bg-black/40 text-[11px] font-black uppercase transition-colors">Não</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(product.id)} className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-destructive hover:scale-110 transition-transform">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Mid Details */}
                                    <div className="mt-auto pt-4 border-t border-border/40 space-y-4">
                                        {/* Quick Edit Quantities System */}
                                        <div className="bg-muted/30 rounded-2xl p-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Fisico</p>
                                                {isQuickEditing ? (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <button disabled={quickEditQty <= 0} onClick={() => setQuickEditQty(q => Math.max(0, q - 1))} className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-colors disabled:opacity-30">
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <input 
                                                            type="number" 
                                                            value={quickEditQty} 
                                                            onChange={e => setQuickEditQty(parseInt(e.target.value) || 0)} 
                                                            className="w-16 h-8 text-center text-lg font-black bg-background border-none rounded-lg p-0 focus:ring-2 focus:ring-primary"
                                                        />
                                                        <button onClick={() => setQuickEditQty(q => q + 1)} className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success hover:text-white transition-colors">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                                        <span className={`text-4xl font-black ${isEsgotado ? 'text-destructive' : isBaixo ? 'text-warning' : 'text-foreground'}`}>{product.stockQuantity}</span>
                                                        <span className="text-xs font-bold text-muted-foreground">{product.unit}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* The button to trigger or save quick edit */}
                                            {isQuickEditing ? (
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleQuickSave(product)} className="w-10 h-10 rounded-[14px] bg-success text-white flex items-center justify-center shadow-lg shadow-success/30 hover:scale-110 transition-transform">
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => setQuickEditId(null)} className="text-[9px] font-bold text-muted-foreground hover:text-foreground text-center">Cancelar</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => startQuickEdit(product)} className="w-10 h-10 rounded-[14px] bg-white dark:bg-slate-800 shadow-md border border-border/50 text-foreground flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors tooltip group/btn relative">
                                                    <Edit2 className="w-4 h-4" />
                                                    <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Ajuste Rápido</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between px-1">
                                            <div>
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Venda</p>
                                                <p className="text-sm font-black text-success">{formatCurrency(product.unitPrice)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Mínimo</p>
                                                <p className="text-sm font-black text-muted-foreground">{product.minStock} {product.unit}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )
            )}
        </div>
    );
};

export default EstoquePage;

