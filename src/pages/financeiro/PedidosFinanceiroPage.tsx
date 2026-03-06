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
                { paymentStatus: order.paymentStatus || 'pendente' },
                'Financeiro',
                'Consignado: Aprovado para produção sem obrigatoriedade de pagamento imediato'
            );
        } else if (order.orderType === 'instalacao') {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                { paymentStatus: order.paymentStatus || 'pendente' },
                'Financeiro',
                'Instalação: Aprovado para produção. Pagamento será controlado pelo financeiro.'
            );
        } else if (order.orderType === 'retirada') {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                { paymentStatus: order.paymentStatus || 'pendente' },
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
            await updateOrderStatus(orderId, 'aguardando_producao', { paymentStatus: 'pago' }, 'Financeiro', 'Pagamento aprovado - Enviando para produção');
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
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card-section p-6">
                            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Informações do Pedido</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {[
                                    { label: 'Cliente', value: selectedOrder.clientName },
                                    { label: 'Vendedor', value: selectedOrder.sellerName },
                                    { label: 'Data Criação', value: new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR') },
                                    { label: 'Status Atual', value: selectedOrder.status.replace('_', ' ').toUpperCase() },
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
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="text-foreground font-medium">{item.product}</td>
                                            <td className="text-right text-foreground">{item.quantity}</td>
                                            <td className="text-right font-bold text-foreground">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="px-5 py-4 border-t border-border/40 flex justify-end items-center">
                                <span className="text-lg font-extrabold text-foreground">{formatCurrency(selectedOrder.total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="card-section p-6 space-y-4">
                            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Ações</h3>
                            {selectedOrder.status === 'aguardando_financeiro' && (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => aprovarEEnviarProducao(selectedOrder.id)}
                                        className="btn-primary w-full justify-center"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprovar e Enviar Produção
                                    </button>
                                </div>
                            )}
                            {selectedOrder.status === 'aprovado_financeiro' && (
                                <button
                                    onClick={() => updateOrderStatus(selectedOrder.id, 'aguardando_producao', undefined, 'Financeiro', 'Liberado para produção')}
                                    className="btn-modern bg-financeiro text-white w-full justify-center"
                                >
                                    <Send className="w-4 h-4" /> Liberar para Produção
                                </button>
                            )}
                            <button
                                onClick={() => navigate(`/financeiro?view=${selectedOrder.id}`)}
                                className="btn-modern bg-muted text-foreground w-full justify-center"
                            >
                                <Eye className="w-4 h-4" /> Ver no Dashboard Completo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-header">Gestão de Pedidos</h1>
                    <p className="page-subtitle">Acompanhamento detalhado de todos os pedidos no financeiro</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
                <StatCard title="Aguardando Aprovação" value={aguardandoFinanceiro} icon={Clock} color="text-warning" />
                <StatCard title="Aprovados / Aguard. Prod." value={aprovadosFinanceiro} icon={CheckCircle} color="text-success" />
                <StatCard title="Em Produção" value={emProducao} icon={Package} color="text-info" />
            </div>

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
                    <div className="flex items-center gap-3 flex-wrap animate-fade-in shadow-inner p-4 rounded-xl bg-muted/20 border border-border/40">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status de Pagamento</label>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value as PaymentFilter); setCurrentPage(1); }}
                                className="input-modern py-2 text-xs"
                            >
                                <option value="todos">Todos</option>
                                <option value="pago">Pago</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
                            <select
                                value={periodFilter}
                                onChange={e => { setPeriodFilter(e.target.value as PeriodFilter); setCurrentPage(1); }}
                                className="input-modern py-2 text-xs"
                            >
                                <option value="todos">Todos os tempos</option>
                                <option value="hoje">Hoje</option>
                                <option value="7dias">Últimos 7 dias</option>
                                <option value="30dias">Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de Pagamento</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={e => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
                                className="input-modern py-2 text-xs"
                            >
                                <option value="todos">Todas as formas</option>
                                <option value="Pix">Pix</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Cartão">Cartão</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-section">
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
                                <th className="hidden md:table-cell text-left">Vendedor</th>
                                <th className="cursor-pointer select-none text-right" onClick={() => handleSort('total')}>
                                    Valor {sortBy === 'total' && (sortDir === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Status</th>
                                <th>Pagamento</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedOrders.map(order => (
                                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="font-bold text-foreground">{order.number}</td>
                                    <td className="text-foreground">
                                        <div className="flex items-center gap-1.5 line-clamp-1">
                                            {order.clientName}
                                            {(order.isConsigned || clients.find(c => c.id === order.clientId)?.consignado) && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold border border-amber-500/20">
                                                    ⭐
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell text-foreground text-xs">{order.sellerName}</td>
                                    <td className="text-right font-semibold text-foreground">{formatCurrency(order.total)}</td>
                                    <td><StatusBadge status={order.status} /></td>
                                    <td>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${order.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                            {order.paymentStatus === 'pago' ? 'PAGO' : 'PENDENTE'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors shadow-sm"
                                                title="Ver Detalhes"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            {order.status === 'aguardando_financeiro' && (
                                                <button
                                                    onClick={() => aprovarEEnviarProducao(order.id)}
                                                    className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 inline-flex items-center justify-center transition-colors shadow-sm"
                                                    title="Aprovar e Enviar para Produção"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {order.status === 'aprovado_financeiro' || order.status === 'aguardando_producao' ? (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'em_producao', undefined, 'Financeiro', 'Liberado para produção')}
                                                    className="w-8 h-8 rounded-lg bg-financeiro/10 text-financeiro hover:bg-financeiro/20 inline-flex items-center justify-center transition-colors shadow-sm"
                                                    title="Liberar Produção"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground italic">
                                        Nenhum pedido encontrado com os filtros aplicados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-border/40 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos</p>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="btn-modern bg-muted text-foreground p-2 disabled:opacity-30"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="btn-modern bg-muted text-foreground p-2 disabled:opacity-30"
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
