import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { RealtimeNotificationHandler } from '@/components/shared/RealtimeNotificationHandler';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { 
  Package, Clock, Factory, CheckCircle, ScanLine, Printer, Truck, 
  Wrench, AlertTriangle, Calendar, TrendingUp, Activity, Zap, 
  History, Timer, ArrowUpRight, ChevronRight, BarChart2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area 
} from 'recharts';

const ProducaoDashboard: React.FC = () => {
  const { orders, barcodeScans, loadFromSupabase, loadBarcodeScans } = useERP();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  const isCarenagem = user?.role === 'producao_carenagem';
  const mainColor = isCarenagem ? 'text-indigo-600' : 'text-producao';
  const MainIcon = isCarenagem ? Truck : Factory;
  const mainGradient = isCarenagem ? 'from-indigo-600/30 to-indigo-600/5' : 'from-producao/30 to-producao/5';
  const mainBorder = isCarenagem ? 'border-indigo-600/30' : 'border-producao/30';
  const mainShadow = isCarenagem ? 'hover:shadow-indigo-600/15' : 'hover:shadow-producao/15';
  const mainBg = isCarenagem ? 'bg-indigo-600' : 'bg-producao';

  // Monitora em tempo real quando novos pedidos chegam para produção
  useRealtimeOrders((event) => {
    if (event.type === 'UPDATE' && event.previousStatus !== 'aguardando_producao' && event.order.status === 'aguardando_producao') {
      setNotificationCount(prev => prev + 1);
      setTimeout(() => {
        loadFromSupabase();
        loadBarcodeScans();
      }, 500);
    }
  }, ['aguardando_producao']);

  const scannedOrderIds = useMemo(() => new Set(barcodeScans.filter(s => s.success).map(s => s.orderId)), [barcodeScans]);

  // Lista de pedidos para exibição nas tabelas/filtros (ainda não finalizados totalmente)
  const prodOrders = useMemo(() => orders.filter(o => {
    const baseStatus = ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status);
    
    if (!baseStatus) return false;

    const hasCarenagem = o.items.some(item => 
      item.product.toLowerCase().includes('carenagem') || 
      item.product.toLowerCase().includes('side skirt')
    );

    if (user?.role === 'producao_carenagem') return hasCarenagem;
    if (user?.role === 'producao') return !hasCarenagem;
    return true;
  }), [orders, user?.role]);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Stats Reais (Independente de scan para os cards de status)
  const aguardando = prodOrders.filter(o => o.status === 'aguardando_producao').length;
  const emProducao = prodOrders.filter(o => o.status === 'em_producao').length;
  
  // Finalizados hoje (baseado em scans de sucesso hoje)
  const finalizadosHoje = useMemo(() => {
    return barcodeScans.filter(s => s.scannedAt && s.scannedAt.startsWith(todayStr) && s.success).length;
  }, [barcodeScans, todayStr]);

  const atrasadosCount = prodOrders.filter(o => {
    const dStr = o.deliveryDate || '';
    const iStr = o.installationDate || '';
    return ((dStr && dStr < todayStr) || (iStr && iStr < todayStr)) && 
           !['producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status);
  }).length;

  const instalacoes = prodOrders.filter(o => o.orderType === 'instalacao').length;

  // Chart Data: Produção nos últimos 7 dias
  const productivityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const count = barcodeScans.filter(s => s.scannedAt && s.scannedAt.startsWith(date) && s.success).length;
      const [year, month, day] = date.split('-');
      return {
        date: `${day}/${month}`,
        count,
        fullDate: date
      };
    });
  }, [barcodeScans]);

  // Top Products in Production (Considera todos os pedidos que entraram em produção)
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.filter(o => ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status)).forEach(o => {
      if (!o.items) return;
      o.items.forEach(item => {
        counts[item.product] = (counts[item.product] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - (a[1] as number))
      .slice(0, 5);
  }, [orders]);

  // Scans recentes
  const recentScans = useMemo(() => {
    return barcodeScans
      .filter(s => s.success)
      .sort((a, b) => new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime())
      .slice(0, 5);
  }, [barcodeScans]);

  return (
    <div className="space-y-8 pb-12">
      <RealtimeNotificationHandler />
      
      {/* Header Modernizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3">
             <div className={`p-2 rounded-xl bg-gradient-to-br ${mainGradient} border ${mainBorder}`}>
               <MainIcon className={`w-6 h-6 ${mainColor}`} />
             </div>
             Controle de Produção
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Gere eficiência através do monitoramento em tempo real da fábrica</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-card/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizado via Supabase Realtime</span>
           </div>
        </div>
      </div>

      {/* Stats principals com visual premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link to={`/${user?.role}/pedidos?tipo=aguardando`} className="group">
          <div className="stat-card relative overflow-hidden group-hover:shadow-xl group-hover:shadow-warning/5 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 font-black text-warning/10 text-6xl -mr-4 -mt-4 transition-transform group-hover:rotate-12">
              <Clock className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Aguardando</p>
              <h3 className="text-3xl font-black text-foreground">{aguardando}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-warning">
                {notificationCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-warning/10 animate-pulse">
                    +{notificationCount} NOVOS
                  </span>
                ) : 'FILA DE ENTRADA'}
              </div>
            </div>
          </div>
        </Link>

        <Link to={`/${user?.role}/pedidos?tipo=producao`} className="group">
          <div className="stat-card relative overflow-hidden group-hover:shadow-xl group-hover:shadow-producao/10 transition-all">
             <div className="absolute top-0 right-0 w-24 h-24 bg-producao/5 font-black text-producao/10 text-6xl -mr-4 -mt-4 transition-transform group-hover:rotate-12">
              <Factory className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Em Produção</p>
              <h3 className="text-3xl font-black text-foreground">{emProducao}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-producao">
                MANUFATURA ATIVA
              </div>
            </div>
          </div>
        </Link>

        <Link to={`/${user?.role}/pedidos?tipo=historico`} className="group">
          <div className="stat-card relative overflow-hidden group-hover:shadow-xl group-hover:shadow-success/5 transition-all">
             <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 font-black text-success/10 text-6xl -mr-4 -mt-4 transition-transform group-hover:rotate-12">
              <CheckCircle className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Finalizados</p>
              <h3 className="text-3xl font-black text-foreground">{finalizadosHoje}</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-success/80">
                <ArrowUpRight className="w-3.5 h-3.5" /> HOJE
              </div>
            </div>
          </div>
        </Link>

        <Link to={`/${user?.role}/pedidos?tipo=atrasado`} className="group">
          <div className={`stat-card relative overflow-hidden group-hover:shadow-xl group-hover:shadow-destructive/10 transition-all ${atrasadosCount > 0 ? 'bg-destructive/[0.02] border-destructive/20' : ''}`}>
             <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 font-black text-destructive/10 text-6xl -mr-4 -mt-4 transition-transform group-hover:rotate-12">
              <AlertTriangle className="w-full h-full" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Atrasados</p>
              <h3 className={`text-3xl font-black ${atrasadosCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{atrasadosCount}</h3>
              <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-bold ${atrasadosCount > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
                {atrasadosCount > 0 ? 'AÇÃO NECESSÁRIA' : 'DENTRO DO PRAZO'}
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Produtividade */}
        <div className="lg:col-span-2 card-section p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-black uppercase tracking-tight">Produtividade Semanal</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-primary" />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase">Liberados</span>
              </div>
            </div>
          </div>
          
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderRadius: '12px', 
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {productivityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === productivityData.length - 1 ? 'hsl(var(--primary))' : 'rgba(var(--primary), 0.15)'} 
                      className="transition-all duration-300 hover:opacity-100 opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Produtos em Fila */}
        <div className="card-section p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-producao/10 text-producao">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black uppercase tracking-tight">Mais Produzidos</h2>
          </div>
          
          <div className="space-y-4">
            {topProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground italic text-sm">Sem dados de produção</div>
            )}
            {topProducts.map(([product, count], idx) => (
              <div key={product} className="flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  #{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-foreground uppercase truncate group-hover:text-primary transition-colors">{product}</p>
                  <div className="w-full bg-muted/30 h-1.5 rounded-full mt-1.5 overflow-hidden">
                     <div 
                       className={`h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000`} 
                       style={{ width: `${Math.min(100, (count / (topProducts[0][1] as number)) * 100)}%` }}
                     />
                  </div>
                </div>
                <div className="text-sm font-black text-foreground ml-2">
                  {count}
                </div>
              </div>
            ))}
          </div>

          <Link to={`/${user?.role}/pedidos`} className="flex items-center justify-center gap-2 w-full mt-8 py-3 rounded-xl border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all group">
             Ver Todos os Produtos <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banner de Scan Rápido */}
        <div className="space-y-4">
           <Link to={`/${user?.role}/pedidos?scan=true`} className={`block relative overflow-hidden rounded-3xl p-8 group border border-border/40 bg-card hover:shadow-2xl transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${mainGradient} opacity-50 blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-125`} />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${mainBg} flex items-center justify-center text-white shadow-2xl transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110`}>
                  <ScanLine className="w-10 h-10" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-tight">Escaneamento <br className="hidden sm:block" /> Industrial</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-2 max-w-xs">Use o código de barras para liberar o fluxo de entrega de forma automatizada.</p>
                </div>
                <div className="sm:ml-auto">
                    <div className="w-12 h-12 rounded-full border border-border/60 flex items-center justify-center bg-background/50 backdrop-blur-sm group-hover:bg-primary transition-all duration-300">
                      <ChevronRight className="w-6 h-6 text-foreground group-hover:text-white transition-colors" />
                    </div>
                </div>
              </div>
           </Link>

           <div className="grid grid-cols-2 gap-4">
              <Link to={`/${user?.role}/pedidos?tipo=instalacao`} className="p-5 rounded-2xl bg-card border border-border/40 hover:border-primary/40 transition-all flex items-center gap-4 group">
                 <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                   <Wrench className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Instalações</p>
                    <p className="text-lg font-black text-foreground">{instalacoes}</p>
                 </div>
              </Link>
              <Link to={`/${user?.role}/pedidos?view=calendar`} className="p-5 rounded-2xl bg-card border border-border/40 hover:border-primary/40 transition-all flex items-center gap-4 group">
                 <div className="p-2.5 rounded-xl bg-info/10 text-info group-hover:scale-110 transition-transform">
                   <Calendar className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Calendário</p>
                    <p className="text-lg font-black text-foreground">{orders.length}</p>
                 </div>
              </Link>
           </div>
        </div>

        {/* Feed de Atividade Recente */}
        <div className="card-section p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-base font-black uppercase tracking-tight">Atividade Recente</h2>
            </div>
          </div>
          
          <div className="flex-1 space-y-6 relative ml-4 border-l border-border/40 pl-8 py-2">
            {recentScans.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic text-sm ml-[-2rem]">Aguardando primeiro scan do dia...</div>
            )}
            {recentScans.map((scan, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute top-1.5 -left-[37px] w-4 h-4 rounded-full bg-background border-2 border-primary group-hover:bg-primary transition-all duration-300 shadow-sm" />
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-foreground uppercase tracking-tight leading-none mb-1 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/${user?.role}/pedidos?view=${scan.orderId}`)}>
                      PEDIDO {scan.orderNumber}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="producao_finalizada" />
                      <span className="text-[10px] font-bold text-muted-foreground">Escaneado com sucesso</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-foreground">
                      {scan.scannedAt ? new Date(scan.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {scan.scannedAt ? new Date(scan.scannedAt).toLocaleDateString('pt-BR') : '--/--/----'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de Pedidos Populares mudou para Mini cards de Urgência */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning fill-warning" /> Urgências & Pendências
          </h2>
          <Link to={`/${user?.role}/pedidos`} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ir para produção completa</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prodOrders.filter(o => {
            const dStr = o.deliveryDate || '';
            const iStr = o.installationDate || '';
            return ((dStr && dStr < todayStr) || (iStr && iStr < todayStr));
          }).slice(0, 3).map(order => (
            <div 
              key={order.id} 
              className="p-4 rounded-2xl bg-card border border-destructive/20 hover:border-destructive/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              onClick={() => navigate(`/${user?.role}/pedidos?view=${order.id}`)}
            >
               <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-black text-foreground uppercase tracking-tighter">#{order.number}</span>
                 <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest">ATRASADO</span>
               </div>
               <p className="text-sm font-black text-foreground truncate uppercase">{order.clientName}</p>
               <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-destructive" /> {formatDate(order.deliveryDate || order.installationDate)}</span>
                  <span className="group-hover:text-primary transition-colors flex items-center gap-1">DETALHES <ChevronRight className="w-3 h-3" /></span>
               </div>
            </div>
          ))}
          {prodOrders.filter(o => o.orderType === 'instalacao').slice(0, 3).map(order => (
            <div 
              key={order.id} 
              className="p-4 rounded-2xl bg-card border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
              onClick={() => navigate(`/${user?.role}/pedidos?view=${order.id}`)}
            >
               <div className="flex items-center justify-between mb-3">
                 <span className="text-xs font-black text-foreground uppercase tracking-tighter">#{order.number}</span>
                 <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest">INSTALAÇÃO</span>
               </div>
               <p className="text-sm font-black text-foreground truncate uppercase">{order.clientName}</p>
               <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-amber-500" /> {formatDate(order.installationDate)}</span>
                  <span className="group-hover:text-primary transition-colors flex items-center gap-1 text-primary-foreground/0 group-hover:text-primary">DETALHES <ChevronRight className="w-3 h-3" /></span>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProducaoDashboard;
