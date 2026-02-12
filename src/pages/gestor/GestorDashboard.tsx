import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, formatCurrency } from '@/components/shared/StatusBadge';
import { ShoppingCart, DollarSign, Factory, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { OrderStatus } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';

const GestorDashboard: React.FC = () => {
  const { orders, financialEntries } = useERP();

  const totalVendas = orders.reduce((s, o) => s + o.total, 0);
  const totalRecebido = financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const emProducao = orders.filter(o => o.status === 'em_producao').length;
  const finalizados = orders.filter(o => o.status === 'producao_finalizada' || o.status === 'produto_liberado').length;

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as OrderStatus] || status,
    value: count,
  }));

  const COLORS = ['hsl(221,83%,53%)', 'hsl(160,84%,39%)', 'hsl(43,96%,56%)', 'hsl(280,67%,60%)', 'hsl(0,72%,51%)', 'hsl(200,70%,50%)'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Gestor</h1>
        <p className="page-subtitle">Visão consolidada do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Vendas Totais" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" trend="+15%" />
        <StatCard title="Recebido" value={formatCurrency(totalRecebido)} icon={DollarSign} color="text-success" />
        <StatCard title="Em Produção" value={emProducao} icon={Factory} color="text-producao" />
        <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-gestor" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">Distribuição por Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">Indicadores de Desempenho</h2>
          <div className="space-y-3">
            {[
              { label: 'Ticket Médio', value: formatCurrency(orders.length > 0 ? totalVendas / orders.length : 0) },
              { label: 'Taxa de Aprovação', value: `${orders.length > 0 ? Math.round(orders.filter(o => !o.status.includes('rejeitado')).length / orders.length * 100) : 0}%` },
              { label: 'Total de Pedidos', value: orders.length },
              { label: 'Em Andamento', value: orders.filter(o => !['rascunho', 'producao_finalizada', 'produto_liberado'].includes(o.status)).length },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                <span className="font-bold text-foreground text-lg">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestorDashboard;
