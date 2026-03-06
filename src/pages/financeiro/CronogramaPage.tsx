import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { CalendarClock, Eye, Search, Filter, History, Truck, User, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { format, isFuture, isPast, isSameDay, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import type { Order } from '@/types/erp';

const CronogramaFinanceiroPage: React.FC = () => {
    const { orders, updateOrderStatus } = useERP();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'todos' | 'futuros' | 'hoje'>('todos');

    const cronogramaOrders = orders.filter(o => o.isCronograma);

    const filtered = cronogramaOrders.filter(o => {
        const matchesSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
        const date = o.scheduledDate ? new Date(o.scheduledDate + 'T12:00:00') : null;
        if (!date) return matchesSearch;

        if (filter === 'futuros') return matchesSearch && isFuture(date);
        if (filter === 'hoje') return matchesSearch && isSameDay(date, startOfToday());
        return matchesSearch;
    }).sort((a, b) => new Date(a.scheduledDate || '').getTime() - new Date(b.scheduledDate || '').getTime());

    const aprovarCronograma = async (orderId: string) => {
        await updateOrderStatus(orderId, 'aguardando_producao', {}, 'Financeiro Cronograma', 'Cronograma aprovado para produção');
        setSelectedOrder(null);
    };

    if (selectedOrder) {
        return (
            <div className="space-y-6 animate-scale-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-header">Análise de Agendamento</h1>
                        <p className="page-subtitle">{selectedOrder.number} - {selectedOrder.clientName}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <div className="card-section p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <History className="w-4 h-4" /> Detalhes do Agendamento
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <span className="text-[10px] text-primary uppercase font-bold block mb-1">Data Agendada</span>
                                    <span className="text-lg font-black text-foreground">
                                        {format(new Date(selectedOrder.scheduledDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Status Atual</span>
                                    <StatusBadge status={selectedOrder.status} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Produtos</p>
                                <div className="border border-border/40 rounded-xl overflow-hidden">
                                    <table className="modern-table">
                                        <thead>
                                            <tr className="bg-muted/30">
                                                <th>Produto</th>
                                                <th className="text-center">Qtd</th>
                                                <th className="text-right">Unid.</th>
                                                <th className="text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="font-semibold text-xs">{item.product}</td>
                                                    <td className="text-center font-bold">{item.quantity}</td>
                                                    <td className="text-right text-xs">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="text-right font-black">{formatCurrency(item.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/10">
                                                <td colSpan={3} className="text-right font-bold text-sm">TOTAL</td>
                                                <td className="text-right font-black text-primary text-sm">{formatCurrency(selectedOrder.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.observation && (
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Observações do Vendedor</p>
                                    <p className="text-sm italic text-foreground/80">{selectedOrder.observation}</p>
                                </div>
                            )}
                        </div>

                        <div className="card-section p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Progresso do Pedido</h3>
                            <OrderPipeline order={selectedOrder} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="card-section p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <User className="w-4 h-4" /> Cliente & Vendedor
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {selectedOrder.clientName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{selectedOrder.clientName}</p>
                                        <p className="text-xs text-muted-foreground">ID Cliente: {selectedOrder.clientId.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <div className="h-px bg-border/40" />
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{selectedOrder.sellerName}</p>
                                        <p className="text-xs text-muted-foreground">Vendedor Responsável</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-section p-6 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ações Financeiras</h3>
                            <div className="grid gap-3">
                                {selectedOrder.status === 'rascunho' && (
                                    <button
                                        onClick={() => aprovarCronograma(selectedOrder.id)}
                                        className="btn-primary w-full justify-center bg-gradient-to-r from-success to-success/80 h-12 text-sm font-black shadow-lg shadow-success/20"
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" /> APROVAR AGENDAMENTO
                                    </button>
                                )}
                                <button className="btn-modern bg-muted w-full justify-center text-xs font-bold uppercase tracking-tight">
                                    Marcar como Pendente
                                </button>
                                <button className="btn-modern bg-destructive/10 text-destructive w-full justify-center text-xs font-bold uppercase tracking-tight hover:bg-destructive/20 shadow-none">
                                    Rejeitar / Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-primary" /> Cronograma Financeiro
                    </h1>
                    <p className="page-subtitle">Acompanhe os pedidos agendados para datas futuras</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex p-1 bg-muted/30 rounded-xl border border-border/40 w-full md:w-fit">
                    {(['todos', 'hoje', 'futuros'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-muted/50'}`}
                        >
                            {f === 'todos' ? 'Todos' : f === 'hoje' ? 'Hoje' : 'Futuros'}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou pedido..."
                        className="input-modern pl-10"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full card-section p-12 text-center opacity-50 flex flex-col items-center gap-4">
                        <CalendarClock className="w-12 h-12 text-muted-foreground" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum pedido agendado encontrado</p>
                    </div>
                ) : (
                    filtered.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="card-section p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group bg-gradient-to-br from-card to-muted/10 border-l-4 border-l-primary"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-black text-foreground">{order.number}</span>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{order.clientName}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">ID: {order.clientId.slice(0, 8)}</p>
                                </div>

                                <div className="flex items-center justify-between py-2 border-y border-border/40">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-black text-primary">
                                            {format(new Date(order.scheduledDate + 'T12:00:00'), "dd/MM/yyyy")}
                                        </span>
                                    </div>
                                    <span className="text-sm font-black text-foreground">{formatCurrency(order.total)}</span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.sellerName}</span>
                                    <span className="uppercase">{order.items.length} itens</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CronogramaFinanceiroPage;
