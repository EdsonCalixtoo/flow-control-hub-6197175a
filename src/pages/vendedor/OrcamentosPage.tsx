import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { FileText, Plus, Send, Eye, ArrowLeft, Search, X, Trash2, History, MessageCircle, Edit2, Check } from 'lucide-react';
import { getNextOrderNumber } from '@/lib/supabaseService';
import type { Order, QuoteItem } from '@/types/erp';
import { useLocation } from 'react-router-dom';

// Status que bloqueiam a edição do orçamento
const STATUS_BLOQUEIAM_EDICAO = ['aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
  'aguardando_gestor', 'aprovado_gestor', 'rejeitado_gestor',
  'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'];

const OrcamentosPage: React.FC = () => {
  const { orders, addOrder, updateOrderStatus, editOrderFull, clients, products } = useERP();
  const { user } = useAuth();
  const location = useLocation();

  // Se navegado desde a ficha do cliente, abre o form já com cliente pré-selecionado
  const preSelectedClientId: string = (location.state as any)?.clientId ?? '';

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(() => !!preSelectedClientId);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [comprovanteAttached, setComprovanteAttached] = useState('');
  const [formError, setFormError] = useState('');

  // Isolamento: vendedor vê apenas seus pedidos
  const myOrders = orders.filter(o =>
    user?.role !== 'vendedor' || o.sellerId === user.id
  );

  // ✅ Isolamento: vendedor vê apenas SEUS clientes no dropdown de orçamento
  const myClients = clients.filter(c =>
    user?.role !== 'vendedor' || (c as any).createdBy === user.id
  );

  // Form state for new/edit order
  const [newClientId, setNewClientId] = useState(preSelectedClientId);
  const [newItems, setNewItems] = useState<{ product: string; description: string; quantity: number; unitPrice: number }[]>([{ product: '', description: '', quantity: 1, unitPrice: 0 }]);
  const [newNotes, setNewNotes] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newOrderType, setNewOrderType] = useState<'entrega' | 'instalacao'>('entrega');

  const filtered = myOrders.filter(o =>
    o.number.toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase())
  );

  // Envia para o financeiro — apenas via botão explícito
  const enviarFinanceiro = (orderId: string) => {
    const receipt = comprovanteAttached || selectedOrder?.receiptUrl;
    updateOrderStatus(
      orderId, 'aguardando_financeiro',
      receipt ? { receiptUrl: receipt } : undefined,
      user?.name || 'Vendedor',
      receipt ? 'Enviado para aprovação financeira com comprovante' : 'Enviado para aprovação financeira'
    );
    setSelectedOrder(null);
    setComprovanteAttached('');
  };

  const addItem = () => setNewItems(prev => [...prev, { product: '', description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setNewItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => {
    setNewItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const calcTotal = () => newItems.reduce((s, item) => s + (item.quantity * item.unitPrice), 0);

  // Abre o formulário de edição para um orçamento existente
  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setNewClientId(order.clientId);
    setNewItems(order.items.map(i => ({
      product: i.product,
      description: i.description || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })));
    setNewNotes(order.notes || '');
    setNewObservation(order.observation || '');
    setNewDeliveryDate(order.deliveryDate || '');
    setNewOrderType(order.orderType || 'entrega');
    setFormError('');
  };

  const resetForm = () => {
    setEditingOrder(null);
    setShowCreate(false);
    setNewClientId('');
    setNewItems([{ product: '', description: '', quantity: 1, unitPrice: 0 }]);
    setNewNotes('');
    setNewObservation('');
    setNewDeliveryDate('');
    setNewOrderType('entrega');
    setFormError('');
  };

  const handleCreateOrder = async () => {
    const client = clients.find(c => c.id === newClientId);
    if (!client) { setFormError('Por favor, selecione um cliente.'); return; }
    if (newItems.some(i => !i.product)) { setFormError('Por favor, selecione o produto em todos os itens.'); return; }
    setFormError('');

    const subtotal = calcTotal();
    const now = new Date().toISOString();

    if (editingOrder) {
      // Modo edição
      const updatedOrder: Order = {
        ...editingOrder,
        clientId: client.id,
        clientName: client.name,
        items: newItems.map((item, i) => ({
          id: editingOrder.items[i]?.id || `ni${i}`,
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: editingOrder.items[i]?.discount || 0,
          discountType: editingOrder.items[i]?.discountType || 'percent',
          total: item.quantity * item.unitPrice,
        })),
        subtotal,
        taxes: 0,
        total: subtotal,
        notes: newNotes,
        observation: newObservation,
        deliveryDate: newDeliveryDate || undefined,
        orderType: newOrderType,
        updatedAt: now,
      };
      editOrderFull(updatedOrder);
      resetForm();
      return;
    }

    // Modo criação — pega número ÚNICO do servidor (evita race condition)
    try {
      console.log('[OrcamentosPage] 🔄 Chamando getNextOrderNumber()...');
      const nextNumber = await getNextOrderNumber();
      console.log('[OrcamentosPage] ✅ Número gerado:', nextNumber);
      
      const order: Order = {
        id: crypto.randomUUID(),
        number: nextNumber,
        clientId: client.id,
        clientName: client.name,
        sellerId: user?.id || '1',
        sellerName: user?.name || 'Vendedor',
        items: newItems.map((item, i) => ({
          id: `ni${i}`,
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: 0,
          discountType: 'percent' as const,
          total: item.quantity * item.unitPrice,
        })),
        subtotal,
        taxes: 0,
        total: subtotal,
        status: 'rascunho',    // ✅ SEMPRE começa como rascunho
        notes: newNotes,
        observation: newObservation,
        deliveryDate: newDeliveryDate || undefined,
        orderType: newOrderType,
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ status: 'rascunho', timestamp: now, user: user?.name || 'Vendedor', note: 'Orçamento criado' }],
      };

      console.log('[OrcamentosPage] 📍 Chamando addOrder() com:', order.number, order.id);
      addOrder(order);
      resetForm();
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ ERRO CRÍTICO:', err);
      setFormError(`❌ Erro ao gerar número: ${err?.message || 'Tente novamente'}`);
    }
  };

  const openWhatsApp = (phone: string) =>
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');

  // ── Formulário de criação/edição ────────────────────────────
  if (showCreate || editingOrder) {
    const isEdit = !!editingOrder;
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{isEdit ? '✏️ Editar Orçamento' : 'Novo Orçamento'}</h1>
            <p className="page-subtitle">
              {isEdit ? `Editando ${editingOrder?.number} — Status: ${editingOrder?.status}` : 'Preencha os dados do orçamento'}
            </p>
          </div>
          <button onClick={resetForm} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Cancelar
          </button>
        </div>

        <div className="card-section p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="input-modern">
              <option value="">Selecione um cliente...</option>
              {myClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.consignado ? ' ⭐ Consignado' : ''}</option>)}
            </select>
            {newClientId && clients.find(c => c.id === newClientId)?.consignado && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mt-2">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-xs font-bold text-amber-400">Cliente Consignado</p>
                  <p className="text-[11px] text-amber-400/70">Este cliente opera em regime de consignação. Verifique as condições especiais.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Produtos</label>
              <button onClick={addItem} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar item
              </button>
            </div>
            {newItems.map((item, i) => (
              <div key={i} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="text-[10px] text-muted-foreground block mb-1">Produto</label>
                    {products.length > 0 ? (
                      <select
                        value={item.product}
                        onChange={e => {
                          const selectedProduct = products.find(p => p.name === e.target.value);
                          const newItem = { ...item, product: e.target.value };
                          if (selectedProduct) {
                            newItem.unitPrice = selectedProduct.unitPrice;
                            newItem.description = selectedProduct.description;
                          }
                          const updated = [...newItems];
                          updated[i] = newItem;
                          setNewItems(updated);
                        }}
                        className="input-modern py-2 text-xs"
                      >
                        <option value="">Selecione um produto...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} — R$ {p.unitPrice.toFixed(2)}
                            {` (Estoque: ${p.stockQuantity})`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} placeholder="Nome do produto" className="input-modern py-2 text-xs" />
                    )}
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
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Descrição do Produto</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    placeholder="Descrição completa do produto..."
                    className="input-modern py-2 text-xs w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Data de entrega + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data de Entrega</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={e => setNewDeliveryDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="input-modern"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo do Pedido</label>
              <div className="flex gap-2">
                {(['entrega', 'instalacao'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewOrderType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newOrderType === t
                      ? t === 'entrega'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-producao/10 border-producao text-producao'
                      : 'border-border/40 text-muted-foreground hover:border-primary/30'
                      }`}
                  >
                    {t === 'entrega' ? '🚚 Entrega' : '🔧 Instalação'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observação</label>
            <textarea
              value={newObservation}
              onChange={e => setNewObservation(e.target.value)}
              placeholder="Observações importantes sobre o pedido (aparecem no financeiro e produção)..."
              className="input-modern w-full min-h-[80px] resize-y text-sm"
              rows={3}
            />
          </div>

          {/* Notas internas */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas Internas (opcional)</label>
            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Notas internas sobre o orçamento..."
              className="input-modern w-full resize-y text-sm"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div className="text-sm text-muted-foreground">
              Total de itens: {newItems.reduce((s, i) => s + i.quantity, 0)} produto(s)
            </div>
            <div className="text-xl font-extrabold text-foreground">{formatCurrency(calcTotal())}</div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
              <span className="text-base">⚠</span>
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreateOrder}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? <><Check className="w-4 h-4" /> Salvar Alterações</> : <><FileText className="w-4 h-4" /> Criar Orçamento</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detalhe do orçamento selecionado ────────────────────────
  if (selectedOrder) {
    const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(selectedOrder.status);
    const podeEnviarFinanceiro = selectedOrder.status === 'rascunho' || selectedOrder.status === 'enviado' || selectedOrder.status === 'aprovado_cliente';

    return (
      <div className="card-section p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number}</h2>
            {clients.find(c => c.id === selectedOrder.clientId)?.consignado && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                ⭐ Consignado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Botão Editar — bloqueado se status avançado */}
            {podeEditar ? (
              <button
                onClick={() => { openEdit(selectedOrder); setSelectedOrder(null); }}
                className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-1.5 hover:bg-primary/20"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                🔒 Edição bloqueada
              </span>
            )}
            <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>
        </div>

        {/* Pipeline visual */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso do Pedido</p>
          <OrderPipeline order={selectedOrder} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Cliente</span><span className="font-semibold text-foreground">{selectedOrder.clientName}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Status</span><StatusBadge status={selectedOrder.status} /></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Data</span><span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Total</span><span className="font-extrabold text-foreground text-lg">{formatCurrency(selectedOrder.total)}</span></div>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="modern-table">
            <thead><tr><th>Produto</th><th>Descrição</th><th className="text-right">Qtd</th><th className="text-right hidden sm:table-cell">Unit.</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {selectedOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="text-foreground font-medium">{item.product}</td>
                  <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                  <td className="text-right text-foreground">{item.quantity}</td>
                  <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end pt-3 border-t border-border/40">
          <div className="text-xl font-extrabold text-foreground">Total: {formatCurrency(selectedOrder.total)}</div>
        </div>

        {/* Observação */}
        {selectedOrder.observation && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação</p>
            <p className="text-sm text-foreground">{selectedOrder.observation}</p>
          </div>
        )}

        {/* Histórico de status */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <History className="w-3 h-3" /> Histórico de Movimentações
          </p>
          <OrderHistory order={selectedOrder} />
        </div>

        {/* Botão "Enviar para Financeiro" — apenas para status corretos */}
        {podeEnviarFinanceiro && (
          <>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <ComprovanteUpload
                value={comprovanteAttached || selectedOrder.receiptUrl}
                onChange={setComprovanteAttached}
                label="Comprovante de Pagamento (obrigatório para enviar ao Financeiro)"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              {clients.find(c => c.id === selectedOrder.clientId)?.phone && (
                <button
                  onClick={() => openWhatsApp(clients.find(c => c.id === selectedOrder.clientId)!.phone)}
                  className="btn-modern bg-success/10 text-success hover:bg-success/20 shadow-none text-xs"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Cliente
                </button>
              )}
              <button
                onClick={() => enviarFinanceiro(selectedOrder.id)}
                disabled={!comprovanteAttached.trim() && !selectedOrder.receiptUrl}
                className="btn-modern bg-gradient-to-r from-vendedor to-vendedor/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                <Send className="w-4 h-4" /> 🟢 Enviar para Financeiro
              </button>
            </div>

            {(!comprovanteAttached && !selectedOrder.receiptUrl) && (
              <p className="text-[10px] text-muted-foreground text-center">
                ⚠️ Anexe o comprovante de pagamento para habilitar o envio ao financeiro
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Lista de orçamentos ─────────────────────────────────────
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
                <th className="hidden lg:table-cell">Progresso</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(order.status);
                return (
                  <tr key={order.id}>
                    <td className="font-bold text-foreground">{order.number}</td>
                    <td className="text-foreground">{order.clientName}</td>
                    <td className="text-right font-semibold text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                    <td className="hidden lg:table-cell"><OrderPipeline order={order} compact /></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedOrder(order); setComprovanteAttached(order.receiptUrl || ''); }}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {podeEditar && (
                          <button
                            onClick={() => openEdit(order)}
                            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary inline-flex items-center justify-center transition-colors"
                            title="Editar orçamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(order.status === 'rascunho' || order.status === 'enviado' || order.status === 'aprovado_cliente') && (
                          <button
                            onClick={() => { setSelectedOrder(order); setComprovanteAttached(order.receiptUrl || ''); }}
                            className="w-8 h-8 rounded-lg bg-vendedor/10 text-vendedor hover:bg-vendedor/20 inline-flex items-center justify-center transition-colors"
                            title="Enviar ao Financeiro"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum orçamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrcamentosPage;
