import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const RelatoriosPage: React.FC = () => {
  const { financialEntries } = useERP();

  const receitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const despesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);

  const dreData = [
    { name: 'Receita Bruta', valor: receitas },
    { name: 'Despesas', valor: despesas },
    { name: 'Resultado', valor: receitas - despesas },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Relatórios</h1>
        <p className="page-subtitle">Análise financeira e operacional</p>
      </div>

      <div className="card-section p-6">
        <h2 className="card-section-title mb-5">DRE Simplificado</h2>
        <div className="space-y-2 mb-8">
          {dreData.map((item, i) => (
            <div key={i} className={`flex justify-between p-4 rounded-xl border transition-colors ${i === dreData.length - 1 ? 'bg-primary/5 border-primary/20 font-bold' : 'bg-muted/30 border-border/30 hover:bg-muted/50'}`}>
              <span className="text-sm text-foreground font-medium">{item.name}</span>
              <span className={`text-sm font-bold ${item.valor >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(item.valor)}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dreData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)' }} />
            <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RelatoriosPage;
