import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { RealtimeNotificationHandler } from '@/components/shared/RealtimeNotificationHandler';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Send, ArrowLeft, Users2, BarChart3, Radio, Star, Plus, Trash2, Inbox, Bell } from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import type { Order, FinancialEntry } from '@/types/erp';

// Status que devem aparecer no financeiro (apenas quando o vendedor clicou em Enviar)
// Fluxo simplificado: Financeiro aprova e envia direto para Produção (sem Gestor)
const STATUS_VISIVEL_FINANCEIRO = [
  'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
  'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'
];

type PaymentFilter = 'todos' | 'pago' | 'pendente' | 'vencido' | 'cancelado';
type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado' | 'todos';
type Tab = 'pedidos' | 'vendedores';

const FinanceiroDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { orders, clients, financialEntries, updateOrderStatus, addFinancialEntry, loadFromSupabase } = useERP();
  const [activeTab, setActiveTab] = useState<Tab>('pedidos');
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'number' | 'clientName' | 'total' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sellerPeriod, setSellerPeriod] = useState<PeriodFilter>('todos');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showConsignados, setShowConsignados] = useState(false);
  const [showInstallations, setShowInstallations] = useState(false);
  const [showRetiradas, setShowRetiradas] = useState(false);
  const [showRecebido, setShowRecebido] = useState(false);
  const [showAguardandoAprovacao, setShowAguardandoAprovacao] = useState(false);
  const [showAReceber, setShowAReceber] = useState(false);
  const [showAguardandoProducao, setShowAguardandoProducao] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Pagamentos parciais (consignado)
  const [novoPagValor, setNovoPagValor] = useState('');
  const [novoPagComprovantes, setNovoPagComprovantes] = useState<string[]>([]);
  const [novoPagDescricao, setNovoPagDescricao] = useState('');
  const [salvandoPag, setSalvandoPag] = useState(false);
  const itemsPerPage = 5;

  // ✅ Filtra APENAS pedidos que foram enviados ao financeiro
  // Rascunhos e orçamentos não enviados NÃO aparecem aqui
  const ordersVisiveisFinanceiro = useMemo(
    () => orders.filter(o => STATUS_VISIVEL_FINANCEIRO.includes(o.status)),
    [orders]
  );

  // Atualiza indicador de último refresh quando orders mudam
  const prevOrdersLen = useRef(orders.length);
  useEffect(() => {
    if (orders.length !== prevOrdersLen.current) {
      setLastUpdate(new Date());
      prevOrdersLen.current = orders.length;
    }
  }, [orders]);

  // 📡 Monitora em tempo real quando novos pedidos chegam para financeiro
  useRealtimeOrders((event) => {
    if (event.type === 'UPDATE' && event.previousStatus !== 'aguardando_financeiro' && event.order.status === 'aguardando_financeiro') {
      setNotificationCount(prev => prev + 1);
      console.log('[FinanceiroDashboard] 🔔 NOVO PEDIDO PARA APROVAÇÃO - Tempo Real');
      // Força refresh imediato da lista
      setTimeout(() => {
        loadFromSupabase();
        setLastUpdate(new Date());
      }, 100);
    }
  }, ['aguardando_financeiro']);

  const totalRecebido = useMemo(() =>
    financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0)
    , [financialEntries]);

  // Função para calcular saldo devedor de um pedido
  const getSaldoDevedor = (orderId: string, orderTotal: number) => {
    const pagos = financialEntries
      .filter(e => e.orderId === orderId && e.type === 'receita' && e.status === 'pago')
      .reduce((s, e) => s + e.amount, 0);
    return Math.max(0, orderTotal - pagos);
  };

  const totalPendenteNormal = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro') // ✅ Ignora rejeitados no 'A Receber'
      .filter(o => {
        if (o.isConsigned !== undefined) return !o.isConsigned;
        const client = clients.find(c => c.id === o.clientId) || clients.find(c => c.name === o.clientName);
        return !client?.consignado;
      })
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients]);

  const totalConsignadoOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro') // ✅ Ignora rejeitados
      .filter(o => {
        if (o.isConsigned !== undefined) return o.isConsigned;
        const client = clients.find(c => c.id === o.clientId) || clients.find(c => c.name === o.clientName);
        return client?.consignado;
      })
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients]);

  const totalInstallationsOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro') // ✅ Ignora rejeitados
      .filter(o => o.orderType === 'instalacao')
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total), 0);
  }, [ordersVisiveisFinanceiro, financialEntries]);

  const totalRetiradasOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro') // ✅ Ignora rejeitados
      .filter(o => o.orderType === 'retirada')
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total), 0);
  }, [ordersVisiveisFinanceiro, financialEntries]);

  const aguardandoLiberacao = ordersVisiveisFinanceiro.filter(o => o.status === 'aprovado_financeiro').length;
  const aguardandoFinanceiro = ordersVisiveisFinanceiro.filter(o => o.status === 'aguardando_financeiro').length;

  // Pedidos de clientes consignados
  const consignadosOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => {
    if (o.isConsigned !== undefined) return o.isConsigned;
    const client = clients.find(c => c.id === o.clientId) || clients.find(c => c.name === o.clientName);
    return client?.consignado === true;
  }), [ordersVisiveisFinanceiro, clients]);

  // Pedidos de instalação
  const installationOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => o.orderType === 'instalacao'), [ordersVisiveisFinanceiro]);

  // Pedidos de retirada
  const retiradaOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => o.orderType === 'retirada'), [ordersVisiveisFinanceiro]);

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
    // Para o financeiro, as vendas por vendedor mostram apenas pedidos enviados
    const periodOrders = ordersVisiveisFinanceiro.filter(o =>
      filterByPeriod(o.createdAt, sellerPeriod)
    );

    const stats: Record<string, {
      sellerName: string;
      sellerId: string;
      items: { product: string; sensorType?: string; quantity: number; total: number }[];
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
        const existingItem = stats[key].items.find(i =>
          i.product === item.product && i.sensorType === item.sensorType
        );
        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.total += item.total;
        } else {
          stats[key].items.push({
            product: item.product,
            sensorType: item.sensorType,
            quantity: item.quantity,
            total: item.total,
          });
        }
      }
    }

    return Object.values(stats).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [ordersVisiveisFinanceiro, sellerPeriod]);

  const filteredOrders = useMemo(() => {
    // ✅ Começa apenas com pedidos visíveis ao financeiro (não rascunhos)
    let result = [...ordersVisiveisFinanceiro];

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
  }, [ordersVisiveisFinanceiro, searchQuery, statusFilter, paymentMethodFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Fluxo: Financeiro aprova e envia direto para Produção (sem etapa intermediária do Gestor)
  const aprovarEEnviarProducao = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const client = clients.find(c => c.id === order.clientId);
    // IMPORTANTE: Se o cliente não for encontrado por ID, tenta por nome como fallback
    const actualClient = client || clients.find(c => c.name === order.clientName);
    const isConsignado = actualClient?.consignado === true;

    if (isConsignado) {
      // ✅ Para clientes CONSIGNADOS, permite enviar para produção SEM obrigatoriedade de pagamento total
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente' },
        'Financeiro',
        'Consignado: Aprovado para produção sem obrigatoriedade de pagamento imediato'
      );
    } else if (order.orderType === 'instalacao') {
      // ✅ Para INSTALAÇÕES, também permite enviar para produção mesmo sem pagamento total (ex: pagar na hora)
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente' },
        'Financeiro',
        'Instalação: Aprovado para produção. Pagamento será controlado pelo financeiro.'
      );
    } else if (order.orderType === 'retirada') {
      // ✅ Para RETIRADAS, também permite enviar para produção mesmo sem pagamento total (ex: cobrar no local)
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente' },
        'Financeiro',
        'Retirada: Aprovado para produção. Pagamento será controlado pelo financeiro.'
      );
    } else {
      // ✅ Para clientes normais, cria lançamento financeiro total (venda direta)
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: 'receita',
        description: `Pagamento total - ${order.number} - ${order.clientName}`,
        amount: order.total,
        category: 'Venda de Produtos',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        paymentMethod: order.paymentMethod || 'Pix',
        createdAt: new Date().toISOString(),
      };

      await addFinancialEntry(entry);
      await updateOrderStatus(orderId, 'aguardando_producao', { paymentStatus: 'pago' }, 'Financeiro', 'Pagamento aprovado - Enviando para produção');
    }

    setSelectedOrder(null);
    setShowReject(false);
    setRejectReason('');
  };

  const syncData = async () => {
    setIsRefreshing(true);
    try {
      if (loadFromSupabase) await loadFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const rejeitarPedido = (orderId: string) => {
    if (!rejectReason.trim()) return;
    updateOrderStatus(orderId, 'rejeitado_financeiro', { rejectionReason: rejectReason }, 'Financeiro', `Rejeitado: ${rejectReason}`);
    setSelectedOrder(null);
    setShowReject(false);
    setRejectReason('');
  };

  // ── Pagamentos Parciais (Consignado) ──────────────────────────
  const getPagamentosDosPedido = (orderId: string): FinancialEntry[] =>
    financialEntries.filter(e => e.orderId === orderId && e.type === 'receita');

  const adicionarPagamentoParcial = async (order: Order) => {
    const valor = parseFloat(novoPagValor.replace(',', '.'));
    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return; }
    const pagamentos = getPagamentosDosPedido(order.id);
    const totalPago = pagamentos.reduce((s, p) => s + p.amount, 0);
    if (totalPago + valor > order.total) {
      alert(`Valor excede o saldo devedor de ${formatCurrency(order.total - totalPago)}.`);
      return;
    }
    try {
      setSalvandoPag(true);
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: 'receita',
        description: novoPagDescricao || `Pagamento parcial - ${order.number} - ${order.clientName}`,
        amount: valor,
        category: 'Pagamento Consignado',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        receiptUrls: novoPagComprovantes,
        createdAt: new Date().toISOString(),
      };
      addFinancialEntry(entry);
      setNovoPagValor('');
      setNovoPagDescricao('');
      setNovoPagComprovantes([]);

      // Se pagou 100%, aprova e envia para produção
      const novoTotal = totalPago + valor;
      if (novoTotal >= order.total) {
        if (order.status === 'aguardando_financeiro') {
          await updateOrderStatus(order.id, 'aguardando_producao', { paymentStatus: 'pago' }, 'Financeiro', 'Valor total quitado — enviando para produção');
        } else {
          // Se já estava em outro status (ex: já em produção), apenas marca como pago
          await updateOrderStatus(order.id, order.status, { paymentStatus: 'pago' }, 'Financeiro', 'Valor total quitado');
        }
        setSelectedOrder(null);
      } else {
        // ✅ Atualiza status para PARCIAL se ainda não quitou
        await updateOrderStatus(order.id, order.status, { paymentStatus: 'parcial' }, 'Financeiro', `Pagamento parcial de ${formatCurrency(valor)} recebido`);
      }
    } catch (err: any) {
      alert('Erro ao registrar pagamento: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSalvandoPag(false);
    }
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

              {/* Alerta Consignado */}
              {(() => {
                const client = clients.find(c => c.id === selectedOrder.clientId);
                return client?.consignado ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                    <span className="text-xl">⭐</span>
                    <div>
                      <p className="text-xs font-bold text-amber-400">Cliente Consignado</p>
                      <p className="text-[11px] text-amber-400/70">Este cliente opera em regime de consignação — verifique as condições especiais antes de aprovar.</p>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-3 mb-3">
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

              {/* Endereço de Entrega */}
              {(() => {
                const client = clients.find(c => c.id === selectedOrder.clientId) || clients.find(c => c.name === selectedOrder.clientName);
                if (!client) return null;
                return (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <span className="text-[10px] text-primary uppercase tracking-wider font-bold block mb-1">📍 Endereço de Entrega / Instalação</span>
                      <p className="text-sm font-semibold text-foreground">
                        {client.address}, {client.bairro ? `${client.bairro}, ` : ''}{client.city} - {client.state}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">CEP: {client.cep}</p>
                    </div>
                    {client.cpfCnpj && (
                      <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                        <span className="text-[10px] text-success uppercase tracking-wider font-bold block mb-1">🪪 CPF / CNPJ</span>
                        <p className="text-sm font-semibold font-mono text-foreground">{client.cpfCnpj}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Observação do orçamento */}
            {selectedOrder.observation && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação do Vendedor</p>
                <p className="text-sm text-foreground">{selectedOrder.observation}</p>
              </div>
            )}

            {/* ★ PAGAMENTOS PARCIAIS (CONSIGNADO E INSTALAÇÃO) */}
            {(() => {
              const client = clients.find(c => c.id === selectedOrder.clientId);
              const isConsigned = client?.consignado;
              const isInstallation = selectedOrder.orderType === 'instalacao';
              const isRetirada = selectedOrder.orderType === 'retirada';

              if (!isConsigned && !isInstallation && !isRetirada) return null;

              const pagamentos = getPagamentosDosPedido(selectedOrder.id);
              const totalPago = pagamentos.reduce((s, p) => s + p.amount, 0);
              const saldoDevedor = selectedOrder.total - totalPago;
              const percentPago = Math.min(100, (totalPago / selectedOrder.total) * 100);

              const colorClass = isConsigned ? 'amber-500' : (isInstallation ? 'producao' : 'amber-500');
              const Icon = isConsigned ? Star : (isInstallation ? DollarSign : Inbox);
              const title = isConsigned ? 'Pagamentos Parciais — Consignado' : (isInstallation ? 'Pagamentos Parciais — Instalação' : 'Pagamentos Parciais — Retirada');

              return (
                <div className={`card-section overflow-hidden border border-${colorClass}/30`}>
                  <div className={`card-section-header bg-${colorClass}/5`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${colorClass}`} />
                      <h3 className={`card-section-title text-${colorClass}`}>{title}</h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Resumo financeiro */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total do Pedido</p>
                        <p className="text-sm font-extrabold text-foreground">{formatCurrency(selectedOrder.total)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
                        <p className="text-[10px] text-success uppercase tracking-wider mb-1">Total Pago</p>
                        <p className="text-sm font-extrabold text-success">{formatCurrency(totalPago)}</p>
                      </div>
                      <div className={`p-3 rounded-xl border text-center ${saldoDevedor <= 0 ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                        <p className={`text-[10px] uppercase tracking-wider mb-1 ${saldoDevedor <= 0 ? 'text-success' : 'text-destructive'}`}>Saldo Devedor</p>
                        <p className={`text-sm font-extrabold ${saldoDevedor <= 0 ? 'text-success' : 'text-destructive'}`}>
                          {saldoDevedor <= 0 ? '✓ Quitado' : formatCurrency(saldoDevedor)}
                        </p>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progresso de Pagamento</span>
                        <span className="font-bold">{percentPago.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${isConsigned ? 'from-amber-500 to-success' : (isInstallation ? 'from-producao to-success' : 'from-amber-500 to-success')} transition-all duration-500`}
                          style={{ width: `${percentPago}%` }}
                        />
                      </div>
                    </div>

                    {/* Lista de pagamentos registrados */}
                    {pagamentos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {pagamentos.length} Pagamento(s) Registrado(s)
                        </p>
                        {pagamentos.map((pag, idx) => (
                          <div key={pag.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                            <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                              <span className="text-success text-xs font-bold">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{pag.description}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(pag.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-extrabold text-success">{formatCurrency(pag.amount)}</p>
                              {pag.receiptUrls && pag.receiptUrls.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {pag.receiptUrls.map((url, i) => (
                                    <button
                                      key={i}
                                      onClick={() => window.open(url, '_blank')}
                                      className="text-[9px] text-primary underline"
                                    >
                                      Comprovante {i + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {pag.receiptUrl && (!pag.receiptUrls || pag.receiptUrls.length === 0) && (
                                <button
                                  onClick={() => window.open(pag.receiptUrl, '_blank')}
                                  className="text-[9px] text-primary underline mt-1"
                                >
                                  Ver comprovante
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário novo pagamento */}
                    {saldoDevedor > 0 && (selectedOrder.status === 'aguardando_financeiro' || isConsigned || isInstallation || isRetirada) && (
                      <div className={`p-4 rounded-xl border border-${colorClass}/30 bg-${colorClass}/5 space-y-3`}>
                        <p className={`text-xs font-bold text-${colorClass} uppercase tracking-wider flex items-center gap-1.5`}>
                          <Plus className="w-3.5 h-3.5" /> Registrar Novo Pagamento
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Valor Recebido (R$) *</label>
                            <input
                              type="number"
                              value={novoPagValor}
                              onChange={e => setNovoPagValor(e.target.value)}
                              placeholder={`Máx: ${formatCurrency(saldoDevedor)}`}
                              className="input-modern py-2 text-sm"
                              min={0.01}
                              max={saldoDevedor}
                              step={0.01}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Descrição (opcional)</label>
                            <input
                              type="text"
                              value={novoPagDescricao}
                              onChange={e => setNovoPagDescricao(e.target.value)}
                              placeholder="Ex: Pix recebido"
                              className="input-modern py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Comprovante (opcional)</label>
                          <ComprovanteUpload
                            values={novoPagComprovantes}
                            onChange={setNovoPagComprovantes}
                            label=""
                          />
                        </div>
                        <button
                          onClick={() => adicionarPagamentoParcial(selectedOrder)}
                          disabled={salvandoPag || !novoPagValor}
                          className={`btn-modern ${isConsigned || isRetirada ? 'bg-amber-500' : 'bg-producao'} text-white hover:opacity-90 w-full justify-center disabled:opacity-50`}
                        >
                          {salvandoPag
                            ? <><span className="animate-spin">⚙️</span> Salvando...</>
                            : <><Plus className="w-4 h-4" /> Registrar Pagamento de {novoPagValor ? formatCurrency(parseFloat(novoPagValor.replace(',', '.'))) : 'R$ 0,00'}</>
                          }
                        </button>
                        {parseFloat(novoPagValor.replace(',', '.') || '0') + totalPago >= selectedOrder.total && (
                          <p className="text-[10px] text-success text-center font-semibold">
                            ✅ Após este pagamento, o pedido será automaticamente aprovado e enviado para Produção!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Alerta Retirada */}
            {selectedOrder.orderType === 'retirada' && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Informações de Retirada</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Previsão</p>
                    <p className="text-sm font-semibold">{selectedOrder.deliveryDate ? format(new Date(selectedOrder.deliveryDate + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Tipo</p>
                    <p className="text-sm font-semibold text-amber-500">Retirada</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Cobrança</p>
                    <p className="text-sm font-semibold capitalize">{selectedOrder.installationPaymentType === 'pago' ? '✓ Já Pago' : '💰 Cobrar no Local'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta Instalação */}
            {selectedOrder.orderType === 'instalacao' && (
              <div className="p-4 rounded-xl bg-producao/5 border border-producao/20 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-producao" />
                  <p className="text-xs font-bold text-producao uppercase tracking-wider">Agendamento de Instalação</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Data</p>
                    <p className="text-sm font-semibold">{selectedOrder.installationDate ? format(new Date(selectedOrder.installationDate + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Horário</p>
                    <p className="text-sm font-semibold">{selectedOrder.installationTime || '—'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/40">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Cobrança</p>
                    <p className="text-sm font-semibold capitalize">{selectedOrder.installationPaymentType === 'pago' ? 'Já Pago' : 'Pagar na Hora'}</p>
                  </div>
                </div>
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
                      <td className="text-foreground font-medium">
                        {item.product}
                        {item.sensorType && (
                          <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                            {item.sensorType === 'com_sensor' ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                          </span>
                        )}
                      </td>
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
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${selectedOrder.paymentStatus === 'pago' ? 'text-success' : 'text-warning'}`}>
                      {selectedOrder.paymentStatus === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                    </span>
                    {selectedOrder.paymentStatus !== 'pago' && getSaldoDevedor(selectedOrder.id, selectedOrder.total) <= 0 && (
                      <button
                        onClick={async () => {
                          await updateOrderStatus(selectedOrder.id, selectedOrder.status, { paymentStatus: 'pago' }, 'Financeiro', 'Baixa manual de pagamento confirmada');
                          setSelectedOrder({ ...selectedOrder, paymentStatus: 'pago' });
                        }}
                        className="text-[10px] bg-success/20 text-success px-2 py-1 rounded-lg border border-success/30 hover:bg-success/30 font-bold"
                      >
                        Confirmar Quitação
                      </button>
                    )}
                  </div>
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

            {/* Comprovantes de Pagamento */}
            {(selectedOrder.receiptUrls?.length ?? 0) > 0 && (
              <div className="card-section p-5">
                <ComprovanteUpload values={selectedOrder.receiptUrls || []} onChange={() => { }} label="Comprovantes de Pagamento" readOnly />
              </div>
            )}
            {!(selectedOrder.receiptUrls?.length) && selectedOrder.receiptUrl && (
              <div className="card-section p-5">
                <ComprovanteUpload values={[selectedOrder.receiptUrl]} onChange={() => { }} label="Comprovante de Pagamento" readOnly />
              </div>
            )}

            {/* Aprovar e rejeitar */}
            {selectedOrder.status === 'aguardando_financeiro' && (
              <div className="space-y-3">
                {showReject ? (
                  <div className="card-section p-4 space-y-3 border border-destructive/30 bg-destructive/5">
                    <p className="text-xs font-bold text-destructive uppercase tracking-wider">Motivo da Rejeição</p>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Descreva o motivo da rejeição..."
                      className="input-modern min-h-[80px] resize-none text-sm"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejeitarPedido(selectedOrder.id)}
                        disabled={!rejectReason.trim()}
                        className="btn-modern bg-destructive text-destructive-foreground text-xs flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" /> Confirmar Rejeição
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setRejectReason(''); }}
                        className="btn-modern bg-muted text-foreground shadow-none text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => aprovarEEnviarProducao(selectedOrder.id)}
                      className="btn-primary flex-1 justify-center"
                    >
                      <CheckCircle className="w-4 h-4" /> ✓ Aprovar e Enviar para Produção
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      className="btn-modern bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none"
                      title="Rejeitar pedido"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RealtimeNotificationHandler />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Dashboard Financeiro</h1>
          <p className="page-subtitle">Controle completo das finanças</p>
        </div>
        {/* Indicador de tempo real */}
        <div className="flex items-center gap-2">
          <button
            onClick={syncData}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isRefreshing ? 'bg-muted text-muted-foreground' : 'bg-success/10 border border-success/20 text-success hover:bg-success/20'} text-[10px] font-semibold`}
          >
            <Radio className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`} />
            {isRefreshing ? 'Sincronizando...' : `Tempo Real — atualizado ${lastUpdate.toLocaleTimeString('pt-BR')}`}
          </button>
        </div>
      </div>

      {/* Cards animados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <div onClick={() => setShowAguardandoAprovacao(true)} className="cursor-pointer relative">
          <StatCard title="Aguard. Aprovação" value={aguardandoFinanceiro} icon={Clock} color="text-warning" />
          {notificationCount > 0 && (
            <div className="absolute -top-2 -right-2 flex items-center gap-1">
              <div className="bg-danger text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
              <div className="absolute -top-2 -right-2 bg-danger rounded-full w-6 h-6 animate-pulse opacity-40"></div>
            </div>
          )}
        </div>
        <div onClick={() => setShowAReceber(true)} className="cursor-pointer">
          <StatCard title="A Receber" value={formatCurrency(totalPendenteNormal)} icon={DollarSign} color="text-warning" />
        </div>
        <div onClick={() => setShowRecebido(true)} className="cursor-pointer">
          <StatCard title="Recebido" value={formatCurrency(totalRecebido)} icon={TrendingUp} color="text-success" />
        </div>
        <div onClick={() => setShowAguardandoProducao(true)} className="cursor-pointer">
          <StatCard title="Aguard. Produção" value={aguardandoLiberacao} icon={Send} color="text-info" />
        </div>
        <div onClick={() => setShowConsignados(true)} className="cursor-pointer">
          <StatCard title="Consignados" value={formatCurrency(totalConsignadoOwed)} icon={Star} color="text-amber-500" />
        </div>
        <div onClick={() => setShowInstallations(true)} className="cursor-pointer">
          <StatCard title="Instalações" value={formatCurrency(totalInstallationsOwed)} icon={TrendingUp} color="text-producao" />
        </div>
        <div onClick={() => setShowRetiradas(true)} className="cursor-pointer">
          <StatCard title="Retiradas" value={formatCurrency(totalRetiradasOwed)} icon={Inbox} color="text-amber-500" />
        </div>
      </div>

      {/* Modal de Consignados */}
      {showConsignados && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-foreground text-lg">Clientes Consignados</h2>
              <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">{consignadosOrders.length}</span>
            </div>
            <button onClick={() => setShowConsignados(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {consignadosOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de cliente consignado
              </div>
            ) : (
              <>
                {consignadosOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-amber-500/5 border border-amber-500/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {saldo < order.total && saldo > 0 && (
                          <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">
                            PAGO: {formatCurrency(order.total - saldo)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className="text-[10px] font-extrabold text-amber-500 mb-1">
                          SALDO: {formatCurrency(saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrder(order); setShowConsignados(false); }}
                            className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-amber-500">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Consignação:</span>
                  </div>
                  <span className="text-lg font-extrabold text-amber-500">{formatCurrency(totalConsignadoOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Instalações */}
      {showInstallations && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-producao" />
              <h2 className="font-bold text-foreground text-lg">Controle de Instalações</h2>
              <span className="px-2 py-1 rounded-full bg-producao/20 text-producao text-xs font-bold">{installationOrders.length}</span>
            </div>
            <button onClick={() => setShowInstallations(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {installationOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de instalação registrado
              </div>
            ) : (
              <>
                {installationOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-producao/5 border border-producao/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • Agendado para: {order.installationDate ? format(new Date(order.installationDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Não definido'} às {order.installationTime || '—'}
                        </p>
                        <p className="text-[10px] text-producao font-bold mt-1 uppercase tracking-wider">
                          Status: {order.installationPaymentType === 'pago' ? '✓ PAGO' : '💰 PAGAR NA HORA'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>
                          SALDO: {formatCurrency(saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrder(order); setShowInstallations(false); }}
                            className="w-7 h-7 rounded-lg bg-producao text-white flex items-center justify-center hover:bg-producao-dark transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-producao/10 border border-producao/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-producao">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Instalações:</span>
                  </div>
                  <span className="text-lg font-extrabold text-producao">{formatCurrency(totalInstallationsOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRetiradas && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-foreground text-lg">Controle de Retiradas</h2>
              <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">{retiradaOrders.length}</span>
            </div>
            <button onClick={() => setShowRetiradas(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {retiradaOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de retirada registrado
              </div>
            ) : (
              <>
                {retiradaOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-amber-500/5 border border-amber-500/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • Pedido em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">
                          Status Pagam.: {order.installationPaymentType === 'pago' ? '✓ PAGO' : '💰 COBRAR NO LOCAL'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>
                          SALDO: {formatCurrency(saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrder(order); setShowRetiradas(false); }}
                            className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:opacity-90 transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-amber-500">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Retiradas:</span>
                  </div>
                  <span className="text-lg font-extrabold text-amber-500">{formatCurrency(totalRetiradasOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhamento do Recebido */}
      {showRecebido && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h2 className="font-bold text-foreground text-lg">Detalhamento Financeiro — Recebido</h2>
              <span className="px-2 py-1 rounded-full bg-success/20 text-success text-xs font-bold">{financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').length} Lançamento(s)</span>
            </div>
            <button onClick={() => setShowRecebido(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Método</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {financialEntries
                  .filter(e => e.type === 'receita' && e.status === 'pago')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(entry => (
                    <tr key={entry.id}>
                      <td className="text-xs">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="font-bold text-primary">{entry.orderNumber || '—'}</td>
                      <td className="text-xs">{entry.clientName}</td>
                      <td className="text-[10px] text-muted-foreground">{entry.description}</td>
                      <td className="text-[10px]">{entry.paymentMethod || '—'}</td>
                      <td className="text-right font-bold text-success">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={5} className="text-right font-bold uppercase text-[10px]">Total Acumulado</td>
                  <td className="text-right font-black text-success text-lg">{formatCurrency(totalRecebido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Aguardando Aprovação */}
      {showAguardandoAprovacao && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <h2 className="font-bold text-foreground text-lg">Pedidos Aguardando Aprovação</h2>
              <span className="px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold">{orders.filter(o => o.status === 'aguardando_financeiro').length}</span>
            </div>
            <button onClick={() => setShowAguardandoAprovacao(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status === 'aguardando_financeiro').length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido aguardando aprovação
              </div>
            ) : (
              orders.filter(o => o.status === 'aguardando_financeiro').map(order => (
                <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-warning/5 border border-warning/20">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-sm">{order.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <StatusBadge status={order.status} />
                      <button
                        onClick={() => { setSelectedOrder(order); setShowAguardandoAprovacao(false); }}
                        className="w-7 h-7 rounded-lg bg-warning text-white flex items-center justify-center hover:bg-warning/80 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de A Receber */}
      {showAReceber && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-warning" />
              <h2 className="font-bold text-foreground text-lg">Pedidos A Receber</h2>
              <span className="px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold">{orders.filter(o => (o.total - (o.paid || 0)) > 0).length}</span>
            </div>
            <button onClick={() => setShowAReceber(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => (o.total - (o.paid || 0)) > 0).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido a receber
              </div>
            ) : (
              orders.filter(o => (o.total - (o.paid || 0)) > 0).map(order => {
                const saldo = order.total - (order.paid || 0);
                return (
                  <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-warning/5 border border-warning/20">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-bold text-foreground text-sm">{order.number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {order.paid && order.paid > 0 && (
                        <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">
                          PAGO: {formatCurrency(order.paid)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                      <p className="text-[10px] font-extrabold text-warning mb-1">
                        SALDO: {formatCurrency(saldo)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status={order.status} />
                        <button
                          onClick={() => { setSelectedOrder(order); setShowAReceber(false); }}
                          className="w-7 h-7 rounded-lg bg-warning text-white flex items-center justify-center hover:bg-warning/80 transition-colors"
                          title="Ver Detalhes / Receber Pagamento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Aguardando Produção */}
      {showAguardandoProducao && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-info" />
              <h2 className="font-bold text-foreground text-lg">Pedidos Aguardando Produção</h2>
              <span className="px-2 py-1 rounded-full bg-info/20 text-info text-xs font-bold">{orders.filter(o => o.status === 'aprovado_financeiro').length}</span>
            </div>
            <button onClick={() => setShowAguardandoProducao(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status === 'aprovado_financeiro').length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido aguardando produção
              </div>
            ) : (
              orders.filter(o => o.status === 'aprovado_financeiro').map(order => (
                <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-info/5 border border-info/20">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-sm">{order.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <StatusBadge status={order.status} />
                      <button
                        onClick={() => { setSelectedOrder(order); setShowAguardandoProducao(false); }}
                        className="w-7 h-7 rounded-lg bg-info text-white flex items-center justify-center hover:bg-info/80 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Não mostrar Tabs se estiver vendo Consignados, Instalações ou Retiradas ou Recebido */}
      {!showConsignados && !showInstallations && !showRetiradas && !showRecebido && !showAguardandoAprovacao && !showAReceber && !showAguardandoProducao && (
        <>
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
                                <td className="font-medium text-foreground">
                                  {item.product}
                                  {item.sensorType && (
                                    <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.sensorType === 'com_sensor' ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground border border-border/40'}`}>
                                      {item.sensorType === 'com_sensor' ? '✓ COM SENSOR' : '⚪ SEM SENSOR'}
                                    </span>
                                  )}
                                </td>
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
                        <th className="cursor-pointer select-none text-left" onClick={() => handleSort('clientName')}>
                          Cliente {sortBy === 'clientName' && (sortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="hidden md:table-cell text-left">Tipo</th>
                        <th className="hidden md:table-cell text-left">Vendedor</th>
                        <th className="hidden md:table-cell text-left">Forma Pgto</th>
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
                          <td className="text-foreground">
                            <div className="flex items-center gap-1.5">
                              {order.clientName}
                              {(order.isConsigned || clients.find(c => c.id === order.clientId)?.consignado) && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold border border-amber-500/20" title="Cliente Consignado">
                                  ⭐ CONSIG.
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden md:table-cell">
                            {(() => {
                              const isConsigned = order.isConsigned ?? (clients.find(c => c.id === order.clientId)?.consignado || clients.find(c => c.name === order.clientName)?.consignado);
                              return isConsigned ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-extrabold uppercase border border-amber-500/20 shadow-sm">
                                  ⭐ Consignado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[9px] font-extrabold uppercase border border-slate-500/20">
                                  Normal
                                </span>
                              );
                            })()}
                          </td>
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
                                  onClick={() => aprovarEEnviarProducao(order.id)}
                                  className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 inline-flex items-center justify-center transition-colors"
                                  title="Aprovar e Enviar para Produção"
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
        </>
      )}
    </div>
  );
};

export default FinanceiroDashboard;
