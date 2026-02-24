import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import { ShoppingCart, FileText, Clock, Percent, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const VendedorDashboard: React.FC = () => {
  const { orders } = useERP();
  const { user } = useAuth();

  // ✅ Filtra SOMENTE os pedidos do vendedor logado
  const myOrders = orders.filter(o => o.sellerId === user?.id);

  // Pedidos que foram enviados (não são rascunho)
  const pedidosEnviados = myOrders.filter(o => o.status !== 'rascunho').length;

  // Orçamentos pendentes: rascunho ou enviado ao cliente
  const orcamentosPendentes = myOrders.filter(o =>
    o.status === 'rascunho' || o.status === 'enviado'
  ).length;

  // Total vendido: apenas pedidos que passaram do rascunho (enviados ao financeiro ou além)
  const statusesQueContam: string[] = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_gestor', 'aprovado_gestor', 'rejeitado_gestor',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'
  ];
  const totalVendas = myOrders
    .filter(o => statusesQueContam.includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  const comissaoEstimada = totalVendas * 0.05;

  // Pedidos recentes para exibir no acompanhamento (não rascunho)
  const pedidosRecentes = myOrders
    .filter(o => o.status !== 'rascunho')
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Vendedor</h1>
        <p className="page-subtitle">Acompanhe suas vendas e metas — {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard title="Vendido no Mês" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" />
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

      {/* Últimos pedidos com pipeline */}
      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">Acompanhamento em Tempo Real</h2>
          <Link to="/vendedor/orcamentos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="divide-y divide-border/40">
          {pedidosRecentes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Você ainda não possui pedidos enviados. <Link to="/vendedor/orcamentos" className="text-primary underline">Criar orçamento</Link>
            </div>
          ) : (
            pedidosRecentes.map(order => (
              <div key={order.id} className="p-4 md:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-sm">{order.number}</span>
                    <span className="text-muted-foreground text-xs ml-2">{order.clientName}</span>
                  </div>
                  <span className="font-semibold text-foreground text-sm">{formatCurrency(order.total)}</span>
                </div>
                <OrderPipeline order={order} compact />
                {order.statusHistory.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Última atualização: {new Date(order.statusHistory[order.statusHistory.length - 1].timestamp).toLocaleString('pt-BR')}
                    {' • '}{order.statusHistory[order.statusHistory.length - 1].user}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VendedorDashboard;
