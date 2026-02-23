import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

const MONTHLY_DATA = [
  { mes: 'Jan', receita: 45000, despesa: 32000 },
  { mes: 'Fev', receita: 52000, despesa: 28000 },
  { mes: 'Mar', receita: 61000, despesa: 35000 },
  { mes: 'Abr', receita: 48000, despesa: 30000 },
  { mes: 'Mai', receita: 72000, despesa: 38000 },
  { mes: 'Jun', receita: 65000, despesa: 34000 },
];

const RelatoriosPage: React.FC = () => {
  const { financialEntries, orders } = useERP();

  const receitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const despesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);

  const dreData = [
    { name: 'Receita Bruta', valor: receitas },
    { name: 'Despesas Operacionais', valor: -despesas },
    { name: 'Resultado Líquido', valor: receitas - despesas },
  ];

  const productionOccurrences = orders.flatMap(order =>
    order.statusHistory
      .filter(history =>
        ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(history.status) ||
        history.user.toLowerCase().includes('produ') ||
        history.user.toLowerCase().includes('base')
      )
      .map(history => ({
        orderNumber: order.number,
        client: order.clientName,
        date: history.timestamp,
        user: history.user,
        status: history.status,
        note: history.note
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Relatórios</h1>
        <p className="page-subtitle">Análise financeira e operacional</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">DRE Simplificado</h2>
          <div className="space-y-2 mb-6">
            {dreData.map((item, i) => (
              <div key={i} className={`flex justify-between p-4 rounded-xl border transition-colors ${i === dreData.length - 1 ? 'bg-primary/5 border-primary/20 font-bold' : 'bg-muted/30 border-border/30 hover:bg-muted/50'}`}>
                <span className="text-sm text-foreground font-medium">{item.name}</span>
                <span className={`text-sm font-bold ${item.valor >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(Math.abs(item.valor))}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(Math.abs(v) / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(Math.abs(v))} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">Evolução Mensal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Line type="monotone" dataKey="receita" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--success))', r: 4 }} name="Receita" />
              <Line type="monotone" dataKey="despesa" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--destructive))', r: 4 }} name="Despesa" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-section p-6">
        <h2 className="card-section-title mb-5">Relatório de Produção (Ocorrências)</h2>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Usuário</th>
                <th>Status</th>
                <th>Ocorrência / Observação</th>
              </tr>
            </thead>
            <tbody>
              {productionOccurrences.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground p-4">Nenhuma ocorrência registrada na produção.</td></tr>
              ) : (
                productionOccurrences.map((occ, i) => (
                  <tr key={i}>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{new Date(occ.date).toLocaleString('pt-BR')}</td>
                    <td className="font-bold text-foreground">{occ.orderNumber}</td>
                    <td className="text-xs">{occ.client}</td>
                    <td className="text-xs">{occ.user}</td>
                    <td><StatusBadge status={occ.status} /></td>
                    <td className="text-xs text-foreground max-w-xs">{occ.note || <span className="text-muted-foreground italic">Sem observações</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;
