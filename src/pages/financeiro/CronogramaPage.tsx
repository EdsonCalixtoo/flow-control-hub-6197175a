import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import {
    CalendarClock,
    ArrowLeft,
    CheckCircle,
    X,
    Plus,
    Clock,
    DollarSign,
    CheckCircle2,
    Package,
    AlertCircle,
    User,
    Truck
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR as localePtBR } from 'date-fns/locale';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import ModernCalendar from '@/components/shared/ModernCalendar';
import type { Order } from '@/types/erp';
import { toast } from 'sonner';

const CronogramaFinanceiroPage: React.FC = () => {
    const { orders, updateOrderStatus } = useERP();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDayDetails, setShowDayDetails] = useState(false);
    const [loading, setLoading] = useState(false);

    const cronogramaOrders = orders.filter(o => o.isCronograma && o.orderType !== 'instalacao');

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setShowDayDetails(true);
    };

    const handleOrderClick = (order: Order) => {
        setSelectedOrder(order);
        setShowDayDetails(false);
    };

    const ordersOnSelectedDate = selectedDate
        ? cronogramaOrders.filter(o => {
            const dateStr = o.scheduledDate || o.deliveryDate || o.createdAt;
            if (!dateStr) return false;
            return isSameDay(new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00'), selectedDate);
        })
        : [];

    const aprovarCronograma = async (orderId: string) => {
        setLoading(true);
        try {
            await updateOrderStatus(
                orderId,
                'aguardando_producao',
                {
                    financeiroAprovado: true,
                    statusPagamento: 'pago'
                },
                'Financeiro Cronograma',
                'Cronograma aprovado para produção e liberado financeiramente'
            );
            toast.success('Agendamento aprovado com sucesso!');
            setSelectedOrder(null);
        } catch (error) {
            toast.error('Erro ao aprovar agendamento');
        } finally {
            setLoading(false);
        }
    };

    const renderOrderDetail = (order: Order) => (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header text-2xl">Detalhes do Agendamento</h1>
                    <p className="page-subtitle flex items-center gap-1.5">
                        <Truck className="w-4 h-4" /> {order.number} — {order.clientName}
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedOrder(null); setShowDayDetails(true); }}
                    className="p-3 bg-muted/40 hover:bg-muted rounded-2xl transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-section p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <CalendarClock className="w-32 h-32" />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">Data Agendada</span>
                                <p className="text-xl font-black text-foreground">
                                    {format(new Date((order.scheduledDate || order.createdAt).includes('T') ? (order.scheduledDate || order.createdAt) : (order.scheduledDate || order.createdAt) + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: localePtBR })}
                                </p>
                            </div>
                            <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-muted/30 border border-border/20">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Status Interno</span>
                                <StatusBadge status={order.status} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Package className="w-4 h-4" /> Itens do Pedido
                            </h3>
                            <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
                                <table className="modern-table">
                                    <thead>
                                        <tr className="bg-muted/20">
                                            <th>Produto</th>
                                            <th className="text-center">Qtd</th>
                                            <th className="text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map(item => (
                                            <tr key={item.id} className="hover:bg-muted/5">
                                                <td className="font-bold text-xs">{item.product}</td>
                                                <td className="text-center font-black">{item.quantity}</td>
                                                <td className="text-right font-black text-primary">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-primary/5">
                                            <td colSpan={2} className="text-right font-black text-xs uppercase pt-4">Valor Total do Agendamento</td>
                                            <td className="text-right font-black text-xl text-primary pt-4">{formatCurrency(order.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="card-section p-8 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Progresso do Orçamento</h3>
                        <OrderPipeline order={order} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-section p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                                {order.clientName[0]}
                            </div>
                            <div>
                                <p className="text-sm font-black text-foreground">{order.clientName}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">ID: {order.clientId.slice(0, 8)}</p>
                            </div>
                        </div>
                        <div className="h-px bg-border/40" />
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                            <User className="w-4 h-4" /> Vendedor: <span className="text-foreground">{order.sellerName}</span>
                        </div>
                    </div>

                    <div className="card-section p-6 space-y-4 bg-gradient-to-br from-card to-primary/5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Ações do Financeiro
                        </h3>

                        <div className="space-y-3">
                            {order.status === 'aguardando_financeiro' && (
                                <button
                                    onClick={() => aprovarCronograma(order.id)}
                                    disabled={loading}
                                    className="btn-primary w-full justify-center h-14 bg-gradient-to-r from-success to-success/80 text-sm font-black shadow-xl shadow-success/10 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? 'Aprovando...' : <><CheckCircle2 className="w-5 h-5 mr-2" /> APROVAR E LIBERAR</>}
                                </button>
                            )}

                            <button className="btn-modern w-full justify-center hover:bg-warning/10 hover:text-warning border-none text-xs font-black uppercase tracking-tighter shadow-none">
                                <AlertCircle className="w-4 h-4 mr-2" /> Solicitar Ajuste
                            </button>

                            <button className="btn-modern w-full justify-center text-destructive hover:bg-destructive/10 border-none text-xs font-black uppercase tracking-tighter shadow-none">
                                <X className="w-4 h-4 mr-2" /> Cancelar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDayDetails = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-border/30 flex items-center justify-between bg-primary/5">
                    <div>
                        <h2 className="text-lg font-black text-foreground">Agendamentos para o dia</h2>
                        <p className="text-xs text-primary font-bold uppercase">{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: localePtBR })}</p>
                    </div>
                    <button onClick={() => setShowDayDetails(false)} className="p-2 hover:bg-background rounded-xl transition-all">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 text-center">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Pedidos</p>
                            <p className="text-2xl font-black text-foreground">{ordersOnSelectedDate.length}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-success/5 border border-success/10 text-center">
                            <p className="text-[10px] font-black uppercase text-success tracking-widest">Valor Total</p>
                            <p className="text-2xl font-black text-success">
                                {formatCurrency(ordersOnSelectedDate.reduce((sum, o) => sum + o.total, 0))}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Lista de Pedidos</p>
                        {ordersOnSelectedDate.map(order => (
                            <div
                                key={order.id}
                                onClick={() => handleOrderClick(order)}
                                className="group p-4 rounded-2xl border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-card border border-border/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground text-sm">{order.number}</p>
                                            <p className="text-xs font-bold text-muted-foreground">{order.clientName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary">{formatCurrency(order.total)}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-muted/10 border-t border-border/30">
                    <button
                        onClick={() => {
                            toast.info("Função de criar agendamento direto pelo calendário");
                        }}
                        className="btn-primary w-full justify-center h-12 text-xs font-black uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Novo Agendamento para este dia
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header flex items-center gap-2 group">
                        <CalendarClock className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform" />
                        Cronograma (Agendamentos)
                    </h1>
                    <p className="page-subtitle">Gestão financeira de pedidos agendados para o futuro</p>
                </div>
            </div>

            {selectedOrder ? (
                renderOrderDetail(selectedOrder)
            ) : (
                <>
                    <ModernCalendar
                        orders={cronogramaOrders}
                        onDateClick={handleDateClick}
                        onOrderClick={handleOrderClick}
                        role="financeiro"
                    />
                    {showDayDetails && renderDayDetails()}
                </>
            )}
        </div>
    );
};

export default CronogramaFinanceiroPage;
