import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { RealtimeNotificationHandler } from '@/components/shared/RealtimeNotificationHandler';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { Package, Clock, Factory, CheckCircle, ScanLine, Printer, Truck, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const ProducaoDashboard: React.FC = () => {
  const { orders, barcodeScans, loadFromSupabase } = useERP();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  // Monitora em tempo real quando novos pedidos chegam para produção
  useRealtimeOrders((event) => {
    if (event.type === 'UPDATE' && event.previousStatus !== 'aguardando_producao' && event.order.status === 'aguardando_producao') {
      setNotificationCount(prev => prev + 1);
      console.log('[ProducaoDashboard] 🔔 NOVO PEDIDO PARA PRODUÇÃO - Tempo Real');
      setTimeout(() => loadFromSupabase(), 100);
    }
  }, ['aguardando_producao']);

  const scannedOrderIds = new Set(barcodeScans.filter(s => s.success).map(s => s.orderId));

  const prodOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status) &&
    !scannedOrderIds.has(o.id)
  );

  const getLocalDateString = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateString();
  const aguardando = prodOrders.filter(o => o.status === 'aguardando_producao').length;
  const emProducao = prodOrders.filter(o => o.status === 'em_producao').length;
  const finalizados = prodOrders.filter(o => o.status === 'producao_finalizada').length;
  const liberados = prodOrders.filter(o => o.status === 'produto_liberado').length;
  const entregas = prodOrders.filter(o => o.orderType === 'entrega').length;

  // Contagem de TODAS as instalações ativas
  const instalacoes = prodOrders.filter(o => o.orderType === 'instalacao').length;



  const atrasados = prodOrders.filter(o => {
    const dStr = o.deliveryDate || '';
    const iStr = o.installationDate || '';
    const datePassed = (dStr && dStr < todayStr) || (iStr && iStr < todayStr);
    
    return datePassed && !['producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status);
  }).length;

  const recentOrders = prodOrders.slice(0, 8);

  return (
    <div className="space-y-6">
      <RealtimeNotificationHandler />
      <div>
        <h1 className="page-header">Dashboard de Producao</h1>
        <p className="page-subtitle">Acompanhe a producao em tempo real</p>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <Link to="/producao/pedidos?tipo=" className="block relative">
          <div className="relative">
            <StatCard title="Aguardando" value={aguardando} icon={Clock} color="text-warning" />
            {notificationCount > 0 && (
              <div className="absolute -top-2 -right-2 flex items-center gap-1">
                <div className="bg-danger text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </div>
                <div className="absolute -top-2 -right-2 bg-danger rounded-full w-6 h-6 animate-pulse opacity-40"></div>
              </div>
            )}
          </div>
        </Link>
        <Link to="/producao/pedidos" className="block">
          <StatCard title="Em Producao" value={emProducao} icon={Factory} color="text-producao" />
        </Link>
        <Link to="/producao/pedidos" className="block">
          <StatCard title="Finalizados" value={finalizados} icon={CheckCircle} color="text-success" />
        </Link>
        <Link to="/producao/pedidos" className="block">
          <StatCard title="Liberados" value={liberados} icon={Package} color="text-gestor" />
        </Link>
      </div>

      {/* Stats secundarias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <Link to="/producao/pedidos?tipo=instalacao" className="block">
          <StatCard title="Instalações" value={instalacoes} icon={Wrench} color="text-producao" />
        </Link>
        <Link to="/producao/pedidos?tipo=atrasado" className="block">
          <StatCard title="Atrasados" value={atrasados} icon={AlertTriangle} color="text-destructive" />
        </Link>
        <Link to="/producao/pedidos?view=calendar" className="block">
          <StatCard title="Calendário" value={orders.length} icon={Calendar} color="text-info" />
        </Link>
      </div>

      {/* Atalhos rapidos */}
      <div className="grid grid-cols-1 gap-4">
        <Link to="/producao/pedidos?scan=true" className="card-section p-6 hover:shadow-xl hover:shadow-producao/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer border-producao/20 bg-gradient-to-br from-card to-producao/[0.02]">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform shadow-inner">
              <ScanLine className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground uppercase tracking-tight">Ler Código de Barras</p>
              <p className="text-sm text-muted-foreground font-medium">Escaneie o pedido para liberar o produto para entrega ou instalação</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Pedidos recentes — clicaveis */}
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
                <th className="hidden md:table-cell">Tipo</th>
                <th className="hidden md:table-cell">Entrega</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Nenhum pedido em producao</td></tr>
              )}
              {recentOrders.map(order => {
                const dStr = order.deliveryDate || '';
                const iStr = order.installationDate || '';
                const isLate = ((dStr && dStr < todayStr) || (iStr && iStr < todayStr)) && 
                                !['producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(order.status);
                return (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/producao/pedidos?view=${order.id}`)}
                  >
                    <td className="font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        {order.number}
                        {isLate && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" /> ATRASADO</span>}
                        {order.orderType === 'instalacao' && order.installationPaymentType && (
                          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${order.installationPaymentType === 'pago' ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
                            {order.installationPaymentType === 'pago' ? 'PAGO' : 'PENDENTE'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-foreground">{order.clientName}</td>
                    <td className="hidden md:table-cell">
                      {order.orderType === 'instalacao'
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-producao"><Wrench className="w-3 h-3" /> Instalacao</span>
                        : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary"><Truck className="w-3 h-3" /> Entrega</span>
                      }
                    </td>
                    <td className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(order.deliveryDate)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProducaoDashboard;
