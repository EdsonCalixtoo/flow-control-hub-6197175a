import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, formatCurrency } from '@/components/shared/StatusBadge';
import { BarChart3, ShoppingCart, DollarSign, Factory, CheckCircle, TrendingUp } from 'lucide-react';
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

  const COLORS = ['hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(200,70%,50%)'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard do Gestor</h1>
        <p className="page-subtitle">Visão consolidada do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Vendas Totais" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" />
        <StatCard title="Recebido" value={formatCurrency(totalRecebido)} icon={DollarSign} color="text-success" />
        <StatCard title="Em Produção" value={emProducao} icon={Factory} color="text-producao" />
        <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-gestor" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Distribuição por Status</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Indicadores de Desempenho</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Ticket Médio</span>
              <span className="font-semibold text-foreground">{formatCurrency(orders.length > 0 ? totalVendas / orders.length : 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Taxa de Aprovação</span>
              <span className="font-semibold text-foreground">{orders.length > 0 ? Math.round(orders.filter(o => !o.status.includes('rejeitado')).length / orders.length * 100) : 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Total de Pedidos</span>
              <span className="font-semibold text-foreground">{orders.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Pedidos em Andamento</span>
              <span className="font-semibold text-foreground">{orders.filter(o => !['rascunho', 'producao_finalizada', 'produto_liberado'].includes(o.status)).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestorDashboard;
