import React, { useState, useMemo } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    isToday,
    startOfToday,
    isBefore,
    parseISO
} from 'date-fns';
import { ptBR as localePtBR } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    AlertCircle,
    Truck,
    User,
    MoreVertical,
    Eye,
    Info,
    Factory,
    Package
} from 'lucide-react';
import type { Order } from '@/types/erp';
import { formatCurrency } from '@/components/shared/StatusBadge';

interface ModernCalendarProps {
    orders: Order[];
    onDateClick: (date: Date) => void;
    onOrderClick: (order: Order) => void;
    role: 'vendedor' | 'financeiro' | 'producao';
}

const ModernCalendar: React.FC<ModernCalendarProps> = ({ orders, onDateClick, onOrderClick, role }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [selectedDayForList, setSelectedDayForList] = useState<Date | null>(null);

    // Month navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Calendar generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => {
        if (view === 'month') {
            return eachDayOfInterval({ start: startDate, end: endDate });
        } else if (view === 'week') {
            const weekStart = startOfWeek(currentDate, { locale: localePtBR });
            const weekEnd = endOfWeek(currentDate, { locale: localePtBR });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        } else {
            return [currentDate];
        }
    }, [currentDate, view, startDate, endDate]);

    const getOrdersForDay = (day: Date) => {
        return orders.filter(o => {
            const orderDate = o.installationDate || o.scheduledDate || o.deliveryDate || o.createdAt;
            if (!orderDate) return false;
            const parsed = new Date(orderDate.includes('T') ? orderDate : orderDate + 'T12:00:00');
            return isSameDay(parsed, day);
        });
    };

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight capitalize">
                            {format(currentDate, "MMMM 'de' yyyy", { locale: localePtBR })}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                            Cronograma de Operações
                        </p>
                    </div>
                </div>

                <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/40">
                    <button onClick={prevMonth} className="p-2 hover:bg-background rounded-lg transition-all hover:shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-background rounded-lg transition-all">Hoje</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-background rounded-lg transition-all hover:shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex p-1 bg-muted/30 rounded-xl border border-border/40">
                    {(['month', 'week', 'day'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${view === v ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-background'}`}
                        >
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map((day, i) => (
                    <div key={i} className="text-center py-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{day}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const rows = [];
        let days = [];

        calendarDays.forEach((day, i) => {
            const dayOrders = getOrdersForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, startOfToday());
            const isPastDay = isBefore(day, startOfToday()) && !isToday(day);

            const paidCount = dayOrders.filter(o => o.paymentStatus === 'pago' || o.statusPagamento === 'pago').length;
            const pendingCount = dayOrders.length - paidCount;

            days.push(
                <div
                    key={day.toString()}
                    onClick={() => {
                        if (getOrdersForDay(day).length > 0) {
                            setSelectedDayForList(day);
                        }
                        onDateClick(day);
                    }}
                    className={`
                      min-h-[180px] border-t border-l border-border/30 p-2 transition-all cursor-pointer relative group
                      ${!isCurrentMonth ? 'bg-muted/5 opacity-30 pointer-events-none' : 'bg-card hover:bg-muted/40'}
                      ${isToday(day) ? 'bg-primary/5' : ''}
              ${i % 7 === 6 ? 'border-r' : ''}
              ${Math.floor(i / 7) === 4 || Math.floor(i / 7) === 5 ? 'border-b' : ''}
            `}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`
                text-xs font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all duration-300
                ${isToday(day) 
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-110' 
                    : 'text-foreground/80 group-hover:text-primary group-hover:scale-110'}
              `}>
                             {format(day, 'd')}
                        </span>

                        {dayOrders.length > 0 && (
                            <div className="flex -space-x-1">
                                {paidCount > 0 && (
                                    <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] ring-1 ring-background" title={`${paidCount} pagos`} />
                                )}
                                {pendingCount > 0 && (
                                    <div className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_rgba(234,179,8,0.6)] ring-1 ring-background animate-pulse" title={`${pendingCount} pendentes`} />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5 overflow-hidden h-[120px] relative">
                        {dayOrders.slice(0, 6).map(order => {
                            const isPlanning = order.status === 'planejamento';
                            return (
                                <div
                                    key={order.id}
                                    onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                                    className={`
                                        px-2.5 py-1.5 rounded-xl text-[9px] font-black border truncate transition-all flex items-center justify-between gap-2
                                        backdrop-blur-sm shadow-sm hover:translate-x-1 hover:shadow-md active:scale-95
                                        ${isPlanning 
                                            ? 'bg-producao/5 text-producao border-producao/30 border-dashed'
                                            : order.paymentStatus === 'pago' || order.statusPagamento === 'pago'
                                                ? 'bg-success/5 text-success border-success/20'
                                                : 'bg-warning/5 text-warning border-warning/20'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        <div className={`w-1 h-1 rounded-full shrink-0 ${isPlanning ? 'bg-producao' : (order.paymentStatus === 'pago' ? 'bg-success' : 'bg-warning')}`} />
                                        <span className="shrink-0 opacity-70">{isPlanning ? 'PREV' : `#${order.number.split('-').pop()}`}</span>
                                        <span className="truncate">{order.clientName}</span>
                                    </div>
                                    {order.carrier && (
                                        <span className="text-[7px] font-black opacity-40 uppercase tracking-tighter shrink-0 bg-current/10 px-1 rounded-sm">
                                            {order.carrier}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {dayOrders.length > 3 && (
                            <div className="text-[8px] font-black text-primary uppercase pl-2 bg-primary/5 rounded-lg py-1 mt-1 inline-flex items-center gap-1 border border-primary/10 tracking-widest">
                                <Plus className="w-2 h-2" /> {dayOrders.length - 3} itens
                            </div>
                        )}
                    </div>


                </div>
            );

            if ((i + 1) % 7 === 0 || i === calendarDays.length - 1) {
                const cols = view === 'day' ? 'grid-cols-1' : 'grid-cols-7';
                rows.push(<div className={`grid ${cols}`} key={day.toString()}>{days}</div>);
                days = [];
            }
        });

        return <div className="rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/5">{rows}</div>;
    };

    const renderDayListModal = () => {
        if (!selectedDayForList) return null;
        const dayOrders = getOrdersForDay(selectedDayForList);

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="w-full max-w-lg glass-card border border-border/40 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col scale-100 shadow-primary/20">
                    <div className="p-6 border-b border-border/10 flex items-center justify-between bg-gradient-to-br from-primary/10 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">Pedidos do Dia</h3>
                                <p className="text-[10px] text-primary uppercase font-black tracking-[0.2em]">
                                    {format(selectedDayForList, "dd 'de' MMMM", { locale: localePtBR })}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedDayForList(null)} 
                            className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-xl transition-all"
                        >
                            <MoreVertical className="w-5 h-5 text-muted-foreground rotate-90" />
                        </button>
                    </div>

                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 bg-muted/5">
                        {dayOrders.map(order => (
                            <div 
                                key={order.id} 
                                onClick={() => { onOrderClick(order); setSelectedDayForList(null); }}
                                className="p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-foreground">#{order.number.split('-').pop()}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                                                order.status === 'planejamento' ? 'bg-producao/10 text-producao' : 
                                                order.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                            }`}>
                                                {order.status === 'planejamento' ? 'Previsão' : order.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{order.clientName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-foreground">{formatCurrency(order.total || 0)}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{order.carrier || 'Entrega'}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-border/10 bg-muted/5 flex justify-end">
                        <button 
                            onClick={() => setSelectedDayForList(null)}
                            className="px-6 py-2.5 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStats = () => {
        const totalOrders = orders.length;
        const paidOrders = orders.filter(o => o.paymentStatus === 'pago' || o.statusPagamento === 'pago').length;
        const planningOrders = orders.filter(o => o.status === 'planejamento').length;

        return (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
                {[
                    { label: 'Total Geral', value: totalOrders, color: 'primary', icon: CalendarIcon, gradient: 'from-primary/20 to-primary/5' },
                    { label: 'Confirmados', value: paidOrders, color: 'success', icon: CheckCircle2, gradient: 'from-success/20 to-success/5' },
                    { label: 'Pendentes', value: totalOrders - paidOrders - planningOrders, color: 'warning', icon: Clock, gradient: 'from-warning/20 to-warning/5' },
                    { label: 'Previsões', value: planningOrders, color: 'producao', icon: Factory, gradient: 'from-producao/20 to-producao/5' },
                    { label: 'Valor Estimado', value: formatCurrency(orders.reduce((s, o) => s + (o.total || 0), 0)), color: 'financeiro', icon: Info, gradient: 'from-financeiro/20 to-financeiro/5' },
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-3xl bg-card border border-border/40 shadow-sm flex flex-col gap-4 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden group`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="flex items-center justify-between relative z-10 w-full">
                            <div className={`w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center text-foreground shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                {stat.icon === Factory ? <Package className="w-6 h-6 text-producao" /> : <stat.icon className="w-6 h-6" />}
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none">{stat.label}</p>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-2xl font-black text-foreground tabular-nums group-hover:scale-105 origin-left transition-transform duration-500">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-700">
            {renderHeader()}
            <div className="bg-card/50 backdrop-blur-sm p-4 rounded-[2.5rem] border border-border/40 shadow-2xl shadow-primary/5">
                {view !== 'day' && renderDays()}
                {renderCells()}
            </div>
            {renderDayListModal()}
        </div>
    );
};

export default ModernCalendar;
