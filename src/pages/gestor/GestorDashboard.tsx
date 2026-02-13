import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { ShoppingCart, DollarSign, Factory, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import type { OrderStatus } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';

const STOCK_DATA = [
  { produto: 'Servidor Dell', quantidade: 12, status: 'normal' },
  { produto: 'Notebook Lenovo', quantidade: 5, status: 'baixo' },
  { produto: 'Switch Cisco', quantidade: 2, status: 'critico' },
  { produto: 'Monitor LG 27"', quantidade: 18, status: 'normal' },
  { produto: 'Cabo Cat6 (cx)', quantidade: 3, status: 'baixo' },
  { produto: 'Teclado Mecânico', quantidade: 45, status: 'normal' },
];

const PRODUCTION_DAILY = [
  { dia: 'Seg', pedidos: 3, liberados: 2 },
  { dia: 'Ter', pedidos: 5, liberados: 4 },
  { dia: 'Qua', pedidos: 2, liberados: 3 },
  { dia: 'Qui', pedidos: 6, liberados: 5 },
  { dia: 'Sex', pedidos: 4, liberados: 6 },
  { dia: 'Sáb', pedidos: 1, liberados: 2 },
];

const GestorDashboard: React.FC = () => {
  const { orders, financialEntries } = useERP();

  const totalVendas = orders.reduce((s, o) => s + o.total, 0);
  const totalRecebido = financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0);
  const emProducao = orders.filter(o => o.status === 'em_producao').length;
  const finalizados = orders.filter(o => o.status === 'producao_finalizada' || o.status === 'produto_liberado').length;
  const aguardandoPgto = orders.filter(o => o.status === 'aguardando_financeiro').length;
  const estoqueBaixo = STOCK_DATA.filter(s => s.status === 'critico' || s.status === 'baixo').length;

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as OrderStatus] || status,
    value: count,
  }));

  const COLORS = ['hsl(221,83%,53%)', 'hsl(160,84%,39%)', 'hsl(43,96%,56%)', 'hsl(280,67%,60%)', 'hsl(0,72%,51%)', 'hsl(200,70%,50%)'];

  const stockStatusColors: Record<string, string> = {
    normal: 'text-success bg-success/10',
    baixo: 'text-warning bg-warning/10',
    critico: 'text-destructive bg-destructive/10',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Gestor</h1>
        <p className="page-subtitle">Visão estratégica consolidada</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 stagger-children">
        <StatCard title="Vendas Totais" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" trend="+15%" />
        <StatCard title="Recebido" value={formatCurrency(totalRecebido)} icon={DollarSign} color="text-success" />
        <StatCard title="Em Produção" value={emProducao} icon={Factory} color="text-producao" />
        <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-gestor" />
        <StatCard title="Aguard. Pgto" value={aguardandoPgto} icon={Package} color="text-warning" />
        <StatCard title="Estoque Baixo" value={estoqueBaixo} icon={AlertTriangle} color="text-destructive" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">Produção Diária</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={PRODUCTION_DAILY}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)' }} />
              <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Pedidos" />
              <Bar dataKey="liberados" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} name="Liberados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-section p-6">
          <h2 className="card-section-title mb-5">Distribuição por Status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estoque + Pedidos liberados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-section">
          <div className="card-section-header">
            <h2 className="card-section-title">Controle de Estoque</h2>
          </div>
          <table className="modern-table">
            <thead>
              <tr><th>Produto</th><th className="text-right">Qtd</th><th>Status</th></tr>
            </thead>
            <tbody>
              {STOCK_DATA.map((item, i) => (
                <tr key={i}>
                  <td className="font-medium text-foreground">{item.produto}</td>
                  <td className="text-right font-bold text-foreground">{item.quantidade}</td>
                  <td>
                    <span className={`status-badge ${stockStatusColors[item.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {item.status === 'normal' ? 'Normal' : item.status === 'baixo' ? 'Baixo' : 'Crítico'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-section">
          <div className="card-section-header">
            <h2 className="card-section-title">Liberados pelo Financeiro</h2>
          </div>
          {orders.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_gestor').length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido aguardando conferência</div>
          ) : (
            <div className="divide-y divide-border/30">
              {orders.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_gestor').map(order => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-primary/[0.02] transition-colors">
                  <div>
                    <p className="text-sm font-bold text-foreground">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(order.total)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indicadores */}
      <div className="card-section p-6">
        <h2 className="card-section-title mb-5">Indicadores de Desempenho</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Ticket Médio', value: formatCurrency(orders.length > 0 ? totalVendas / orders.length : 0) },
            { label: 'Taxa de Aprovação', value: `${orders.length > 0 ? Math.round(orders.filter(o => !o.status.includes('rejeitado')).length / orders.length * 100) : 0}%` },
            { label: 'Total de Pedidos', value: orders.length },
            { label: 'Em Andamento', value: orders.filter(o => !['rascunho', 'producao_finalizada', 'produto_liberado'].includes(o.status)).length },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</span>
              <p className="text-xl font-extrabold text-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GestorDashboard;
