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
    Info
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

    // Month navigation
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Calendar generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    const getOrdersForDay = (day: Date) => {
        return orders.filter(o => {
            const orderDate = o.scheduledDate || o.deliveryDate || o.createdAt;
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
                    onClick={() => onDateClick(day)}
                    className={`
              min-h-[140px] border-t border-l border-border/30 p-2 transition-all cursor-pointer relative group
              ${!isCurrentMonth ? 'bg-muted/5 opacity-30 pointer-events-none' : 'bg-card hover:bg-primary/[0.02]'}
              ${isToday(day) ? 'bg-primary/5' : ''}
              ${i % 7 === 6 ? 'border-r' : ''}
              ${Math.floor(i / 7) === 4 || Math.floor(i / 7) === 5 ? 'border-b' : ''}
            `}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`
                text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg
                ${isToday(day) ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground/80'}
              `}>
                            {format(day, 'd')}
                        </span>

                        {dayOrders.length > 0 && (
                            <div className="flex gap-1">
                                {paidCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-success shadow-sm" title={`${paidCount} pagos`} />}
                                {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-warning shadow-sm animate-pulse" title={`${pendingCount} pendentes`} />}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1 overflow-hidden h-[90px]">
                        {dayOrders.slice(0, 3).map(order => (
                            <div
                                key={order.id}
                                onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                                className={`
                    px-2 py-1 rounded-lg text-[9px] font-bold border truncate transition-all flex items-center gap-1
                    ${order.paymentStatus === 'pago' || order.statusPagamento === 'pago'
                                        ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                                        : 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
                                    }
                  `}
                            >
                                <span className="shrink-0">{order.number.split('-').pop()}</span>
                                <span className="truncate">{order.clientName}</span>
                            </div>
                        ))}
                        {dayOrders.length > 3 && (
                            <div className="text-[8px] font-black text-muted-foreground uppercase pl-1 bg-muted/20 rounded py-0.5 inline-block px-1.5 tracking-tighter">
                                + {dayOrders.length - 3} pedidos
                            </div>
                        )}
                    </div>

                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none border-2 border-primary/50 rounded-xl m-1">
                        <Plus className="w-8 h-8 text-primary drop-shadow-md" />
                    </div>
                </div>
            );

            if ((i + 1) % 7 === 0) {
                rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
                days = [];
            }
        });

        return <div className="rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/5">{rows}</div>;
    };

    const renderStats = () => {
        const totalOrders = orders.length;
        const paidOrders = orders.filter(o => o.paymentStatus === 'pago' || o.statusPagamento === 'pago').length;

        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {[
                    { label: 'Total Mês', value: totalOrders, color: 'primary', icon: CalendarIcon },
                    { label: 'Pagos', value: paidOrders, color: 'success', icon: CheckCircle2 },
                    { label: 'Pendentes', value: totalOrders - paidOrders, color: 'warning', icon: Clock },
                    { label: 'Valor Total', value: formatCurrency(orders.reduce((s, o) => s + o.total, 0)), color: 'financeiro', icon: Info },
                ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border border-border/40 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground shadow-inner`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
                            <p className="text-lg font-black text-foreground">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-700">
            {renderHeader()}
            <div className="bg-card p-2 rounded-3xl border border-border/40 shadow-xl">
                {renderDays()}
                {renderCells()}
            </div>
            {renderStats()}
        </div>
    );
};

export default ModernCalendar;
