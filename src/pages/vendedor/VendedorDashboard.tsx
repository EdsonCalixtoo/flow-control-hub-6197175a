import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import { ShoppingCart, FileText, Clock, Percent, Eye, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

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
  // Fluxo: Vendedor → Financeiro → Produção (sem etapa de Gestor)
  const statusesQueContam: string[] = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'
  ];
  const totalVendas = myOrders
    .filter(o => statusesQueContam.includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  const comissaoEstimada = totalVendas * 0.05;

  // ✅ Histórico REAL e DETALHADO de itens vendidos
  const produtosVendidos = useMemo(() => {
    const list: {
      orderId: string;
      orderNumber: string;
      clientName: string;
      product: string;
      quantity: number;
      sensorType?: string;
      date: string;
    }[] = [];

    myOrders
      .filter(o => statusesQueContam.includes(o.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(order => {
        order.items.forEach(item => {
          list.push({
            orderId: order.id,
            orderNumber: order.number,
            clientName: order.clientName,
            product: item.product,
            quantity: item.quantity,
            sensorType: item.sensorType,
            date: order.createdAt
          });
        });
      });

    return list;
  }, [myOrders]);

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
        <StatCard title="Itens Vendidos" value={produtosVendidos.reduce((acc, p) => acc + p.quantity, 0)} icon={Package} color="text-primary" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico Detalhado de ITENS Vendidos */}
        <div className="card-section h-fit">
          <div className="card-section-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="card-section-title">Controle de Itens Vendidos</h2>
            </div>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Total Itens: {produtosVendidos.reduce((acc, p) => acc + p.quantity, 0)}
            </span>
          </div>
          <div className="p-0 overflow-hidden">
            {produtosVendidos.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum item vendido ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto custom-scrollbar">
                {produtosVendidos.map((prod, idx) => (
                  <div key={idx} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{prod.orderNumber}</span>
                          <p className="text-sm font-bold text-foreground leading-tight">{prod.product}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {prod.clientName} • {new Date(prod.date).toLocaleDateString('pt-BR')}
                        </p>
                        {prod.sensorType && (
                          <p className="text-[10px] text-primary/70 font-bold uppercase">
                            {prod.sensorType === 'com_sensor' ? '📡 Com Sensor' : '🔌 Sem Sensor'}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-foreground">{prod.quantity}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black">Unid.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Acompanhamento em Tempo Real */}
        <div className="card-section">
          <div className="card-section-header">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-producao" />
              <h2 className="card-section-title">Status dos Pedidos</h2>
            </div>
            <Link to="/vendedor/orcamentos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-border/40">
            {pedidosRecentes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Você ainda não possui pedidos enviados. <Link to="/vendedor/orcamentos" className="text-primary underline">Criar orçamento</Link>
              </div>
            ) : (
              pedidosRecentes.map(order => (
                <div key={order.id} className="p-4 md:p-5 space-y-3 hover:bg-muted/30 transition-colors">
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
    </div>
  );
};

export default VendedorDashboard;
