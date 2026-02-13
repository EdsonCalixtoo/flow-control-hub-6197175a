import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Package, Clock, Factory, CheckCircle, ScanLine, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProducaoDashboard: React.FC = () => {
  const { orders } = useERP();

  const aguardando = orders.filter(o => o.status === 'aguardando_producao').length;
  const emProducao = orders.filter(o => o.status === 'em_producao').length;
  const finalizados = orders.filter(o => o.status === 'producao_finalizada').length;
  const liberados = orders.filter(o => o.status === 'produto_liberado').length;

  const recentOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
  ).slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard de Produção</h1>
        <p className="page-subtitle">Acompanhe a produção em tempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Aguardando" value={aguardando} icon={Clock} color="text-warning" />
        <StatCard title="Em Produção" value={emProducao} icon={Factory} color="text-producao" />
        <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-success" />
        <StatCard title="Liberados" value={liberados} icon={Package} color="text-gestor" />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/producao/pedidos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Ler Código de Barras</p>
              <p className="text-xs text-muted-foreground">Liberar produtos escaneados</p>
            </div>
          </div>
        </Link>
        <Link to="/producao/pedidos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Imprimir Etiquetas</p>
              <p className="text-xs text-muted-foreground">Gerar guias de produção</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Pedidos recentes */}
      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">Pedidos Recentes</h2>
          <Link to="/producao/pedidos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="hidden md:table-cell">Produto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td className="font-bold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td className="text-foreground hidden md:table-cell">{order.items[0]?.product || '-'}</td>
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

export default ProducaoDashboard;
