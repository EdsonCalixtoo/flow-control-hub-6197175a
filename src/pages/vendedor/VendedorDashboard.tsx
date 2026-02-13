import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { ShoppingCart, FileText, Clock, Percent, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const VendedorDashboard: React.FC = () => {
  const { orders } = useERP();

  const totalVendas = orders.reduce((s, o) => s + o.total, 0);
  const pedidosEnviados = orders.filter(o => o.status !== 'rascunho').length;
  const orcamentosPendentes = orders.filter(o => o.status === 'rascunho' || o.status === 'enviado').length;
  const comissaoEstimada = totalVendas * 0.05;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Vendedor</h1>
        <p className="page-subtitle">Acompanhe suas vendas e metas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Vendido no Mês" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" trend="+12%" />
        <StatCard title="Pedidos Enviados" value={pedidosEnviados} icon={FileText} color="text-success" />
        <StatCard title="Orçam. Pendentes" value={orcamentosPendentes} icon={Clock} color="text-warning" />
        <StatCard title="Comissão Estimada" value={formatCurrency(comissaoEstimada)} icon={Percent} color="text-financeiro" />
      </div>

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/vendedor/orcamentos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vendedor/20 to-vendedor/5 flex items-center justify-center text-vendedor group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Criar Orçamento</p>
              <p className="text-xs text-muted-foreground">Novo orçamento rápido</p>
            </div>
          </div>
        </Link>
        <Link to="/vendedor/clientes" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-financeiro/20 to-financeiro/5 flex items-center justify-center text-financeiro group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Gestão de Clientes</p>
              <p className="text-xs text-muted-foreground">CRM completo</p>
            </div>
          </div>
        </Link>
        <Link to="/vendedor/orcamentos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Acompanhar Pedidos</p>
              <p className="text-xs text-muted-foreground">Todos os status</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Últimos pedidos */}
      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">Últimos Pedidos</h2>
          <Link to="/vendedor/orcamentos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="text-right hidden md:table-cell">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(order => (
                <tr key={order.id}>
                  <td className="font-bold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td className="text-right font-semibold text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
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
