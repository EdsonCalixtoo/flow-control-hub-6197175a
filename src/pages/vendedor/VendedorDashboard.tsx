import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { ShoppingCart, FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';

const VendedorDashboard: React.FC = () => {
  const { orders } = useERP();

  const totalVendas = orders.reduce((s, o) => s + o.total, 0);
  const pendentes = orders.filter(o => o.status === 'rascunho' || o.status === 'enviado').length;
  const aprovadas = orders.filter(o => !['rascunho', 'enviado', 'rejeitado_financeiro', 'rejeitado_gestor'].includes(o.status)).length;
  const aguardandoPgto = orders.filter(o => o.status === 'aguardando_financeiro').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Vendedor</h1>
        <p className="page-subtitle">Acompanhe suas vendas e orçamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Total de Vendas" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" trend="+12%" />
        <StatCard title="Pendentes" value={pendentes} icon={FileText} color="text-warning" />
        <StatCard title="Aprovadas" value={aprovadas} icon={CheckCircle} color="text-success" />
        <StatCard title="Aguard. Pagamento" value={aguardandoPgto} icon={Clock} color="text-muted-foreground" />
      </div>

      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">Últimos Pedidos</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">{orders.length} pedidos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="hidden md:table-cell">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="font-semibold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td className="text-foreground font-medium hidden md:table-cell">{formatCurrency(order.total)}</td>
                  <td><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;
