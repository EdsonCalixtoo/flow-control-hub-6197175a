import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const FluxoCaixaPage: React.FC = () => {
    const { financialEntries, orders, clients } = useERP();
    const [period, setPeriod] = useState<'6m' | '12m'>('12m');

    // Calcula dados reais baseado em pedidos aprovados e lançamentos financeiros categorizados
    const monthlyDataReal = useMemo(() => {
        const data: Record<number, { entradas: number; saidas: number; consignado: number; instalacao: number; retirada: number }> = {};

        // Inicializa todos os meses
        for (let i = 0; i < 12; i++) {
            data[i] = { entradas: 0, saidas: 0, consignado: 0, instalacao: 0, retirada: 0 };
        }

        // Adiciona lançamentos financeiros reais (apenas os PAGOS)
        financialEntries.filter(e => e.status === 'pago').forEach(entry => {
            const date = new Date(entry.date);
            const month = date.getMonth();
            if (!data[month]) data[month] = { entradas: 0, saidas: 0, consignado: 0, instalacao: 0, retirada: 0 };

            if (entry.type === 'receita') {
                data[month].entradas += entry.amount;

                // Tenta categorizar o lançamento com base no pedido vinculado
                const order = orders.find(o => o.id === entry.orderId || (o.number && entry.description?.includes(o.number)));
                if (order) {
                    const client = clients.find(c => c.id === order.clientId) || clients.find(c => c.name === order.clientName);
                    const isConsigned = order.isConsigned || client?.consignado;

                    if (isConsigned) {
                        data[month].consignado += entry.amount;
                    } else if (order.orderType === 'instalacao') {
                        data[month].instalacao += entry.amount;
                    } else if (order.orderType === 'retirada') {
                        data[month].retirada += entry.amount;
                    }
                }
            } else {
                data[month].saidas += entry.amount;
            }
        });

        // Adiciona pedidos pagos como receitas (apenas se NÃO houver lançamento individual vinculado)
        orders.forEach(order => {
            const isPaid = order.paymentStatus === 'pago' || order.status === 'produto_liberado';
            if (isPaid && order.createdAt) {
                const date = new Date(order.createdAt);
                const month = date.getMonth();
                if (!data[month]) data[month] = { entradas: 0, saidas: 0, consignado: 0, instalacao: 0, retirada: 0 };

                const temLancamento = financialEntries.some(
                    e => e.orderId === order.id || (order.number && e.description?.includes(order.number))
                );

                if (!temLancamento) {
                    data[month].entradas += order.total;

                    const client = clients.find(c => c.id === order.clientId) || clients.find(c => c.name === order.clientName);
                    const isConsigned = order.isConsigned || client?.consignado;

                    if (isConsigned) {
                        data[month].consignado += order.total;
                    } else if (order.orderType === 'instalacao') {
                        data[month].instalacao += order.total;
                    } else if (order.orderType === 'retirada') {
                        data[month].retirada += order.total;
                    }
                }
            }
        });

        return data;
    }, [financialEntries, orders, clients]);

    // Mescla dados reais com dados de exibição
    const monthlyData = MONTHS.map((mes, idx) => {
        const real = monthlyDataReal[idx] || { entradas: 0, saidas: 0, consignado: 0, instalacao: 0, retirada: 0 };
        return {
            mes,
            entradas: real.entradas,
            saidas: real.saidas,
            consignado: real.consignado,
            instalacao: real.instalacao,
            retirada: real.retirada,
            saldo: real.entradas - real.saidas,
        };
    });

    const totalReceitas = financialEntries
        .filter(e => e.type === 'receita' && e.status === 'pago')
        .reduce((s, e) => s + e.amount, 0)
        + orders
            .filter(o => (o.paymentStatus === 'pago' || o.status === 'produto_liberado') && !financialEntries.some(e => e.orderId === o.id || (o.number && e.description?.includes(o.number))))
            .reduce((s, o) => s + o.total, 0);

    const totalDespesas = financialEntries.filter(e => e.type === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
    const saldoAtual = totalReceitas - totalDespesas;

    // Média baseada nos meses passados do ano atual
    const currentMonthIndex = new Date().getMonth();
    const monthsPassed = currentMonthIndex + 1;
    const mediaReceitas = totalReceitas > 0 ? totalReceitas / monthsPassed : 0;

    // Categories breakdown from real data (Paid only)
    const categoryBreakdown = financialEntries
        .filter(e => e.status === 'pago')
        .reduce((acc, e) => {
            const key = e.category || 'Sem categoria';
            if (!acc[key]) acc[key] = { receita: 0, despesa: 0 };
            acc[key][e.type] += e.amount;
            return acc;
        }, {} as Record<string, { receita: number; despesa: number }>);

    // Adiciona pedidos pagos por categoria (se sem lançamento individual)
    orders.forEach(order => {
        const isPaid = order.paymentStatus === 'pago' || order.status === 'produto_liberado';
        if (isPaid && !financialEntries.some(e => e.orderId === order.id || (order.number && e.description?.includes(order.number)))) {
            const key = 'Vendas de Produtos';
            if (!categoryBreakdown[key]) categoryBreakdown[key] = { receita: 0, despesa: 0 };
            categoryBreakdown[key].receita += order.total;
        }
    });

    const categoryData = Object.entries(categoryBreakdown)
        .map(([cat, vals]) => ({
            name: cat,
            Receita: vals.receita,
            Despesa: vals.despesa,
        }))
        .filter(d => d.Receita > 0 || d.Despesa > 0)
        .sort((a, b) => (b.Receita + b.Despesa) - (a.Receita + a.Despesa));

    const displayData = period === '6m' ? monthlyData.slice(6) : monthlyData;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="page-header">Fluxo de Caixa</h1>
                    <p className="page-subtitle">Projeção e análise de entradas e saídas</p>
                </div>
                <div className="flex gap-1.5">
                    {(['6m', '12m'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                            {p === '6m' ? 'Últimos 6 meses' : 'Este ano'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Saldo Atual', value: formatCurrency(saldoAtual), icon: <Wallet className="w-5 h-5" />, color: saldoAtual >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10', textColor: saldoAtual >= 0 ? 'text-success' : 'text-destructive' },
                    { label: 'Total Entradas', value: formatCurrency(totalReceitas), icon: <ArrowUpRight className="w-5 h-5" />, color: 'text-success bg-success/10', textColor: 'text-success' },
                    { label: 'Total Saídas', value: formatCurrency(totalDespesas), icon: <ArrowDownRight className="w-5 h-5" />, color: 'text-destructive bg-destructive/10', textColor: 'text-destructive' },
                    { label: 'Média Mensal (Receita)', value: formatCurrency(mediaReceitas), icon: <TrendingUp className="w-5 h-5" />, color: 'text-primary bg-primary/10', textColor: 'text-foreground' },
                ].map((card, i) => (
                    <div key={i} className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.color}`}>{card.icon}</div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground font-medium truncate">{card.label}</p>
                                <p className={`text-lg font-extrabold ${card.textColor}`}>{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Evolution chart */}
            <div className="card-section p-6">
                <h2 className="card-section-title mb-6">Evolução por Tipo de Pedido</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={displayData}>
                        <defs>
                            <linearGradient id="colorConsignado" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInstalacao" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRetirada" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="consignado" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorConsignado)" name="Consignado" />
                        <Area type="monotone" dataKey="instalacao" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorInstalacao)" name="Instalação" />
                        <Area type="monotone" dataKey="retirada" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorRetirada)" name="Retirada" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Two column: saldo + categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance bar */}
                <div className="card-section p-6">
                    <h2 className="card-section-title mb-6">Saldo Mensal</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={displayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                            <Bar dataKey="saldo" name="Saldo" radius={[6, 6, 0, 0]}
                                fill="hsl(var(--primary))"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* By category */}
                <div className="card-section p-6">
                    <h2 className="card-section-title mb-6">Por Categoria</h2>
                    {categoryData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-12">Nenhum dado de categoria disponível</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="Receita" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} />
                                <Bar dataKey="Despesa" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* DRE condensed */}
            <div className="card-section p-6">
                <h2 className="card-section-title mb-5">DRE Simplificado</h2>
                <div className="space-y-2">
                    {[
                        { label: 'Receita Bruta', value: totalReceitas, positive: true },
                        { label: '(−) Despesas Operacionais', value: -totalDespesas, positive: false },
                        { label: 'Resultado Líquido', value: saldoAtual, positive: saldoAtual >= 0, highlight: true },
                    ].map((row, i) => (
                        <div key={i} className={`flex justify-between items-center p-4 rounded-xl border transition-colors ${row.highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/30 hover:bg-muted/50'}`}>
                            <span className={`text-sm font-medium ${row.highlight ? 'text-foreground font-bold' : 'text-foreground'}`}>{row.label}</span>
                            <span className={`text-sm font-bold ${row.highlight ? (row.positive ? 'text-success' : 'text-destructive') : row.positive ? 'text-success' : 'text-destructive'}`}>
                                {formatCurrency(Math.abs(row.value))}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FluxoCaixaPage;
