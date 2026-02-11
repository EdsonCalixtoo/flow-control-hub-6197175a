import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Package, Clock, Factory, CheckCircle } from 'lucide-react';

const ProducaoDashboard: React.FC = () => {
  const { orders } = useERP();

  const aguardando = orders.filter(o => o.status === 'aguardando_producao').length;
  const emProducao = orders.filter(o => o.status === 'em_producao').length;
  const finalizados = orders.filter(o => o.status === 'producao_finalizada' || o.status === 'produto_liberado').length;
  const total = aguardando + emProducao + finalizados;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard de Produção</h1>
        <p className="page-subtitle">Acompanhe a produção dos pedidos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Pedidos" value={total} icon={Package} color="text-foreground" />
        <StatCard title="Aguardando" value={aguardando} icon={Clock} color="text-warning" />
        <StatCard title="Em Produção" value={emProducao} icon={Factory} color="text-producao" />
        <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-success" />
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Pedidos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Pedido</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cliente</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Produto</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)).map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{order.number}</td>
                  <td className="px-5 py-3 text-foreground">{order.clientName}</td>
                  <td className="px-5 py-3 text-foreground hidden md:table-cell">{order.items[0]?.product || '-'}</td>
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

export default ProducaoDashboard;
