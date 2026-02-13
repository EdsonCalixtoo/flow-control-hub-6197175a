import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { FileText, Plus, Send, Eye, ArrowLeft, Search, X, Trash2 } from 'lucide-react';
import type { Order, QuoteItem } from '@/types/erp';

const OrcamentosPage: React.FC = () => {
  const { orders, clients, updateOrderStatus, addOrder } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Form state for new order
  const [newClientId, setNewClientId] = useState('');
  const [newItems, setNewItems] = useState<{ product: string; quantity: number; unitPrice: number }[]>([{ product: '', quantity: 1, unitPrice: 0 }]);
  const [newNotes, setNewNotes] = useState('');

  const filtered = orders.filter(o =>
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const enviarFinanceiro = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_financeiro');
    setSelectedOrder(null);
  };

  const addItem = () => setNewItems(prev => [...prev, { product: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setNewItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => {
    setNewItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const calcTotal = () => newItems.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);

  const handleCreateOrder = () => {
    const client = clients.find(c => c.id === newClientId);
    if (!client || newItems.some(i => !i.product)) return;

    const subtotal = calcTotal();
    const taxes = subtotal * 0.1;
    const order: Order = {
      id: `o${Date.now()}`,
      number: `PED-${String(orders.length + 1).padStart(3, '0')}`,
      clientId: client.id,
      clientName: client.name,
      sellerId: '1',
      sellerName: 'Carlos Silva',
      items: newItems.map((item, i) => ({
        id: `ni${i}`,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        discountType: 'percent' as const,
        total: item.quantity * item.unitPrice,
      })),
      subtotal,
      taxes,
      total: subtotal + taxes,
      status: 'rascunho',
      notes: newNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addOrder(order);
    setShowCreate(false);
    setNewClientId('');
    setNewItems([{ product: '', quantity: 1, unitPrice: 0 }]);
    setNewNotes('');
  };

  if (showCreate) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Novo Orçamento</h1>
            <p className="page-subtitle">Preencha os dados do orçamento</p>
          </div>
          <button onClick={() => setShowCreate(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Cancelar
          </button>
        </div>

        <div className="card-section p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="input-modern">
              <option value="">Selecione um cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Produtos</label>
              <button onClick={addItem} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar item
              </button>
            </div>
            {newItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="col-span-5">
                  <label className="text-[10px] text-muted-foreground block mb-1">Produto</label>
                  <input type="text" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} placeholder="Nome do produto" className="input-modern py-2 text-xs" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground block mb-1">Qtd</label>
                  <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="input-modern py-2 text-xs" min={1} />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-muted-foreground block mb-1">Valor Unit.</label>
                  <input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} className="input-modern py-2 text-xs" min={0} step={0.01} />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  {newItems.length > 1 && (
                    <button onClick={() => removeItem(i)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive inline-flex items-center justify-center hover:bg-destructive/20 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
            <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} className="input-modern min-h-[60px] resize-none" rows={2} placeholder="Observações..." />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div className="text-sm text-muted-foreground">
              Subtotal: {formatCurrency(calcTotal())} • Impostos: {formatCurrency(calcTotal() * 0.1)}
            </div>
            <div className="text-xl font-extrabold text-foreground">{formatCurrency(calcTotal() * 1.1)}</div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCreateOrder} className="btn-primary" disabled={!newClientId || newItems.some(i => !i.product)}>
              <FileText className="w-4 h-4" /> Criar Orçamento
            </button>
            <button onClick={() => { handleCreateOrder(); }} className="btn-modern bg-vendedor/10 text-vendedor shadow-none hover:bg-vendedor/20">
              <Send className="w-4 h-4" /> Criar e Enviar ao Financeiro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // selectedOrder detail view
  if (selectedOrder) {
    return (
      <div className="card-section p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground text-lg">{selectedOrder.number}</h2>
          <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Cliente</span><span className="font-semibold text-foreground">{selectedOrder.clientName}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Status</span><StatusBadge status={selectedOrder.status} /></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Data</span><span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Total</span><span className="font-extrabold text-foreground text-lg">{formatCurrency(selectedOrder.total)}</span></div>
        </div>
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="modern-table">
            <thead><tr><th>Produto</th><th className="text-right">Qtd</th><th className="text-right hidden sm:table-cell">Unit.</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {selectedOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="text-foreground font-medium">{item.product}</td>
                  <td className="text-right text-foreground">{item.quantity}</td>
                  <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="text-sm text-muted-foreground">Subtotal: {formatCurrency(selectedOrder.subtotal)} • Impostos: {formatCurrency(selectedOrder.taxes)}</div>
          <div className="text-xl font-extrabold text-foreground">{formatCurrency(selectedOrder.total)}</div>
        </div>
        {(selectedOrder.status === 'rascunho' || selectedOrder.status === 'enviado' || selectedOrder.status === 'aprovado_cliente') && (
          <button onClick={() => enviarFinanceiro(selectedOrder.id)} className="btn-modern bg-gradient-to-r from-vendedor to-vendedor/80 text-primary-foreground">
            <Send className="w-4 h-4" /> Enviar para Financeiro
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Orçamentos</h1>
          <p className="page-subtitle">Gerencie seus orçamentos e vendas</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input type="text" placeholder="Buscar pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-11" />
      </div>

      <div className="card-section">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="hidden md:table-cell text-right">Valor</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td className="font-bold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td className="text-right font-semibold text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setSelectedOrder(order)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {(order.status === 'rascunho' || order.status === 'enviado') && (
                        <button onClick={() => enviarFinanceiro(order.id)} className="w-8 h-8 rounded-lg bg-vendedor/10 text-vendedor hover:bg-vendedor/20 inline-flex items-center justify-center transition-colors" title="Enviar ao Financeiro">
                          <Send className="w-3.5 h-3.5" />
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
    </div>
  );
};

export default OrcamentosPage;
