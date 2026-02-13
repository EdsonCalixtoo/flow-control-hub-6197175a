import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Send, ArrowLeft, Calendar } from 'lucide-react';
import type { Order } from '@/types/erp';

type PaymentFilter = 'todos' | 'pago' | 'pendente' | 'vencido' | 'cancelado';
type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado' | 'todos';

const FinanceiroDashboard: React.FC = () => {
  const { orders, financialEntries, updateOrderStatus } = useERP();
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'number' | 'clientName' | 'total' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 5;

  const totalRecebido = financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalPendente = orders.filter(o => o.paymentStatus === 'pendente' || o.status === 'aguardando_financeiro').reduce((s, o) => s + o.total, 0);
  const totalVencido = financialEntries.filter(e => e.status === 'pendente' && new Date(e.date) < new Date()).reduce((s, e) => s + e.amount, 0);
  const aguardandoLiberacao = orders.filter(o => o.status === 'aprovado_financeiro').length;
  const pagamentosHoje = financialEntries.filter(e => e.date === new Date().toISOString().split('T')[0] && e.status === 'pago').length;

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

  const enviarGestor = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_gestor');
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
              <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Informações do Cliente</h3>
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

            <div className="card-section">
              <div className="card-section-header">
                <h3 className="card-section-title">Produtos</h3>
              </div>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right hidden sm:table-cell">Unitário</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td className="text-foreground font-medium">{item.product}</td>
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

            {selectedOrder.status === 'aprovado_financeiro' && (
              <button onClick={() => enviarGestor(selectedOrder.id)} className="btn-primary w-full justify-center">
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
        <StatCard title="Aguard. Liberação" value={aguardandoLiberacao} icon={DollarSign} color="text-info" />
        <StatCard title="Pgtos Hoje" value={pagamentosHoje} icon={Calendar} color="text-primary" />
      </div>

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
                  <td className="hidden md:table-cell text-foreground">{order.paymentMethod || '—'}</td>
                  <td className="text-right font-semibold text-foreground">{formatCurrency(order.total)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setSelectedOrder(order)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors" title="Ver detalhes">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {order.status === 'aguardando_financeiro' && (
                        <button onClick={() => updateOrderStatus(order.id, 'aprovado_financeiro', { paymentStatus: 'pago' })} className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 inline-flex items-center justify-center transition-colors" title="Dar baixa">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {order.status === 'aprovado_financeiro' && (
                        <button onClick={() => enviarGestor(order.id)} className="w-8 h-8 rounded-lg bg-financeiro/10 text-financeiro hover:bg-financeiro/20 inline-flex items-center justify-center transition-colors" title="Liberar produção">
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
                  className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-xs font-semibold transition-colors ${
                    currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
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
  );
};

export default FinanceiroDashboard;
