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
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard do Vendedor</h1>
        <p className="page-subtitle">Acompanhe suas vendas e orçamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Vendas" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" />
        <StatCard title="Orçamentos Pendentes" value={pendentes} icon={FileText} color="text-warning" />
        <StatCard title="Vendas Aprovadas" value={aprovadas} icon={CheckCircle} color="text-success" />
        <StatCard title="Aguardando Pagamento" value={aguardandoPgto} icon={Clock} color="text-muted-foreground" />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Últimos Pedidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Pedido</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cliente</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Valor</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{order.number}</td>
                  <td className="px-5 py-3 text-foreground">{order.clientName}</td>
                  <td className="px-5 py-3 text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
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
