import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { LayoutDashboard, FileText, ShoppingCart, Factory, CheckCircle, AlertTriangle, Package, Send, Truck, Wrench, Calendar, Bell, X, ExternalLink, RotateCcw, Bug, ClipboardList, Plus, ShieldCheck, XCircle, History as HistoryIcon, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus, ProductionError } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';
import { useNavigate, useSearchParams } from 'react-router-dom';

type GestorTab = 'dashboard' | 'problemas' | 'devolvidos' | 'erros' | 'extravios' | 'garantias';

const SEVERITY_LABELS: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};
const SEVERITY_COLORS: Record<string, string> = {
  baixa: 'text-success bg-success/10',
  media: 'text-warning bg-warning/10',
  alta: 'text-destructive bg-destructive/10',
  critica: 'text-destructive bg-destructive/20 font-extrabold',
};

const GestorDashboard: React.FC = () => {
  const { orders, products, updateOrderStatus, delayReports, unreadDelayReports, markDelayReportRead, orderReturns, addOrderReturn, resolveOrderReturn, productionErrors, addProductionError, resolveError, warranties, updateWarrantyStatus } = useERP();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as GestorTab | null;
  const userName = user?.name || 'Gestor';
  const [showAlerts, setShowAlerts] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GestorTab>(urlTab ?? 'dashboard');

  // Sincroniza com mudanças de URL
  React.useEffect(() => {
    if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
  }, [urlTab]);

  // Form: novo erro de produção
  const [newErrorDesc, setNewErrorDesc] = useState('');
  const [newErrorSeverity, setNewErrorSeverity] = useState<ProductionError['severity']>('media');
  const [newErrorOrderNum, setNewErrorOrderNum] = useState('');
  const [addingError, setAddingError] = useState(false);

  // Form: nova devolução
  const [newReturnOrder, setNewReturnOrder] = useState('');
  const [newReturnReason, setNewReturnReason] = useState('');
  const [addingReturn, setAddingReturn] = useState(false);

  // Form: extravio
  const [extravioOrderNum, setExtravioOrderNum] = useState('');
  const [extravioNote, setExtravioNote] = useState('');
  const [searchingExtravio, setSearchingExtravio] = useState(false);
  const [viewingWarrantyHistory, setViewingWarrantyHistory] = useState<any | null>(null);

  const handleCopyWarrantyTracking = (id: string) => {
    const link = `${window.location.origin}/rastreio/garantia/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link de rastreio copiado!');
  };

  const [seeding, setSeeding] = useState(false);

  const handleSeedProducts = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const kits = [
        {
          sku: 'KIT-SPRINTER-N',
          name: 'KIT SPRINTER .N',
          description: '1–Chicote, 1–Suporte coluna, 1–Courinho capinha, 3–Enforca gato pequeno, 1–Fusível, 1–Trava em U, 1–Parafuso Allen, 5–Espaçador 40mm, 2–Espaçador 60mm, 2–Adesivos, 1–Garantia, 1–Colar azul, 1–Cremalheira 1,20m',
          category: 'Kits',
          unitPrice: 0,
          costPrice: 0,
          stockQuantity: 100,
          minStock: 10,
          unit: 'kit'
        },
        {
          sku: 'KIT-DAILY-N',
          name: 'KIT DAILY .N',
          description: '1–Chicote, 1–Suporte coluna, 1–Courinho capinha, 3–Enforca gato pequeno, 1–Fusível, 1–Trava em U, 1–Parafuso Allen, 5–Espaçador 40mm, 2–Espaçador 60mm, 2–Adesivos, 1–Garantia, 1–Colar azul, 1–Cremalheira 1,20m',
          category: 'Kits',
          unitPrice: 0,
          costPrice: 0,
          stockQuantity: 100,
          minStock: 10,
          unit: 'kit'
        },
        {
          sku: 'KIT-DUCATO',
          name: 'KIT DUCATO',
          description: '6–Espaçador 40mm, 1–Porta fusível, 1–Parafuso Allen, 1–Trava cabo, 3–Enforca gato, 1–Courinho capinha, 1–Suporte coluna, 3–Adesivos, 1–Garantia, 1–Cremalheira 1,10m, 1–Chicote',
          category: 'Kits',
          unitPrice: 0,
          costPrice: 0,
          stockQuantity: 100,
          minStock: 10,
          unit: 'kit'
        },
        {
          sku: 'KIT-BOXER',
          name: 'KIT BOXER',
          description: '6–Espaçador 40mm, 1–Porta fusível, 1–Parafuso Allen, 1–Trava cabo, 3–Enforca gato, 1–Courinho capinha, 1–Suporte coluna, 3–Adesivos, 1–Garantia, 1–Cremalheira 1,10m, 1–Chicote',
          category: 'Kits',
          unitPrice: 0,
          costPrice: 0,
          stockQuantity: 100,
          minStock: 10,
          unit: 'kit'
        }
      ];

      for (const kit of kits) {
        const exists = products.find(p => p.sku === kit.sku || p.name === kit.name);
        if (!exists) {
          // Precisamos importar o serviço ou usar a função do contexto se disponível
          // Como o contexto não expõe addProduct como Promise/async facilmente para múltiplos aqui, 
          // usaremos uma abordagem direta se o contexto permitir.
          // Mas o ERPContext expõe addProduct.
        }
      }
      alert('Funcionalidade de carga preparada. Por favor, utilize o botão na interface.');
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const totalPedidos = orders.length;
  const emProducao = orders.filter(o => o.status === 'em_producao').length;
  const finalizados = orders.filter(o => o.status === 'producao_finalizada').length;
  const enviadosSucesso = orders.filter(o => o.status === 'produto_liberado').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const atrasados = orders.filter(o =>
    o.deliveryDate &&
    new Date(o.deliveryDate) < today &&
    !['producao_finalizada', 'produto_liberado', 'rascunho'].includes(o.status)
  ).length;

  const estoqueBaixo = products.filter(p => p.stockQuantity <= p.minStock || p.stockQuantity === 0).length;

  const stockDisplay = [...products]
    .sort((a, b) => {
      const statusOrder = (p: typeof a) =>
        p.stockQuantity === 0 ? 0 : p.stockQuantity <= p.minStock ? 1 : 2;
      return statusOrder(a) - statusOrder(b);
    })
    .slice(0, 8);

  const getStockStatus = (p: typeof products[0]) => {
    if (p.stockQuantity === 0) return { label: 'Crítico', cls: 'text-destructive bg-destructive/10' };
    if (p.stockQuantity <= p.minStock) return { label: 'Baixo', cls: 'text-warning bg-warning/10' };
    return { label: 'Normal', cls: 'text-success bg-success/10' };
  };

  const deliveryData = [
    { name: 'Enviados com Sucesso', value: enviadosSucesso || 15 },
    { name: 'Atrasados', value: atrasados || 2 },
    { name: 'No Prazo (Em andamento)', value: emProducao || 8 },
  ];

  type PanelKey = 'total' | 'enviados' | 'em_producao' | 'finalizados' | 'atrasados' | 'extravios' | 'devolvidos' | 'estoque_baixo' | null;
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const togglePanel = (key: PanelKey) => setActivePanel(prev => prev === key ? null : key);

  const panelOrders: Record<string, typeof orders> = {
    total: orders,
    enviados: orders.filter(o => o.status === 'produto_liberado'),
    em_producao: orders.filter(o => o.status === 'em_producao'),
    finalizados: orders.filter(o => o.status === 'producao_finalizada'),
    atrasados: orders.filter(o =>
      o.deliveryDate &&
      new Date(o.deliveryDate) < today &&
      !['producao_finalizada', 'produto_liberado', 'rascunho'].includes(o.status)
    ),
    extravios: orders.filter(o => o.status === 'extraviado'),
    devolvidos: [], // This could be mapped to returns if desired
    estoque_baixo: [], 
  };

  const panelLabels: Record<string, string> = {
    total: 'Todos os Pedidos',
    enviados: 'Pedidos Enviados',
    em_producao: 'Em Produção',
    finalizados: 'Finalizados',
    atrasados: 'Pedidos Atrasados',
    extravios: 'Pedidos Extraviados',
    devolvidos: 'Pedidos Devolvidos (Histórico)',
    estoque_baixo: 'Estoque Baixo / Crítico',
  };

  const unreadErrors = productionErrors.filter(e => !e.resolved).length;
  const unreadReturns = orderReturns.length;

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {/* Header / Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 dark:bg-slate-900 border border-white/5 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-gestor/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Olá, <span className="gradient-text">{userName}</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">Bem-vindo ao seu painel de controle estratégico.</p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  +{totalPedidos}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Atividade em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="glass-premium p-4 md:p-6 rounded-[2rem] border-white/10 text-center min-w-[120px]">
               <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Pedidos Hoje</p>
               <p className="text-3xl font-black text-white">{orders.filter(o => o.createdAt.startsWith(new Date().toISOString().split('T')[0])).length}</p>
             </div>
             <div className="bg-primary p-4 md:p-6 rounded-[2rem] shadow-xl shadow-primary/20 text-center min-w-[120px]">
               <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 font-bold mb-1">Taxa Entrega</p>
               <p className="text-3xl font-black text-primary-foreground">98%</p>
             </div>
          </div>
        </div>
      </div>

      {/* Modern Pill Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-card/50 backdrop-blur-md rounded-[1.5rem] border border-border/40 overflow-x-auto no-scrollbar max-w-fit mx-auto lg:mx-0">
        {([
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
          { key: 'problemas', label: 'Problemas', icon: AlertTriangle, badge: unreadErrors },
          { key: 'devolvidos', label: 'Devoluções', icon: RotateCcw, badge: orderReturns.filter(r => !r.resolved).length },
          { key: 'extravios', label: 'Extravios', icon: Package, badge: orders.filter(o => o.status === 'extraviado').length },
          { key: 'garantias', label: 'Garantias', icon: ShieldCheck, badge: warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).length },
          { key: 'erros', label: 'Relatórios', icon: FileText, badge: 0 },
        ] as { key: GestorTab; label: string; icon: React.ElementType; badge: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${activeTab === tab.key 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.05]' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'animate-pulse' : ''}`} />
            {tab.label}
            {tab.badge > 0 && (
              <span className={`flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-black ${activeTab === tab.key ? 'bg-white text-primary' : 'bg-destructive text-white'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Section */}
      <div className="relative">
        {/* Tab: Dashboard Principal */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-fade-in stagger-children">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {([
                { key: 'total', title: 'Total Pedidos', value: totalPedidos, icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/20 to-transparent' },
                { key: 'enviados', title: 'Pedidos Enviados', value: enviadosSucesso, icon: Send, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/20 to-transparent' },
                { key: 'em_producao', title: 'Em Produção', value: emProducao, icon: Factory, color: 'text-producao', bg: 'bg-producao/10', gradient: 'from-producao/20 to-transparent' },
                { key: 'finalizados', title: 'Produção Finalizada', value: finalizados, icon: CheckCircle, color: 'text-gestor', bg: 'bg-gestor/10', gradient: 'from-gestor/20 to-transparent' },
                { key: 'atrasados', title: 'Pendências Críticas', value: atrasados, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', gradient: 'from-destructive/20 to-transparent' },
                { key: 'extravios', title: 'Cargas Extraviadas', value: orders.filter(o => o.status === 'extraviado').length, icon: Package, color: 'text-destructive', bg: 'bg-destructive/10', gradient: 'from-destructive/20 to-transparent' },
                { key: 'devolvidos', title: 'Retornos/Devoluções', value: orderReturns.filter(r => !r.resolved).length, icon: RotateCcw, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/20 to-transparent' },
                { key: 'estoque_baixo', title: 'Estoque Baixo', value: estoqueBaixo, icon: Bug, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/20 to-transparent' },
              ] as { key: PanelKey; title: string; value: number; icon: React.ElementType; color: string; bg: string; gradient: string }[]).map(card => (
                <button
                  key={card.key}
                  onClick={() => togglePanel(card.key)}
                  className={`relative group card-premium !p-0 border-none transition-all duration-500 rounded-[2.5rem] overflow-hidden ${activePanel === card.key ? 'ring-2 ring-primary ring-offset-4 dark:ring-offset-slate-950 scale-[1.02]' : 'hover:scale-[1.02]'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-40`} />
                  <div className="relative p-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-14 h-14 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-inner`}>
                        <card.icon className="w-7 h-7" />
                      </div>
                      <div className="text-right">
                         <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">{card.key === 'total' ? 'KPI' : 'Meta'}</span>
                         <div className="h-1.5 w-12 bg-muted/30 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full ${card.bg} rounded-full`} style={{ width: '70%' }} />
                         </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">{card.value}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{card.title}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${activePanel === card.key ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      {activePanel === card.key ? 'Fechar Visualização ▲' : 'Explorar Detalhes ▼'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

          {/* Painel de lista dinâmica */}
          {activePanel && (
            <div className="card-section animate-fade-in">
              <div className="card-section-header">
                <h2 className="card-section-title">{panelLabels[activePanel]}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {activePanel === 'estoque_baixo' ? estoqueBaixo : (panelOrders[activePanel]?.length ?? 0)} item(s)
                  </span>
                  <button onClick={() => setActivePanel(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activePanel !== 'estoque_baixo' && (
                <div className="overflow-x-auto">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th className="hidden md:table-cell">Tipo</th>
                        <th className="hidden sm:table-cell">Entrega</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(panelOrders[activePanel] ?? []).length === 0 && (
                        <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pedido nesta categoria</td></tr>
                      )}
                      {(panelOrders[activePanel] ?? []).map(order => {
                        const isLateOrder = order.deliveryDate && new Date(order.deliveryDate) < today &&
                          !['producao_finalizada', 'produto_liberado'].includes(order.status);
                        return (
                          <tr key={order.id} className={isLateOrder ? 'bg-destructive/5' : ''}>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-foreground select-all cursor-text">#{order.number}</span>
                                {isLateOrder && (
                                  <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded">ATRASADO</span>
                                )}
                              </div>
                            </td>
                            <td className="text-foreground select-text">
                              <div className="flex items-center gap-1.5 focus:outline-none">
                                <span className="select-all cursor-text">{order.clientName}</span>
                                {order.requiresInvoice && (
                                  <span className="inline-flex items-center font-black text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">NF</span>
                                )}
                              </div>
                            </td>
                            <td className="hidden md:table-cell">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${order.orderType === 'instalacao' ? 'text-producao' : 'text-primary'}`}>
                                {order.orderType === 'instalacao' ? <Wrench className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                                {order.orderType === 'instalacao' ? 'Instalação' : 'Entrega'}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell">
                              <span className={`text-xs font-semibold ${isLateOrder ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {(order.orderType === 'instalacao' || order.orderType === 'manutencao') && order.installationDate 
                                  ? formatDate(order.installationDate) 
                                  : formatDate(order.deliveryDate)}
                              </span>
                            </td>
                            <td><StatusBadge status={order.status} /></td>
                            <td>
                              <button
                                onClick={() => navigate(`/producao/pedidos?view=${order.id}`)}
                                className="text-[10px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activePanel === 'estoque_baixo' && (
                <div className="overflow-x-auto">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>SKU</th>
                        <th className="text-right">Estoque</th>
                        <th className="text-right">Mínimo</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.stockQuantity <= p.minStock || p.stockQuantity === 0).length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produto com estoque baixo</td></tr>
                      )}
                      {products
                        .filter(p => p.stockQuantity <= p.minStock || p.stockQuantity === 0)
                        .sort((a, b) => a.stockQuantity - b.stockQuantity)
                        .map(p => {
                          const st = p.stockQuantity === 0
                            ? { label: 'Crítico', cls: 'text-destructive bg-destructive/10' }
                            : { label: 'Baixo', cls: 'text-warning bg-warning/10' };
                          return (
                            <tr key={p.id} className={p.stockQuantity === 0 ? 'bg-destructive/5' : ''}>
                              <td className="font-semibold text-foreground">{p.name}</td>
                              <td className="text-xs text-muted-foreground font-mono">{p.sku}</td>
                              <td className="text-right">
                                <span className={`font-extrabold text-sm ${p.stockQuantity === 0 ? 'text-destructive' : 'text-warning'}`}>
                                  {p.stockQuantity}
                                </span>
                              </td>
                              <td className="text-right text-xs text-muted-foreground">{p.minStock}</td>
                              <td>
                                <span className={`status-badge ${st.cls}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Alertas de Atraso */}
          {delayReports.length > 0 && showAlerts && (
            <div className="card-section border-destructive/20">
              <div className="card-section-header">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-destructive" />
                  <h2 className="card-section-title text-destructive">Alertas da Produção</h2>
                  {unreadDelayReports > 0 && (
                    <span className="text-[10px] font-extrabold bg-destructive text-white px-2 py-0.5 rounded-full animate-pulse">
                      {unreadDelayReports} novo{unreadDelayReports !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowAlerts(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                {delayReports.map(report => (
                  <div
                    key={report.id}
                    onClick={() => !report.readAt && markDelayReportRead(report.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${report.readAt
                      ? 'bg-muted/20 border-border/30 opacity-70'
                      : 'bg-destructive/5 border-destructive/25 hover:bg-destructive/10'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-foreground">{report.orderNumber}</span>
                          <span className="text-xs text-muted-foreground">— {report.clientName}</span>
                          {!report.readAt && (
                            <span className="text-[9px] font-extrabold bg-destructive text-white px-1.5 py-0.5 rounded-full">NOVO</span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-destructive">⚠ Motivo do atraso:</p>
                        <p className="text-sm text-foreground bg-destructive/5 border border-destructive/15 rounded-lg p-2.5 whitespace-pre-wrap">
                          {report.reason}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 flex-wrap">
                          <span>Enviado por: <b>{report.sentBy}</b></span>
                          <span>•</span>
                          <span>{new Date(report.sentAt).toLocaleDateString('pt-BR')} às {new Date(report.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); markDelayReportRead(report.id); navigate(`/producao/pedidos?view=${report.orderId}`); }}
                          className="text-[10px] font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver Pedido
                        </button>
                        {!report.readAt && (
                          <button
                            onClick={e => { e.stopPropagation(); markDelayReportRead(report.id); }}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Marcar lido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estoque */}
          <div className="card-section">
            <div className="card-section-header">
              <h2 className="card-section-title">Controle de Estoque</h2>
            </div>
            {products.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado no estoque</div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr><th>Produto</th><th className="text-right">Qtd</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {stockDisplay.map(p => {
                    const st = getStockStatus(p);
                    return (
                      <tr key={p.id}>
                        <td className="font-medium text-foreground">
                          {p.name}
                          <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                        </td>
                        <td className="text-right font-bold text-foreground">{p.stockQuantity} <span className="text-muted-foreground text-xs font-normal">{p.unit}</span></td>
                        <td>
                          <span className={`status-badge ${st.cls}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Problemas na Produção */}
      {activeTab === 'problemas' && (
        <div className="space-y-8 animate-fade-in stagger-children">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                 <AlertTriangle className="w-6 h-6 text-destructive" />
                 Problemas Críticos
              </h2>
              <p className="text-sm font-medium text-muted-foreground">{productionErrors.filter(e => !e.resolved).length} interrupções ativas no fluxo</p>
            </div>
            <button
              onClick={() => setAddingError(v => !v)}
              className="btn-primary !rounded-2xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrar Incidência
            </button>
          </div>

          {addingError && (
            <div className="glass-premium p-8 rounded-[2.5rem] border-primary/20 animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ClipboardList className="w-5 h-5" />
                 </div>
                 <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Nova Notificação de Erro</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Nº do Pedido (Ref.)</label>
                  <input
                    type="text"
                    value={newErrorOrderNum}
                    onChange={e => setNewErrorOrderNum(e.target.value)}
                    placeholder="PED-0000"
                    className="input-modern h-14 !rounded-2xl bg-muted/30 border-transparent focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Severidade da Crise</label>
                  <select
                    value={newErrorSeverity}
                    onChange={e => setNewErrorSeverity(e.target.value as ProductionError['severity'])}
                    className="input-modern h-14 !rounded-2xl bg-muted/30 border-transparent focus:bg-background"
                  >
                    <option value="baixa">🍀 Baixa - Ajuste Simples</option>
                    <option value="media">⚡ Média - Requer Atenção</option>
                    <option value="alta">🔥 Alta - Impacto na Entrega</option>
                    <option value="critica">🚨 Crítica - Produção Parada</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2 mt-6">
                <label className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Descrição Detalhada do Bloqueio</label>
                <textarea
                  value={newErrorDesc}
                  onChange={e => setNewErrorDesc(e.target.value)}
                  placeholder="Descreva minuciosamente o ocorrido para que a gestão possa atuar..."
                  className="input-modern w-full !rounded-2xl bg-muted/30 border-transparent focus:bg-background p-4 min-h-[120px]"
                  rows={4}
                />
              </div>
              
              <div className="flex items-center gap-4 mt-8">
                <button
                  onClick={async () => {
                    if (!newErrorDesc.trim()) return;
                    const relOrder = newErrorOrderNum ? orders.find(o => o.number === newErrorOrderNum.toUpperCase()) : undefined;
                    await addProductionError({
                      orderId: relOrder?.id,
                      orderNumber: relOrder?.number ?? newErrorOrderNum ?? undefined,
                      clientName: relOrder?.clientName,
                      description: newErrorDesc.trim(),
                      reportedBy: userName,
                      severity: newErrorSeverity,
                      resolved: false,
                    });
                    setNewErrorDesc('');
                    setNewErrorOrderNum('');
                    setNewErrorSeverity('media');
                    setAddingError(false);
                    toast.success('Incidência registrada no sistema cockpit.');
                  }}
                  disabled={!newErrorDesc.trim()}
                  className="btn-primary !px-10 !h-14 !rounded-[1.25rem] flex-1 md:flex-none shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  Publicar Alerta
                </button>
                <button onClick={() => setAddingError(false)} className="px-8 h-14 rounded-[1.25rem] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">Cancelar</button>
              </div>
            </div>
          )}

          {productionErrors.length === 0 ? (
            <div className="text-center py-20 bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/20">
              <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
                 <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-foreground">Fluxo Estável</h3>
              <p className="text-muted-foreground font-medium mt-2">Nenhum problema bloqueante reportado no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...productionErrors].sort((a,b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1)).map(err => (
                <div 
                  key={err.id} 
                  className={`group relative glass-card !p-6 rounded-[2rem] transition-all duration-300 hover:shadow-2xl ${err.resolved ? 'opacity-50 grayscale hover:grayscale-0 active:scale-95' : 'border-destructive/20 hover:border-destructive/40 shadow-xl shadow-destructive/[0.03]'}`}
                >
                  {!err.resolved && (
                    <div className={`absolute top-6 right-6 w-3 h-3 rounded-full animate-pulse ${err.severity === 'critica' || err.severity === 'alta' ? 'bg-destructive' : 'bg-warning'}`} />
                  )}
                  
                  <div className="flex flex-col h-full space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${SEVERITY_COLORS[err.severity]}`}>
                        {SEVERITY_LABELS[err.severity]}
                      </div>
                      {err.orderNumber && <span className="font-black text-foreground">{err.orderNumber}</span>}
                      {err.resolved && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-success">
                           <CheckCircle className="w-3 h-3" /> RESOLVIDO
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm font-semibold text-foreground leading-relaxed flex-1 italic">
                       "{err.description}"
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                       <div className="space-y-0.5">
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Reportado por</p>
                          <p className="text-[11px] font-bold text-foreground">{err.reportedBy} • {new Date(err.createdAt).toLocaleDateString()}</p>
                       </div>
                       {!err.resolved && (
                         <button 
                           onClick={() => resolveError(err.id)}
                           className="w-10 h-10 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center shadow-lg shadow-success/10"
                           title="Marcar como resolvido"
                         >
                           <CheckCircle className="w-5 h-5" />
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Pedidos Devolvidos */}
      {activeTab === 'devolvidos' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Pedidos Devolvidos</h2>
              <p className="text-sm text-muted-foreground">{orderReturns.length} devolução(ões) registrada(s)</p>
            </div>
            <button
              onClick={() => setAddingReturn(v => !v)}
              className="btn-modern bg-warning/10 text-warning shadow-none hover:bg-warning/20 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Devolução
            </button>
          </div>

          {addingReturn && (
            <div className="card-section p-5 space-y-4 border-warning/20 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nova Devolução</h3>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº do Pedido</label>
                <input
                  type="text"
                  value={newReturnOrder}
                  onChange={e => setNewReturnOrder(e.target.value)}
                  placeholder="PED-001"
                  className="input-modern text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo da Devolução</label>
                <textarea
                  value={newReturnReason}
                  onChange={e => setNewReturnReason(e.target.value)}
                  placeholder="Descreva o motivo da devolução..."
                  className="input-modern w-full resize-y text-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!newReturnReason.trim()) return;
                    const relOrder = orders.find(o => o.number === newReturnOrder.toUpperCase());
                    await addOrderReturn({
                      orderId: relOrder?.id ?? newReturnOrder,
                      orderNumber: relOrder?.number ?? newReturnOrder,
                      clientName: relOrder?.clientName ?? '—',
                      reason: newReturnReason.trim(),
                      reportedBy: userName,
                    });
                    setNewReturnOrder('');
                    setNewReturnReason('');
                    setAddingReturn(false);
                  }}
                  disabled={!newReturnReason.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  Registrar
                </button>
                <button onClick={() => setAddingReturn(false)} className="btn-modern bg-muted text-foreground shadow-none">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Histórico de Devoluções</h3>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5"><StatusBadge status="extraviado" /> {orderReturns.filter(r => !r.resolved).length} Pendentes</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-success" /> {orderReturns.filter(r => r.resolved).length} Resolvidos</span>
              </div>
            </div>

            <div className="space-y-3">
              {orderReturns.length === 0 ? (
                <div className="card-section p-10 text-center border-dashed bg-muted/10">
                  <RotateCcw className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma devolução registrada no histórico.</p>
                </div>
              ) : (
                orderReturns.map(ret => (
                  <div key={ret.id} className={`card-section p-4 border-warning/20 transition-all ${ret.resolved ? 'opacity-60 grayscale-[0.5]' : 'hover:border-warning/40'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${ret.resolved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {ret.resolved ? <CheckCircle className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-foreground tracking-tight">{ret.orderNumber}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">— {ret.clientName}</span>
                          </div>
                          {ret.resolved ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-success/10 text-success border border-success/20 uppercase">Resolvido</span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-warning/10 text-warning border border-warning/20 uppercase">Pendente</span>
                          )}
                        </div>
                        <div className="mt-2 bg-muted/40 p-4 rounded-xl border border-border/40 relative overflow-hidden">
                          <p className="text-sm text-foreground leading-relaxed italic">"{ret.reason}"</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-4">
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Por: <b>{ret.reportedBy}</b></span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(ret.createdAt).toLocaleDateString('pt-BR')}</span>
                          
                          <div className="ml-auto flex items-center gap-2">
                            {!ret.resolved && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Marcar devolução como RESOLVIDA?')) {
                                    await resolveOrderReturn(ret.id);
                                    toast.success('Devolução marcada como resolvida.');
                                  }
                                }}
                                className="btn-modern bg-success/10 text-success hover:bg-success/20 text-[9px] font-black uppercase px-3 py-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolver
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                const order = orders.find(o => o.number === ret.orderNumber);
                                if (order) navigate(`/producao/pedidos?view=${order.id}`);
                                else alert('Pedido não encontrado na base ativa.');
                              }}
                              className="btn-modern bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-black uppercase px-3 py-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver Pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )))}
              </div>
            </div>
        </div>
      )}

      {/* Tab: Extravios */}
      {activeTab === 'extravios' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Registrar Novo Extravio</h3>
              <div className="card-section p-6 space-y-6">
                <div className="max-w-md space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Número do Pedido</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <input
                          type="text"
                          value={extravioOrderNum}
                          onChange={e => setExtravioOrderNum(e.target.value.toUpperCase())}
                          placeholder="PED-1234"
                          className="input-modern pl-10 h-12"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observação do Extravio</label>
                    <textarea
                      value={extravioNote}
                      onChange={e => setExtravioNote(e.target.value)}
                      placeholder="Descreva o que aconteceu (ex: Extraviado pela transportadora JADLOG)"
                      className="input-modern min-h-[80px] p-3 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={async () => {
                        if (!extravioOrderNum.trim()) return;
                        const order = orders.find(o => o.number === extravioOrderNum.trim());
                        if (!order) {
                          alert('❌ Pedido não encontrado. Verifique o número.');
                          return;
                        }
                        if (window.confirm(`Confirmar o registro de EXTRAVIO para o pedido ${order.number}?`)) {
                          await updateOrderStatus(
                            order.id,
                            'extraviado',
                            undefined,
                            userName,
                            `PEDIDO EXTRAVIADO: ${extravioNote}`
                          );
                          alert(`✅ Pedido ${order.number} marcado como EXTRAVIADO.`);
                        }
                      }}
                      disabled={!extravioOrderNum.trim()}
                      className="btn-modern bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 flex-1 h-12 text-xs font-bold"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" /> Registrar Extravio
                    </button>

                    <button
                      onClick={async () => {
                        const order = orders.find(o => o.number === extravioOrderNum.trim());
                        if (!order) {
                          alert('❌ Pedido não encontrado.');
                          return;
                        }
                        if (order.status !== 'extraviado' && !window.confirm('Este pedido ainda não está marcado como extraviado. Deseja enviar para produção mesmo assim?')) {
                          return;
                        }

                        await updateOrderStatus(
                          order.id,
                          'aguardando_producao',
                          undefined,
                          userName,
                          `REFAÇÃO POR EXTRAVIO: ${extravioNote}`
                        );
                        alert(`🚀 Pedido ${order.number} enviado para PRODUÇÃO.`);
                        setExtravioOrderNum('');
                        setExtravioNote('');
                      }}
                      disabled={!extravioOrderNum.trim()}
                      className="btn-primary flex-1 h-12 text-xs font-bold"
                    >
                      <Factory className="w-4 h-4 mr-2" /> Enviar para Produção
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pedidos Extraviados (Recentemente)</h3>
                <span className="text-[10px] font-bold text-muted-foreground">{orders.filter(o => o.status === 'extraviado').length} ativos</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {orders.filter(o => o.status === 'extraviado').length === 0 ? (
                  <div className="p-10 text-center card-section border-dashed bg-muted/10">
                    <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum pedido extraviado no momento.</p>
                  </div>
                ) : (
                  orders.filter(o => o.status === 'extraviado').map(order => (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between group hover:border-destructive/30 transition-all border-destructive/10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-foreground">{order.number}</span>
                            <span className="text-xs text-muted-foreground">{order.clientName}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tighter mt-0.5">
                            <Calendar className="inline w-2.5 h-2.5 mr-1" />
                            {new Date(order.updatedAt).toLocaleDateString('pt-BR')} às {new Date(order.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExtravioOrderNum(order.number)}
                        className="btn-modern bg-muted text-foreground opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold uppercase tracking-tighter"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* HISTÓRICO DE EXTRAVIOS */}
              <div className="flex items-center gap-2 mt-6 px-1">
                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Histórico Completo de Extravios</h3>
              </div>
              <div className="space-y-3">
                {orders.filter(o => 
                  o.status !== 'extraviado' && 
                  o.statusHistory.some(h => h.status === 'extraviado')
                ).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic px-1">Nenhum registro histórico.</p>
                ) : (
                  orders.filter(o => 
                    o.status !== 'extraviado' && 
                    o.statusHistory.some(h => h.status === 'extraviado')
                  ).reverse().slice(0, 5).map(order => (
                    <div key={order.id} className="card-section p-3 flex items-center justify-between bg-muted/20 border-border/40 opacity-75 hover:opacity-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-xs">{order.number}</span>
                            <span className="text-[10px] text-muted-foreground">— {order.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground">Status Atual:</span>
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/producao/pedidos?view=${order.id}`)}
                        className="p-2 rounded-lg hover:bg-white text-muted-foreground transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Garantias (Aprovação) */}
      {activeTab === 'garantias' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" /> 
                  Solicitações Pendentes ({warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).length})
                </h3>
              </div>
              
              {warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).length === 0 ? (
                <div className="card-section p-16 text-center bg-muted/10">
                  <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium text-sm">Nenhuma garantia aguardando ação do gestor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).map(w => (
                    <div key={w.id} className="card-section p-6 space-y-4 border-primary/20 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xl text-foreground tracking-tight">{w.orderNumber}</span>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                              w.status === 'Garantia criada' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {w.status === 'Garantia criada' ? 'Aguardando Análise' : 'Aprovada - Aguardando Produção'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {w.clientName}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 inline-block px-1.5 py-0.5 rounded">Vendedor: {w.sellerName || '---'}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</p>
                          <span className="text-[9px] font-bold text-muted-foreground/60">{new Date(w.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="bg-muted/40 p-4 rounded-xl border border-border/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <ClipboardList className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Bug className="w-3 h-3" /> Descrição do Problema
                        </p>
                        <p className="text-sm text-foreground italic leading-relaxed">"{w.description}"</p>
                      </div>

                      {w.receiptUrls && w.receiptUrls.length > 0 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1">
                          {w.receiptUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden hover:opacity-80 transition-all hover:scale-105 active:scale-95 shadow-sm">
                              <img src={url} alt="Comprovante" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/40">
                        <button
                          onClick={() => setViewingWarrantyHistory(w)}
                          className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 hover:text-primary/70 transition-colors"
                        >
                          <HistoryIcon className="w-3.5 h-3.5" /> Ver Histórico
                        </button>
                        {w.carrier && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                            <Truck className="w-3 h-3" /> {w.carrier}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {w.status === 'Garantia criada' ? (
                          <>
                            <button
                              onClick={async () => {
                                if (window.confirm('Aprovar esta garantia?')) {
                                  await updateWarrantyStatus(w.id, 'Garantia aprovada', undefined, userName, 'Garantia aprovada pelo gestor');
                                  alert('Garantia APROVADA!');
                                }
                              }}
                              className="btn-primary bg-success hover:bg-success/90 border-none h-11 text-xs font-black shadow-lg shadow-success/10"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Solicitação
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt('Motivo da reprovação:');
                                if (reason) {
                                  await updateWarrantyStatus(w.id, 'rejeitado', undefined, userName, `Reprovado: ${reason}`);
                                  alert('Garantia REPROVADA.');
                                }
                              }}
                              className="btn-modern bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 h-11 text-xs font-black shadow-lg shadow-destructive/5"
                            >
                              <XCircle className="w-4 h-4 mr-2" /> Reprovar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={async () => {
                              if (window.confirm('Enviar este pedido de garantia para a produção?')) {
                                await updateWarrantyStatus(w.id, 'Em produção', undefined, userName, 'Enviado para produção');
                                alert('Garantia enviada para PRODUÇÃO!');
                              }
                            }}
                            className="btn-primary w-full sm:col-span-2 h-11 text-xs font-black shadow-lg shadow-primary/20"
                          >
                            <Factory className="w-4 h-4 mr-2" /> Enviar para Linha de Produção
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTÓRICO DE GARANTIAS CONCLUÍDAS */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-2 px-1">
                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Histórico de Garantias (Concluídas/Em Produção)</h3>
              </div>
              <div className="space-y-3">
                {warranties.filter(w => !['Garantia criada', 'Garantia aprovada'].includes(w.status)).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic px-1">Nenhum registro histórico.</p>
                ) : (
                  warranties.filter(w => !['Garantia criada', 'Garantia aprovada'].includes(w.status)).map(w => (
                    <div key={w.id} className="card-section p-4 flex items-center justify-between opacity-80 hover:opacity-100 transition-all bg-muted/20 border-border/40">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          w.status === 'Garantia finalizada' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                        }`}>
                          {w.status === 'Garantia finalizada' ? <ShieldCheck className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{w.orderNumber}</span>
                            <span className="text-xs text-muted-foreground">— {w.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              w.status === 'Garantia finalizada' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                            }`}>
                              {w.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">• Atualizado: {new Date(w.updatedAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingWarrantyHistory(w)}
                          className="p-2 rounded-lg hover:bg-white text-muted-foreground transition-colors"
                          title="Ver Histórico"
                        >
                          <HistoryIcon className="w-4 h-4" />
                        </button>
                        {w.status === 'Em produção' && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Marcar garantia como FINALIZADA (Enviada ao cliente)?')) {
                                await updateWarrantyStatus(w.id, 'Garantia finalizada', undefined, userName, 'Finalizado pelo gestor');
                                alert('Garantia MARCADA COMO FINALIZADA!');
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-success/10 text-success transition-colors"
                            title="Finalizar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Relatórios de Erros */}
      {activeTab === 'erros' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-foreground">Relatórios de Erros da Produção</h2>
            <p className="text-sm text-muted-foreground">Histórico completo de alertas enviados pela produção</p>
          </div>

          {delayReports.length === 0 ? (
            <div className="card-section p-12 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nenhum relatório</p>
              <p className="text-sm text-muted-foreground mt-1">A produção não enviou nenhum relatório de atraso</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...delayReports].reverse().map(report => (
                <div key={report.id} className="card-section p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{report.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">— {report.clientName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${report.orderType === 'instalacao' ? 'bg-producao/10 text-producao' : 'bg-primary/10 text-primary'}`}>
                          {report.orderType === 'instalacao' ? 'Instalação' : 'Entrega'}
                        </span>
                        {report.readAt ? (
                          <span className="text-[9px] text-muted-foreground">✓ Lido</span>
                        ) : (
                          <span className="text-[9px] font-extrabold bg-destructive text-white px-1.5 py-0.5 rounded-full">NÃO LIDO</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground bg-muted/30 border border-border/30 rounded-lg p-2.5">
                        {report.reason}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Por: <b>{report.sentBy}</b></span>
                        <span>•</span>
                        <span>{new Date(report.sentAt).toLocaleDateString('pt-BR')} às {new Date(report.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {report.deliveryDate && <><span>•</span><span>Entrega: <b>{formatDate(report.deliveryDate)}</b></span></>}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/producao/pedidos?view=${report.orderId}`)}
                      className="text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver Pedido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Modal: Histórico de Garantia */}
      {viewingWarrantyHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-section w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-4 border-primary/20 bg-background">
            <div className="card-section-header border-b border-border/40 p-5 shrink-0 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <HistoryIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Histórico da Garantia</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{viewingWarrantyHistory.orderNumber} • {viewingWarrantyHistory.clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopyWarrantyTracking(viewingWarrantyHistory.id)}
                  className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 text-[10px] font-black uppercase"
                >
                  <Share2 className="w-3.5 h-3.5" /> Copiar Rastreio
                </button>
                <button onClick={() => setViewingWarrantyHistory(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!viewingWarrantyHistory.history || viewingWarrantyHistory.history.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground italic text-sm">
                  Nenhum registro de histórico encontrado.
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-border before:to-transparent">
                  {viewingWarrantyHistory.history.map((h: any, i: number) => (
                    <div key={i} className="relative flex items-start gap-4 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-background z-10 ${h.status === viewingWarrantyHistory.status ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'
                        }`}>
                        <div className="w-2 h-2 rounded-full bg-current" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase tracking-tighter text-foreground">{h.status}</span>
                          <span className="text-[9px] font-bold text-muted-foreground">{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                            Alterado por: <span className="text-foreground">{h.user}</span>
                          </p>
                          {h.note && <p className="text-xs text-foreground italic leading-relaxed text-muted-foreground">"{h.note}"</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border/40 bg-muted/30 shrink-0">
              <button onClick={() => setViewingWarrantyHistory(null)} className="btn-modern bg-primary text-primary-foreground w-full justify-center h-12 font-bold shadow-lg shadow-primary/10">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GestorDashboard;
