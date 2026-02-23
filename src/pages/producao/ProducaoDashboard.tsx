import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { Package, Clock, Factory, CheckCircle, ScanLine, Printer, Truck, Wrench, AlertTriangle, CalendarClock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const ProducaoDashboard: React.FC = () => {
  const { orders } = useERP();
  const navigate = useNavigate();

  const prodOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
  );

  const aguardando = prodOrders.filter(o => o.status === 'aguardando_producao').length;
  const emProducao = prodOrders.filter(o => o.status === 'em_producao').length;
  const finalizados = prodOrders.filter(o => o.status === 'producao_finalizada').length;
  const liberados = prodOrders.filter(o => o.status === 'produto_liberado').length;
  const entregas = prodOrders.filter(o => o.orderType === 'entrega').length;
  const instalacoes = prodOrders.filter(o => o.orderType === 'instalacao').length;

  // Atrasados por data (manual late nao esta acessivel aqui pois vive no PedidosProducaoPage)
  const atrasados = prodOrders.filter(o =>
    o.deliveryDate &&
    new Date(o.deliveryDate) < new Date() &&
    !['producao_finalizada', 'produto_liberado'].includes(o.status)
  ).length;

  const recentOrders = prodOrders.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard de Producao</h1>
        <p className="page-subtitle">Acompanhe a producao em tempo real</p>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <Link to="/producao/pedidos?tipo=" className="block">
          <StatCard title="Aguardando" value={aguardando} icon={Clock} color="text-warning" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        <Link to="/producao/pedidos?tipo=entrega" className="block">
          <StatCard title="Entregas" value={entregas} icon={Truck} color="text-primary" />
        </Link>
        <Link to="/producao/pedidos?tipo=instalacao" className="block">
          <StatCard title="Instalacoes" value={instalacoes} icon={Wrench} color="text-producao" />
        </Link>
        <Link to="/producao/pedidos?tipo=atrasado" className="block">
          <StatCard title="Atrasados" value={atrasados} icon={AlertTriangle} color="text-destructive" />
        </Link>
        <Link to="/producao/pedidos?tipo=agendado" className="block">
          <StatCard title="Agendados" value={0} icon={CalendarClock} color="text-info" />
        </Link>
      </div>

      {/* Atalhos rapidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/producao/pedidos?tipo=entrega" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Pedidos de Entrega</p>
              <p className="text-xs text-muted-foreground">{entregas} pedido(s) de entrega ativo(s)</p>
            </div>
          </div>
        </Link>
        <Link to="/producao/pedidos?tipo=instalacao" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Pedidos de Instalacao</p>
              <p className="text-xs text-muted-foreground">{instalacoes} pedido(s) de instalacao ativo(s)</p>
            </div>
          </div>
        </Link>
        <Link to="/producao/pedidos?tipo=atrasado" className="card-section p-5 hover:shadow-lg hover:shadow-destructive/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer border-destructive/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Pedidos Atrasados</p>
              <p className="text-xs text-muted-foreground">{atrasados} pedido(s) com data vencida</p>
            </div>
          </div>
        </Link>
        <Link to="/producao/pedidos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Ler Codigo de Barras</p>
              <p className="text-xs text-muted-foreground">Liberar produtos escaneados</p>
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
                const isLate = order.deliveryDate
                  ? new Date(order.deliveryDate) < new Date() && !['producao_finalizada', 'produto_liberado'].includes(order.status)
                  : false;
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
