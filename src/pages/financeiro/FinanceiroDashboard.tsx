import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, formatCurrency } from '@/components/shared/StatusBadge';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const FinanceiroDashboard: React.FC = () => {
  const { orders, financialEntries } = useERP();

  const totalRecebido = financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const totalPendente = orders.filter(o => o.status === 'aguardando_financeiro').reduce((s, o) => s + o.total, 0);
  const contasPagar = financialEntries.filter(e => e.type === 'despesa' && e.status === 'pendente').reduce((s, e) => s + e.amount, 0);
  const contasReceber = orders.filter(o => o.paymentStatus === 'pendente' || o.status === 'aguardando_financeiro').reduce((s, o) => s + o.total, 0);

  const chartData = [
    { name: 'Receitas', valor: totalRecebido },
    { name: 'Despesas', valor: financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0) },
    { name: 'Pendente', valor: totalPendente },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard Financeiro</h1>
        <p className="page-subtitle">Visão geral das finanças</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Recebido" value={formatCurrency(totalRecebido)} icon={TrendingUp} color="text-success" />
        <StatCard title="Total Pendente" value={formatCurrency(totalPendente)} icon={Clock} color="text-warning" />
        <StatCard title="Contas a Pagar" value={formatCurrency(contasPagar)} icon={TrendingDown} color="text-destructive" />
        <StatCard title="Contas a Receber" value={formatCurrency(contasReceber)} icon={DollarSign} color="text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Fluxo de Caixa</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Últimas Movimentações</h2>
          </div>
          <div className="divide-y divide-border/50">
            {financialEntries.slice(0, 5).map(entry => (
              <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.type === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {entry.type === 'receita' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.category} • {new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                  {entry.type === 'receita' ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroDashboard;
