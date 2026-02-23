import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Send, ArrowLeft, Calendar, Users2, BarChart3 } from 'lucide-react';
import type { Order } from '@/types/erp';

type PaymentFilter = 'todos' | 'pago' | 'pendente' | 'vencido' | 'cancelado';
type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado' | 'todos';
type Tab = 'pedidos' | 'vendedores';

const FinanceiroDashboard: React.FC = () => {
  const { orders, financialEntries, updateOrderStatus } = useERP();
  const [activeTab, setActiveTab] = useState<Tab>('pedidos');
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'number' | 'clientName' | 'total' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  // Filtro de período para vendedores
  const [sellerPeriod, setSellerPeriod] = useState<PeriodFilter>('todos');
  const itemsPerPage = 5;

  const totalRecebido = financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalPendente = orders.filter(o => o.paymentStatus === 'pendente' || o.status === 'aguardando_financeiro').reduce((s, o) => s + o.total, 0);
  const totalVencido = financialEntries.filter(e => e.status === 'pendente' && new Date(e.date) < new Date()).reduce((s, e) => s + e.amount, 0);
  const aguardandoLiberacao = orders.filter(o => o.status === 'aprovado_financeiro').length;
  const pagamentosHoje = financialEntries.filter(e => e.date === new Date().toISOString().split('T')[0] && e.status === 'pago').length;

  // ── Filtro por período ─────────────────────────────────────
  const filterByPeriod = (date: string, period: PeriodFilter): boolean => {
    const d = new Date(date);
    const now = new Date();
    if (period === 'hoje') {
      return d.toDateString() === now.toDateString();
    }
    if (period === '7dias') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    }
    if (period === '30dias') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    }
    return true; // 'todos'
  };

  // ── Controle de vendas por vendedor ───────────────────────
  const sellerStats = useMemo(() => {
    const periodOrders = orders.filter(o =>
      o.status !== 'rascunho' &&
      filterByPeriod(o.createdAt, sellerPeriod)
    );

    const stats: Record<string, {
      sellerName: string;
      sellerId: string;
      items: { product: string; quantity: number; total: number }[];
      totalVendas: number;
      qtdPedidos: number;
    }> = {};

    for (const order of periodOrders) {
      const key = order.sellerId || order.sellerName;
      if (!stats[key]) {
        stats[key] = {
          sellerName: order.sellerName,
          sellerId: order.sellerId,
          items: [],
          totalVendas: 0,
          qtdPedidos: 0,
        };
      }
      stats[key].totalVendas += order.total;
      stats[key].qtdPedidos += 1;
      for (const item of order.items) {
        const existingItem = stats[key].items.find(i => i.product === item.product);
        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.total += item.total;
        } else {
          stats[key].items.push({
            product: item.product,
            quantity: item.quantity,
            total: item.total,
          });
        }
      }
    }

    return Object.values(stats).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [orders, sellerPeriod]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.number.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q));
    }

    if (statusFilter !== 'todos') {
      result = result.filter(o => {
        if (statusFilter === 'pago') return o.paymentStatus === 'pago';
        if (statusFilter === 'pendente') return o.paymentStatus === 'pendente' || o.status === 'aguardando_financeiro';
        return true;
      });
    }

    if (paymentMethodFilter !== 'todos') {
      result = result.filter(o => o.paymentMethod === paymentMethodFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return result;
  }, [orders, searchQuery, statusFilter, paymentMethodFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Fluxo atualizado: Financeiro aprova → vai direto para Produção (sem gestor)
  const enviarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_producao', undefined, 'Financeiro', 'Enviado diretamente para produção pelo financeiro');
    setSelectedOrder(null);
  };

  if (selectedOrder) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Detalhes do Pedido</h1>
            <p className="page-subtitle">{selectedOrder.number} • {selectedOrder.clientName}</p>
          </div>
          <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-section p-6">
              <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Informações do Pedido</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Cliente', value: selectedOrder.clientName },
                  { label: 'Vendedor', value: selectedOrder.sellerName },
                  { label: 'Data Criação', value: new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR') },
                  { label: 'Última Atualização', value: new Date(selectedOrder.updatedAt).toLocaleDateString('pt-BR') },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observação do orçamento */}
            {selectedOrder.observation && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação do Vendedor</p>
                <p className="text-sm text-foreground">{selectedOrder.observation}</p>
              </div>
            )}

            <div className="card-section">
              <div className="card-section-header">
                <h3 className="card-section-title">Produtos</h3>
              </div>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Descrição</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right hidden sm:table-cell">Unitário</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td className="text-foreground font-medium">{item.product}</td>
                      <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                      <td className="text-right text-foreground">{item.quantity}</td>
                      <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-bold text-foreground">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-border/40 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Subtotal: {formatCurrency(selectedOrder.subtotal)} • Impostos: {formatCurrency(selectedOrder.taxes)}</span>
                <span className="text-lg font-extrabold text-foreground">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          </div>

          {/* Sidebar de status */}
          <div className="space-y-4">
            <div className="card-section p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Status Financeiro</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Status do Pedido</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Pagamento</span>
                  <span className={`text-sm font-bold ${selectedOrder.paymentStatus === 'pago' ? 'text-success' : 'text-warning'}`}>
                    {selectedOrder.paymentStatus === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                  </span>
                </div>
                {selectedOrder.paymentMethod && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Forma de Pagamento</span>
                    <span className="text-sm font-semibold text-foreground">{selectedOrder.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-section p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Histórico</h3>
              <div className="space-y-3">
                {[
                  { label: 'Criado', date: selectedOrder.createdAt, color: 'bg-muted-foreground' },
                  ...(selectedOrder.status !== 'rascunho' ? [{ label: 'Enviado ao Financeiro', date: selectedOrder.updatedAt, color: 'bg-warning' }] : []),
                  ...(selectedOrder.paymentStatus === 'pago' ? [{ label: 'Pagamento confirmado', date: selectedOrder.updatedAt, color: 'bg-success' }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color} mt-1.5 shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aprovar e enviar direto para produção */}
            {selectedOrder.status === 'aguardando_financeiro' && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'aprovado_financeiro', { paymentStatus: 'pago' }, 'Financeiro', 'Pagamento aprovado');
                    setSelectedOrder(null);
                  }}
                  className="btn-primary w-full justify-center"
                >
                  <CheckCircle className="w-4 h-4" /> Aprovar Pagamento
                </button>
              </div>
            )}
            {selectedOrder.status === 'aprovado_financeiro' && (
              <button onClick={() => enviarProducao(selectedOrder.id)} className="btn-primary w-full justify-center">
                <Send className="w-4 h-4" /> Liberar para Produção
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard Financeiro</h1>
        <p className="page-subtitle">Controle completo das finanças</p>
      </div>

      {/* Cards animados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <StatCard title="A Receber" value={formatCurrency(totalPendente)} icon={Clock} color="text-warning" />
        <StatCard title="Recebido" value={formatCurrency(totalRecebido)} icon={TrendingUp} color="text-success" trend="+8%" />
        <StatCard title="Vencido" value={formatCurrency(totalVencido)} icon={AlertTriangle} color="text-destructive" />
        <StatCard title="Aguard. Produção" value={aguardandoLiberacao} icon={DollarSign} color="text-info" />
        <StatCard title="Pgtos Hoje" value={pagamentosHoje} icon={Calendar} color="text-primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/40">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'pedidos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />
          Pedidos
        </button>
        <button
          onClick={() => setActiveTab('vendedores')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'vendedores' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Users2 className="w-3.5 h-3.5 inline mr-1.5" />
          Controle por Vendedor
        </button>
      </div>

      {/* Tab: Controle por Vendedor */}
      {activeTab === 'vendedores' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filtro de período */}
          <div className="card-section p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Período:</p>
              {([
                { value: 'todos', label: 'Todos' },
                { value: 'hoje', label: 'Hoje' },
                { value: '7dias', label: '7 Dias' },
                { value: '30dias', label: '30 Dias' },
              ] as { value: PeriodFilter; label: string }[]).map(p => (
                <button
                  key={p.value}
                  onClick={() => setSellerPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sellerPeriod === p.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {sellerStats.length === 0 ? (
            <div className="card-section p-12 text-center">
              <Users2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-bold">Nenhuma venda no período selecionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellerStats.map(seller => (
                <div key={seller.sellerId} className="card-section overflow-hidden">
                  <div className="card-section-header bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vendedor to-vendedor/70 flex items-center justify-center text-xs font-extrabold text-white shadow-sm">
                        {seller.sellerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">{seller.sellerName}</h3>
                        <p className="text-[10px] text-muted-foreground">{seller.qtdPedidos} pedido(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total de Vendas</p>
                      <p className="text-lg font-extrabold text-success">{formatCurrency(seller.totalVendas)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th className="text-center">Quantidade</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seller.items.sort((a, b) => b.quantity - a.quantity).map((item, idx) => (
                          <tr key={idx}>
                            <td className="font-medium text-foreground">{item.product}</td>
                            <td className="text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-extrabold text-sm">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30">
                          <td className="font-bold text-foreground text-xs uppercase tracking-wider">Total Geral</td>
                          <td className="text-center font-bold text-foreground">{seller.items.reduce((s, i) => s + i.quantity, 0)}</td>
                          <td className="text-right font-extrabold text-success">{formatCurrency(seller.totalVendas)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}

              {/* Resumo geral */}
              <div className="card-section p-5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Geral — {sellerStats.length} vendedor(es)</p>
                    <p className="text-2xl font-extrabold text-foreground mt-1">
                      {formatCurrency(sellerStats.reduce((s, v) => s + v.totalVendas, 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Total de pedidos</p>
                    <p className="text-xl font-black text-primary">{sellerStats.reduce((s, v) => s + v.qtdPedidos, 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pedidos */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4 animate-fade-in">
          {/* Barra de busca + filtros */}
          <div className="card-section p-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Buscar por pedido ou cliente..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="input-modern pl-10 py-2.5"
                />
              </div>
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`btn-modern shadow-none text-xs px-4 py-2.5 ${showFilters ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
              >
                <Filter className="w-3.5 h-3.5" /> Filtros
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-3 flex-wrap animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as PaymentFilter); setCurrentPage(1); }}
                    className="input-modern py-2 text-xs"
                  >
                    <option value="todos">Todos</option>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
                  <select
                    value={periodFilter}
                    onChange={e => { setPeriodFilter(e.target.value as PeriodFilter); setCurrentPage(1); }}
                    className="input-modern py-2 text-xs"
                  >
                    <option value="todos">Todos</option>
                    <option value="hoje">Hoje</option>
                    <option value="7dias">7 dias</option>
                    <option value="30dias">30 dias</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forma Pgto</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={e => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
                    className="input-modern py-2 text-xs"
                  >
                    <option value="todos">Todos</option>
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Tabela moderna */}
          <div className="card-section">
            <div className="card-section-header">
              <h2 className="card-section-title">Pedidos</h2>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">{filteredOrders.length} resultado(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('number')}>
                      Pedido {sortBy === 'number' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => handleSort('clientName')}>
                      Cliente {sortBy === 'clientName' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="hidden md:table-cell">Vendedor</th>
                    <th className="hidden md:table-cell">Forma Pgto</th>
                    <th className="cursor-pointer select-none text-right" onClick={() => handleSort('total')}>
                      Valor {sortBy === 'total' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => (
                    <tr key={order.id}>
                      <td className="font-bold text-foreground">{order.number}</td>
                      <td className="text-foreground">{order.clientName}</td>
                      <td className="hidden md:table-cell text-foreground text-xs">{order.sellerName}</td>
                      <td className="hidden md:table-cell text-foreground">{order.paymentMethod || '—'}</td>
                      <td className="text-right font-semibold text-foreground">{formatCurrency(order.total)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setSelectedOrder(order)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors" title="Ver detalhes">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {order.status === 'aguardando_financeiro' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'aprovado_financeiro', { paymentStatus: 'pago' }, 'Financeiro', 'Pagamento aprovado')}
                              className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 inline-flex items-center justify-center transition-colors"
                              title="Dar baixa"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {order.status === 'aprovado_financeiro' && (
                            <button
                              onClick={() => {
                                updateOrderStatus(order.id, 'aguardando_producao', undefined, 'Financeiro', 'Liberado para produção');
                              }}
                              className="w-8 h-8 rounded-lg bg-financeiro/10 text-financeiro hover:bg-financeiro/20 inline-flex items-center justify-center transition-colors"
                              title="Liberar produção"
                            >
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

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="w-8 h-8 rounded-lg bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-xs font-semibold transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="w-8 h-8 rounded-lg bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceiroDashboard;
