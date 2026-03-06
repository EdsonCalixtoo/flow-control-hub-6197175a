import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import {
    CalendarClock,
    ArrowLeft,
    CheckCircle,
    X,
    Play,
    Printer,
    Package,
    AlertCircle,
    User,
    Truck,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { format, isSameDay, ptBR } from 'date-fns';
import { ptBR as localePtBR } from 'date-fns/locale';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import ModernCalendar from '@/components/shared/ModernCalendar';
import type { Order } from '@/types/erp';
import { toast } from 'sonner';

const CronogramaProducaoPage: React.FC = () => {
    const { orders, updateOrderStatus } = useERP();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDayDetails, setShowDayDetails] = useState(false);
    const [loading, setLoading] = useState(false);

    // Na produção, mostramos apenas pedidos que já passaram pelo financeiro ou estão em produção
    const producaoOrders = orders.filter(o =>
        (o.isCronograma || o.scheduledDate || o.orderType === 'instalacao') &&
        ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
    );

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setShowDayDetails(true);
    };

    const handleOrderClick = (order: Order) => {
        setSelectedOrder(order);
        setShowDayDetails(false);
    };

    const ordersOnSelectedDate = selectedDate
        ? producaoOrders.filter(o => {
            const dateStr = o.scheduledDate || o.deliveryDate || o.installationDate || o.createdAt;
            if (!dateStr) return false;
            return isSameDay(new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00'), selectedDate);
        })
        : [];

    const iniciarProducao = async (orderId: string) => {
        setLoading(true);
        try {
            await updateOrderStatus(orderId, 'em_producao', { statusProducao: 'Iniciado via Cronograma' }, 'Produção', 'Início da produção confirmado');
            toast.success('Produção iniciada!');
            setSelectedOrder(prev => prev ? { ...prev, status: 'em_producao' } : null);
        } catch (error) {
            toast.error('Erro ao iniciar produção');
        } finally {
            setLoading(false);
        }
    };

    const finalizarProducao = async (orderId: string) => {
        setLoading(true);
        try {
            await updateOrderStatus(orderId, 'producao_finalizada', { statusProducao: 'Finalizado via Cronograma' }, 'Produção', 'Produção finalizada');
            toast.success('Produção finalizada!');
            setSelectedOrder(prev => prev ? { ...prev, status: 'producao_finalizada' } : null);
        } catch (error) {
            toast.error('Erro ao finalizar produção');
        } finally {
            setLoading(false);
        }
    };

    const renderOrderDetail = (order: Order) => {
        const financeiroAprovado = order.financeiroAprovado || ['pago', 'parcial'].includes(order.paymentStatus || '');

        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-header text-2xl">Gestão de Produção</h1>
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
                                <Package className="w-32 h-32" />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-producao/5 border border-producao/10">
                                    <span className="text-[10px] font-black uppercase text-producao tracking-widest block mb-1">Data Agendada</span>
                                    <p className="text-xl font-black text-foreground">
                                        {format(new Date((order.scheduledDate || order.installationDate || order.createdAt).includes('T') ? (order.scheduledDate || order.installationDate || order.createdAt) : (order.scheduledDate || order.installationDate || order.createdAt) + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: localePtBR })}
                                    </p>
                                </div>
                                <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-muted/30 border border-border/20">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Status Produção</span>
                                    <StatusBadge status={order.status} />
                                </div>
                            </div>

                            {/* Alerta de Liberação Financeira */}
                            <div className={`p-4 rounded-2xl flex items-center gap-3 border ${financeiroAprovado ? 'bg-success/10 border-success/20 text-success' : 'bg-warning/10 border-warning/20 text-warning'
                                }`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${financeiroAprovado ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                    {financeiroAprovado ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">{financeiroAprovado ? 'Liberado para Envio' : 'Aguardando Pagamento'}</p>
                                    <p className="text-[10px] opacity-80">{financeiroAprovado ? 'O financeiro já confirmou o pagamento deste pedido.' : 'Este pedido ainda não teve o pagamento confirmado pelo financeiro.'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Especificação Técnica
                                </h3>
                                <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
                                    <table className="modern-table">
                                        <thead>
                                            <tr className="bg-muted/20">
                                                <th>Item</th>
                                                <th className="text-center">Quantidade</th>
                                                <th>Detalhes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map(item => (
                                                <tr key={item.id} className="hover:bg-muted/5">
                                                    <td className="font-bold text-xs">{item.product}</td>
                                                    <td className="text-center font-black">{item.quantity}</td>
                                                    <td className="text-xs text-muted-foreground">{item.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="card-section p-8 space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Linha do Tempo</h3>
                            <OrderPipeline order={order} />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="card-section p-6 space-y-4 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-3xl shadow-inner">
                                {order.clientName[0]}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">{order.clientName}</h3>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ID Cliente: {order.clientId.slice(0, 8)}</p>
                            </div>
                            <div className="w-full h-px bg-border/40" />
                            <div className="w-full flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>Vendedor</span>
                                <span className="text-foreground">{order.sellerName}</span>
                            </div>
                        </div>

                        <div className="card-section p-6 space-y-4 bg-gradient-to-br from-card to-producao/5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ações de Produção</h3>

                            <div className="space-y-3">
                                {order.status === 'aguardando_producao' && (
                                    <button
                                        onClick={() => iniciarProducao(order.id)}
                                        disabled={loading}
                                        className="btn-primary w-full justify-center h-14 bg-gradient-to-r from-producao to-producao/80 text-sm font-black shadow-xl shadow-producao/10 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Play className="w-5 h-5 mr-2" /> INICIAR PRODUÇÃO
                                    </button>
                                )}

                                {order.status === 'em_producao' && (
                                    <button
                                        onClick={() => finalizarProducao(order.id)}
                                        disabled={loading}
                                        className="btn-primary w-full justify-center h-14 bg-gradient-to-r from-success to-success/80 text-sm font-black shadow-xl shadow-success/10 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <CheckCircle2 className="w-5 h-5 mr-2" /> FINALIZAR PRODUÇÃO
                                    </button>
                                )}

                                <button
                                    disabled={!financeiroAprovado}
                                    className={`btn-modern w-full justify-center h-12 text-xs font-black uppercase tracking-widest border-2 ${financeiroAprovado ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10' : 'bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <Printer className="w-4 h-4 mr-2" /> {financeiroAprovado ? 'Imprimir Etiqueta' : 'Etiqueta Bloqueada'}
                                </button>

                                {!financeiroAprovado && (
                                    <p className="text-[9px] text-center text-warning font-black uppercase px-4 leading-relaxed tracking-tighter">
                                        ⚠ Liberação financeira pendente. Etiqueta bloqueada por segurança.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDayDetails = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-border/30 flex items-center justify-between bg-producao/5">
                    <div>
                        <h2 className="text-lg font-black text-foreground">Operações para o dia</h2>
                        <p className="text-xs text-producao font-bold uppercase">{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: localePtBR })}</p>
                    </div>
                    <button onClick={() => setShowDayDetails(false)} className="p-2 hover:bg-background rounded-xl transition-all">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="space-y-3">
                        {ordersOnSelectedDate.length === 0 ? (
                            <div className="py-12 text-center opacity-50">
                                <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm font-bold uppercase tracking-widest">Nenhuma tarefa para este dia</p>
                            </div>
                        ) : (
                            ordersOnSelectedDate.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => handleOrderClick(order)}
                                    className="group p-4 rounded-2xl border border-border/30 hover:border-producao/40 hover:bg-producao/5 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-card border border-border/30 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-foreground text-sm">{order.number}</p>
                                                    <div className={`w-2 h-2 rounded-full ${(order.financeiroAprovado || ['pago', 'parcial'].includes(order.paymentStatus || '')) ? 'bg-success' : 'bg-warning animate-pulse'
                                                        }`} />
                                                </div>
                                                <p className="text-xs font-bold text-muted-foreground">{order.clientName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={order.status} />
                                            <p className="text-[9px] font-black uppercase text-muted-foreground mt-1">{order.items.length} itens</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (selectedOrder) {
        return renderOrderDetail(selectedOrder);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header flex items-center gap-2 group">
                        <Package className="w-8 h-8 text-producao group-hover:scale-110 transition-transform" />
                        Cronograma de Produção
                    </h1>
                    <p className="page-subtitle">Acompanhe e execute os pedidos planejados para hoje e datas futuras</p>
                </div>
            </div>

            <ModernCalendar
                orders={producaoOrders}
                onDateClick={handleDateClick}
                onOrderClick={handleOrderClick}
                role="producao"
            />

            {showDayDetails && renderDayDetails()}
        </div>
    );
};

export default CronogramaProducaoPage;
