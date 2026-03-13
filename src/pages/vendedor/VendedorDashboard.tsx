import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import { ShoppingCart, FileText, Clock, Eye, Package } from 'lucide-react';
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
  const statusesQueContam: string[] = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado',
    'retirado_entregador'
  ];

  const totalVendas = myOrders
    .filter(o => statusesQueContam.includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  // ✅ Resumo de produtos vendidos agrupados (como na imagem)
  const produtosVendidosAgrupados = useMemo(() => {
    const map = new Map<string, { product: string; quantity: number; sensorType?: string; totalValue: number }>();

    myOrders
      .filter(o => statusesQueContam.includes(o.status))
      .forEach(order => {
        order.items.forEach(item => {
          const key = `${item.product}-${item.sensorType || ''}`;
          const current = map.get(key) || { product: item.product, quantity: 0, sensorType: item.sensorType, totalValue: 0 };
          current.quantity += item.quantity;
          current.totalValue += (item.quantity * item.unitPrice);
          map.set(key, current);
        });
      });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
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
        <Link to="/vendedor/orcamentos" className="block">
          <StatCard title="Vendido no Mês" value={formatCurrency(totalVendas)} icon={ShoppingCart} color="text-vendedor" />
        </Link>
        <Link to="/vendedor/orcamentos" className="block">
          <StatCard title="Pedidos Enviados" value={pedidosEnviados} icon={FileText} color="text-success" />
        </Link>
        <Link to="/vendedor/orcamentos" className="block">
          <StatCard title="Orçam. Pendentes" value={orcamentosPendentes} icon={Clock} color="text-warning" />
        </Link>
        <Link to="/vendedor/orcamentos" className="block">
          <StatCard title="Itens Vendidos" value={produtosVendidosAgrupados.reduce((acc, p) => acc + p.quantity, 0)} icon={Package} color="text-primary" />
        </Link>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Controle de Produtos (Estilo Excel/Relatório conforme imagem) */}
        <div className="card-section overflow-hidden h-fit">
          <div className="card-section-header bg-muted/20 border-b border-border/40 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20 uppercase">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-tight">{user?.name}</h2>
                <p className="text-[10px] text-muted-foreground font-bold">{pedidosEnviados} pedido(s)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Total de Vendas</p>
              <p className="text-lg font-black text-success">{formatCurrency(totalVendas)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b border-border/30">
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Produto</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Quantidade</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {produtosVendidosAgrupados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground text-sm italic">
                      Nenhuma venda registrada para este período.
                    </td>
                  </tr>
                ) : (
                  produtosVendidosAgrupados.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors uppercase">{prod.product}</span>
                          {prod.sensorType && (
                            <span className={`inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded-full border ${prod.sensorType === 'com_sensor'
                              ? 'bg-success/10 border-success/20 text-success'
                              : 'bg-muted border-border/40 text-muted-foreground'
                              }`}>
                              {prod.sensorType === 'com_sensor' ? '✓ COM SENSOR' : '⚡ SEM SENSOR'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 min-w-[32px] rounded-lg bg-primary/10 text-primary font-black text-xs">
                          {prod.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-[11px] font-black text-foreground">{formatCurrency(prod.totalValue)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {produtosVendidosAgrupados.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/10 border-t-2 border-border/40">
                    <td className="px-5 py-4 text-[10px] font-black text-foreground uppercase tracking-widest">Total Geral</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-black text-foreground font-mono">
                        {produtosVendidosAgrupados.reduce((acc, p) => acc + p.quantity, 0)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-base font-black text-success">{formatCurrency(totalVendas)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Acompanhamento em Tempo Real (Status dos Pedidos) */}
        <div className="card-section">
          <div className="card-section-header">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-producao" />
              <h2 className="card-section-title">Status dos Pedidos</h2>
            </div>
            <Link to="/vendedor/orcamentos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto custom-scrollbar">
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
