import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Simulated 12-month series (will blend with real data when available)
const BASE_MONTHLY = [
    { mes: 'Jan', entradas: 45000, saidas: 32000 },
    { mes: 'Fev', entradas: 52000, saidas: 28000 },
    { mes: 'Mar', entradas: 61000, saidas: 35000 },
    { mes: 'Abr', entradas: 48000, saidas: 30000 },
    { mes: 'Mai', entradas: 72000, saidas: 38000 },
    { mes: 'Jun', entradas: 65000, saidas: 34000 },
    { mes: 'Jul', entradas: 58000, saidas: 31000 },
    { mes: 'Ago', entradas: 79000, saidas: 42000 },
    { mes: 'Set', entradas: 67000, saidas: 37000 },
    { mes: 'Out', entradas: 83000, saidas: 45000 },
    { mes: 'Nov', entradas: 91000, saidas: 48000 },
    { mes: 'Dez', entradas: 105000, saidas: 52000 },
];

const FluxoCaixaPage: React.FC = () => {
    const { financialEntries } = useERP();
    const [period, setPeriod] = useState<'6m' | '12m'>('12m');

    const totalReceitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
    const totalDespesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);
    const saldoAtual = totalReceitas - totalDespesas;
    const mediaReceitas = totalReceitas / 6;
    const mediaDespesas = totalDespesas / 6;

    const monthlyData = (period === '6m' ? BASE_MONTHLY.slice(6) : BASE_MONTHLY).map(m => ({
        ...m,
        saldo: m.entradas - m.saidas,
    }));

    // Categories breakdown from real data
    const categoryBreakdown = financialEntries.reduce((acc, e) => {
        const key = e.category;
        if (!acc[key]) acc[key] = { receita: 0, despesa: 0 };
        acc[key][e.type] += e.amount;
        return acc;
    }, {} as Record<string, { receita: number; despesa: number }>);

    const categoryData = Object.entries(categoryBreakdown).map(([cat, vals]) => ({
        name: cat,
        Receita: vals.receita,
        Despesa: vals.despesa,
    })).filter(d => d.Receita > 0 || d.Despesa > 0);

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

            {/* Area chart */}
            <div className="card-section p-6">
                <h2 className="card-section-title mb-6">Evolução de Entradas vs Saídas</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData}>
                        <defs>
                            <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="entradas" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#colorEntradas)" name="Entradas" />
                        <Area type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" strokeWidth={2.5} fill="url(#colorSaidas)" name="Saídas" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Two column: saldo + categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance bar */}
                <div className="card-section p-6">
                    <h2 className="card-section-title mb-6">Saldo Mensal</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData}>
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
