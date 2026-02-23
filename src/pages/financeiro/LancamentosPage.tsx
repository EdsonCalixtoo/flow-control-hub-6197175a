import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { TrendingUp, TrendingDown, Plus, Search, X, Filter } from 'lucide-react';
import type { FinancialEntry } from '@/types/erp';

const CATEGORIES_RECEITA = ['Vendas', 'Serviços', 'Comissão', 'Outros'];
const CATEGORIES_DESPESA = ['Infraestrutura', 'Pessoal', 'Marketing', 'Fornecedores', 'Impostos', 'Outros'];

const emptyForm = { type: 'receita' as 'receita' | 'despesa', description: '', amount: '', category: 'Vendas', date: new Date().toISOString().slice(0, 10), status: 'pendente' as 'pago' | 'pendente' };

const LancamentosPage: React.FC = () => {
  const { financialEntries, addFinancialEntry } = useERP();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const totalReceitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const totalDespesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);
  const totalPendente = financialEntries.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0);

  const filtered = financialEntries.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'todos' || e.type === typeFilter;
    const matchStatus = statusFilter === 'todos' || e.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleSave = () => {
    if (!form.description || !form.amount) return;
    addFinancialEntry({
      id: crypto.randomUUID(),
      type: form.type,
      description: form.description,
      amount: parseFloat(String(form.amount)),
      category: form.category,
      date: form.date,
      status: form.status,
    });
    setShowModal(false);
    setForm(emptyForm);
  };

  const categories = form.type === 'receita' ? CATEGORIES_RECEITA : CATEGORIES_DESPESA;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Lançamentos</h1>
          <p className="page-subtitle">Controle de receitas e despesas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-modern bg-gradient-to-r from-financeiro to-financeiro/80 text-primary-foreground">
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Receitas</p>
              <p className="text-xl font-extrabold text-success">{formatCurrency(totalReceitas)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Despesas</p>
              <p className="text-xl font-extrabold text-destructive">{formatCurrency(totalDespesas)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Pendentes</p>
              <p className="text-xl font-extrabold text-warning">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Buscar lançamento ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
        </div>
        <div className="flex gap-1.5">
          {([['todos', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTypeFilter(v)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${typeFilter === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {([['todos', 'Todos'], ['pago', 'Pago'], ['pendente', 'Pendente']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${statusFilter === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card-section divide-y divide-border/30">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">Nenhum lançamento encontrado</div>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className="px-5 py-4 flex items-center justify-between hover:bg-primary/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'receita' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {entry.type === 'receita'
                  ? <TrendingUp className="w-4 h-4 text-success" />
                  : <TrendingDown className="w-4 h-4 text-destructive" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{entry.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.category} • {new Date(entry.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className={`text-sm font-bold ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                {entry.type === 'receita' ? '+' : '−'}{formatCurrency(entry.amount)}
              </span>
              <span className={`block mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${entry.status === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {entry.status === 'pago' ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <h2 className="text-lg font-extrabold text-foreground">Novo Lançamento</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {(['receita', 'despesa'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: t === 'receita' ? 'Vendas' : 'Infraestrutura' }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${form.type === t ? (t === 'receita' ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30') : 'bg-muted text-muted-foreground'}`}>
                      {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Descrição</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-modern" placeholder="Ex: Pagamento PED-010" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input-modern" placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-modern" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'pago' | 'pendente' }))} className="input-modern">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/40 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-modern bg-muted text-foreground shadow-none text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={!form.description || !form.amount} className="btn-modern bg-gradient-to-r from-financeiro to-financeiro/80 text-primary-foreground text-sm disabled:opacity-50">
                <Plus className="w-4 h-4" /> Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LancamentosPage;
