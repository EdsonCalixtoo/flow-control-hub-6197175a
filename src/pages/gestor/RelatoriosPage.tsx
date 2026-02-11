import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

const RelatoriosPage: React.FC = () => {
  const { orders, financialEntries } = useERP();

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

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">DRE Simplificado</h2>
        <div className="space-y-2 mb-6">
          {dreData.map((item, i) => (
            <div key={i} className={`flex justify-between p-3 rounded-lg ${i === dreData.length - 1 ? 'bg-primary/5 font-bold' : 'bg-muted/30'}`}>
              <span className="text-sm text-foreground">{item.name}</span>
              <span className={`text-sm ${item.valor >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(item.valor)}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dreData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RelatoriosPage;
