import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Search, Filter, ChevronDown, Eye, CheckCircle, Send, Package, TrendingUp, DollarSign, Clock, Star, Inbox, ArrowLeft } from 'lucide-react';
import type { Order, FinancialEntry } from '@/types/erp';
import { useNavigate } from 'react-router-dom';

const STATUS_VISIVEL_FINANCEIRO = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
];

type PaymentFilter = 'todos' | 'pago' | 'pendente' | 'vencido' | 'cancelado';
type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado' | 'todos';

const PedidosFinanceiroPage: React.FC = () => {
    const navigate = useNavigate();
    const { orders, clients, financialEntries, updateOrderStatus, addFinancialEntry, loadFromSupabase } = useERP();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<PaymentFilter>('todos');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<'number' | 'clientName' | 'total' | 'createdAt'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showReject, setShowReject] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const itemsPerPage = 12;

    const ordersVisiveisFinanceiro = useMemo(
        () => orders.filter(o => STATUS_VISIVEL_FINANCEIRO.includes(o.status)),
        [orders]
    );

    const getSaldoDevedor = (orderId: string, orderTotal: number) => {
        const pagos = financialEntries
            .filter(e => e.orderId === orderId && e.type === 'receita' && e.status === 'pago')
            .reduce((s, e) => s + e.amount, 0);
        return Math.max(0, orderTotal - pagos);
    };

    const aprovarEEnviarProducao = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const client = clients.find(c => c.id === order.clientId);
        const actualClient = client || clients.find(c => c.name === order.clientName);
        const isConsignado = actualClient?.consignado === true;

        if (isConsignado) {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
                'Financeiro',
                'Consignado: Aprovado para produção sem obrigatoriedade de pagamento imediato'
            );
        } else if (order.orderType === 'instalacao') {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
                'Financeiro',
                'Instalação: Aprovado para produção. Pagamento será controlado pelo financeiro.'
            );
        } else if (order.orderType === 'retirada') {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
                'Financeiro',
                'Retirada: Aprovado para produção. Pagamento será controlado pelo financeiro.'
            );
        } else {
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
            await updateOrderStatus(orderId, 'aguardando_producao', { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true }, 'Financeiro', 'Pagamento aprovado - Enviando para produção');
        }

        setSelectedOrder(null);
        setShowReject(false);
        setRejectReason('');
    };

    const filteredOrders = useMemo(() => {
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

    const aguardandoFinanceiro = ordersVisiveisFinanceiro.filter(o => o.status === 'aguardando_financeiro').length;
    const aprovadosFinanceiro = ordersVisiveisFinanceiro.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_producao').length;
    const emProducao = ordersVisiveisFinanceiro.filter(o => o.status === 'em_producao').length;

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
                                                {item.isReward && (
                                                    <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-success text-white animate-pulse">
                                                        🎁 PREMIADO (R$ 0,00)
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

                    {/* Sidebar de status e ações */}
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

                        {/* Ações Progressivas */}
                        <div className="card-section p-6 space-y-4 shadow-lg border-primary/20 bg-primary/5">
                            <h3 className="font-bold text-primary text-sm uppercase tracking-wider">Ações do Pedido</h3>
                            <div className="space-y-3">
                                {selectedOrder.status === 'aguardando_financeiro' && (
                                    <>
                                        {showReject ? (
                                            <div className="space-y-3 animate-fade-in">
                                                <textarea
                                                    value={rejectReason}
                                                    onChange={e => setRejectReason(e.target.value)}
                                                    placeholder="Motivo da rejeição..."
                                                    className="input-modern min-h-[80px] text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            updateOrderStatus(selectedOrder.id, 'rejeitado_financeiro', { rejectionReason: rejectReason }, 'Financeiro', `Rejeitado: ${rejectReason}`);
                                                            setSelectedOrder(null);
                                                            setShowReject(false);
                                                        }}
                                                        disabled={!rejectReason.trim()}
                                                        className="btn-modern bg-destructive text-white flex-1 text-xs justify-center"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button onClick={() => setShowReject(false)} className="btn-modern bg-muted text-foreground px-4 text-xs">Voltar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => aprovarEEnviarProducao(selectedOrder.id)}
                                                    className="btn-primary w-full justify-center py-3"
                                                >
                                                    <CheckCircle className="w-5 h-5" /> Aprovar e Enviar Produção
                                                </button>
                                                <button
                                                    onClick={() => setShowReject(true)}
                                                    className="btn-modern bg-destructive/10 text-destructive hover:bg-destructive/20 w-full justify-center text-xs"
                                                >
                                                    Rejeitar Pedido
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {(selectedOrder.status === 'aprovado_financeiro' || selectedOrder.status === 'aguardando_producao') && (
                                    <button
                                        onClick={() => updateOrderStatus(selectedOrder.id, 'em_producao', undefined, 'Financeiro', 'Liberado para produção')}
                                        className="btn-modern bg-financeiro text-white w-full justify-center py-3 shadow-md"
                                    >
                                        <Send className="w-5 h-5 text-white" /> Liberar para Produção
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate(`/financeiro?view=${selectedOrder.id}`)}
                                    className="btn-modern bg-muted text-foreground w-full justify-center text-xs"
                                >
                                    <Eye className="w-4 h-4" /> Ver no Financeiro Completo
                                </button>
                            </div>
                        </div>

                        {/* Histórico Simplificado */}
                        <div className="card-section p-6 space-y-4">
                            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Histórico Recente</h3>
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
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Modernizado */}
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -m-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />
                <div className="absolute bottom-0 left-0 -m-12 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
                
                <div className="relative flex items-center justify-between flex-wrap gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight uppercase">Gestão de Pedidos</h1>
                        </div>
                        <p className="text-slate-400 font-medium max-w-md">Acompanhamento detalhado e controle de status de todos os pedidos ativos.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger-children">
                <div className="card-premium border-amber-500/20">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Aguardando</p>
                            <p className="text-3xl font-black text-foreground">{aguardandoFinanceiro}</p>
                            <span className="text-[10px] text-muted-foreground font-medium">Pedidos pendentes</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="card-premium border-success/20">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-success uppercase tracking-widest">Aprovados</p>
                            <p className="text-3xl font-black text-foreground">{aprovadosFinanceiro}</p>
                            <span className="text-[10px] text-muted-foreground font-medium">Aguardando produção</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="card-premium border-info/20">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-info uppercase tracking-widest">Em Produção</p>
                            <p className="text-3xl font-black text-foreground">{emProducao}</p>
                            <span className="text-[10px] text-muted-foreground font-medium">Linha de montagem</span>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center text-info">
                            <Package className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-section p-6 space-y-6 glass-premium">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[300px] group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por número do pedido ou nome do cliente..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="input-modern pl-11 py-3.5 bg-background shadow-inner border-border/40 focus:border-primary/50 transition-all rounded-2xl"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className={`btn-modern px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${showFilters ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                        <Filter className="w-4 h-4" /> Filtros Avançados
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-[1.5rem] bg-muted/20 border border-border/40 animate-scale-in">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status de Pagamento</label>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value as PaymentFilter); setCurrentPage(1); }}
                                className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                            >
                                <option value="todos">Todos os Status</option>
                                <option value="pago">Confirmado (Pago)</option>
                                <option value="pendente">Aguardando Pagamento</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Período de Referência</label>
                            <select
                                value={periodFilter}
                                onChange={e => { setPeriodFilter(e.target.value as PeriodFilter); setCurrentPage(1); }}
                                className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                            >
                                <option value="todos">Todo o histórico</option>
                                <option value="hoje">Hoje</option>
                                <option value="7dias">Última semana</option>
                                <option value="30dias">Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Método de Pagamento</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={e => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
                                className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                            >
                                <option value="todos">Qualquer método</option>
                                <option value="Pix">Pix (Imediato)</option>
                                <option value="Boleto">Boleto Bancário</option>
                                <option value="Cartão">Cartão de Crédito</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-section glass-premium overflow-hidden border-none shadow-xl">
                <div className="overflow-x-auto">
                    <table className="modern-table">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="cursor-pointer select-none py-5" onClick={() => handleSort('number')}>
                                    <div className="flex items-center gap-1">Ref. Pedido {sortBy === 'number' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                                </th>
                                <th className="cursor-pointer select-none text-left py-5" onClick={() => handleSort('clientName')}>
                                    <div className="flex items-center gap-1">Cliente {sortBy === 'clientName' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                                </th>
                                <th className="hidden md:table-cell text-left py-5">Vendedor Responsável</th>
                                <th className="cursor-pointer select-none text-right py-5" onClick={() => handleSort('total')}>
                                    <div className="flex items-center justify-end gap-1">Valor Total {sortBy === 'total' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                                </th>
                                <th className="py-5">Status Pedido</th>
                                <th className="py-5">Fluxo Financeiro</th>
                                <th className="text-right py-5 pr-8">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {paginatedOrders.map(order => (
                                <tr key={order.id} className="group hover:bg-primary/[0.02] transition-all duration-300">
                                    <td className="font-extrabold text-foreground py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                            #{order.number}
                                        </div>
                                    </td>
                                    <td className="text-foreground py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm tracking-tight">{order.clientName}</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                {(order.isConsigned || clients.find(c => c.id === order.clientId)?.consignado) && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20">CONSIGNADO</span>
                                                )}
                                                {order.items.some(i => i.isReward) && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black animate-pulse">PRÊMIO</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                                                {order.sellerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="text-xs font-medium text-foreground/70">{order.sellerName}</span>
                                        </div>
                                    </td>
                                    <td className="text-right font-black text-foreground py-5 tabular-nums tracking-tighter">{formatCurrency(order.total)}</td>
                                    <td className="py-5"><StatusBadge status={order.status} /></td>
                                    <td className="py-5">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border tracking-wider ${order.paymentStatus === 'pago' 
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${order.paymentStatus === 'pago' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                            {order.paymentStatus === 'pago' ? 'PAGO' : 'AGUARDANDO'}
                                        </div>
                                    </td>
                                    <td className="text-right py-5 pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="w-10 h-10 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all shadow-sm"
                                                title="Ver Detalhes"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {order.status === 'aguardando_financeiro' && (
                                                <button
                                                    onClick={() => aprovarEEnviarProducao(order.id)}
                                                    className="w-10 h-10 rounded-xl bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                                                    title="Aprovar Agora"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 text-muted-foreground italic">
                                        <Inbox className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        Nenhum pedido encontrado com os filtros aplicados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border/20 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos encontrados</p>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-4 py-2 rounded-xl bg-background border border-border/40 text-xs font-bold disabled:opacity-30 hover:bg-muted transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-4 py-2 rounded-xl bg-background border border-border/40 text-xs font-bold disabled:opacity-30 hover:bg-muted transition-colors"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PedidosFinanceiroPage;
