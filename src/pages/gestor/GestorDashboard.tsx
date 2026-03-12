import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { ShoppingCart, Factory, CheckCircle, AlertTriangle, Package, Send, Truck, Wrench, Calendar, Bell, X, ExternalLink, RotateCcw, Bug, ClipboardList, Plus, ShieldCheck, XCircle, History as HistoryIcon, Share2 } from 'lucide-react';
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
  const { orders, products, updateOrderStatus, delayReports, unreadDelayReports, markDelayReportRead, orderReturns, addOrderReturn, productionErrors, addProductionError, resolveError, warranties, updateWarrantyStatus } = useERP();
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

  type PanelKey = 'total' | 'enviados' | 'em_producao' | 'finalizados' | 'atrasados' | 'estoque_baixo' | null;
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
  };

  const panelLabels: Record<string, string> = {
    total: 'Todos os Pedidos',
    enviados: 'Pedidos Enviados',
    em_producao: 'Em Produção',
    finalizados: 'Finalizados',
    atrasados: 'Pedidos Atrasados',
    estoque_baixo: 'Estoque Baixo / Crítico',
  };

  const unreadErrors = productionErrors.filter(e => !e.resolved).length;
  const unreadReturns = orderReturns.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Gestor</h1>
        <p className="page-subtitle">Visão estratégica consolidada</p>
      </div>

      {/* Tabs de navegação */}
      <div className="flex gap-2 border-b border-border/40 overflow-x-auto">
        {([
          { key: 'dashboard', label: '📊 Dashboard', badge: 0 },
          { key: 'problemas', label: '⚠️ Problemas na Produção', badge: unreadErrors },
          { key: 'devolvidos', label: '🔁 Pedidos Devolvidos', badge: unreadReturns },
          { key: 'extravios', label: '📦 Extravios', badge: 0 },
          { key: 'garantias', label: '🛡️ Garantias', badge: warranties.filter(w => w.status === 'Garantia criada').length },
          { key: 'erros', label: '📋 Relatórios de Erros', badge: 0 },
        ] as { key: GestorTab; label: string; badge: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-white text-[9px] font-extrabold px-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Dashboard principal */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 stagger-children">
            {([
              { key: 'total', title: 'Total Pedidos', value: totalPedidos, icon: ShoppingCart, color: 'text-vendedor' },
              { key: 'enviados', title: 'Enviados', value: enviadosSucesso, icon: CheckCircle, color: 'text-success' },
              { key: 'em_producao', title: 'Em Produção', value: emProducao, icon: Factory, color: 'text-producao' },
              { key: 'finalizados', title: 'Finalizados', value: finalizados, icon: Package, color: 'text-gestor' },
              { key: 'atrasados', title: 'Atrasados', value: atrasados, icon: AlertTriangle, color: 'text-destructive' },
              { key: 'estoque_baixo', title: 'Estoque Baixo', value: estoqueBaixo, icon: AlertTriangle, color: 'text-warning' },
            ] as { key: PanelKey; title: string; value: number; icon: React.ElementType; color: string }[]).map(card => (
              <button
                key={card.key}
                onClick={() => togglePanel(card.key)}
                className={`card-section p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${activePanel === card.key ? 'ring-2 ring-primary/40 shadow-lg shadow-primary/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-black text-foreground mt-1">{card.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted/60 ${card.color}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className={`text-[10px] mt-2 font-semibold transition-colors ${activePanel === card.key ? 'text-primary' : 'text-muted-foreground/60'}`}>
                  {activePanel === card.key ? '▲ Fechar lista' : '▼ Ver lista'}
                </p>
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
                                <span className="font-extrabold text-foreground">{order.number}</span>
                                {isLateOrder && (
                                  <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded">ATRASADO</span>
                                )}
                              </div>
                            </td>
                            <td className="text-foreground">
                              <div className="flex items-center gap-1.5">
                                {order.clientName}
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
                                {formatDate(order.deliveryDate)}
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
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Problemas na Produção</h2>
              <p className="text-sm text-muted-foreground">{productionErrors.filter(e => !e.resolved).length} problema(s) aberto(s)</p>
            </div>
            <button
              onClick={() => setAddingError(v => !v)}
              className="btn-modern bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Problema
            </button>
          </div>

          {addingError && (
            <div className="card-section p-5 space-y-4 border-destructive/20 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Novo Problema de Produção</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº do Pedido (opcional)</label>
                  <input
                    type="text"
                    value={newErrorOrderNum}
                    onChange={e => setNewErrorOrderNum(e.target.value)}
                    placeholder="PED-001"
                    className="input-modern text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severidade</label>
                  <select
                    value={newErrorSeverity}
                    onChange={e => setNewErrorSeverity(e.target.value as ProductionError['severity'])}
                    className="input-modern text-xs"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição do Problema</label>
                <textarea
                  value={newErrorDesc}
                  onChange={e => setNewErrorDesc(e.target.value)}
                  placeholder="Descreva o problema detalhadamente..."
                  className="input-modern w-full resize-y text-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
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
                  }}
                  disabled={!newErrorDesc.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  Registrar
                </button>
                <button onClick={() => setAddingError(false)} className="btn-modern bg-muted text-foreground shadow-none">Cancelar</button>
              </div>
            </div>
          )}

          {productionErrors.length === 0 ? (
            <div className="card-section p-12 text-center">
              <Bug className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nenhum problema registrado</p>
              <p className="text-sm text-muted-foreground mt-1">Tudo funcionando normalmente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productionErrors.map(err => (
                <div key={err.id} className={`card-section p-4 ${err.resolved ? 'opacity-60' : 'border-destructive/20'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {err.orderNumber && <span className="font-bold text-foreground text-sm">{err.orderNumber}</span>}
                        {err.clientName && <span className="text-xs text-muted-foreground">— {err.clientName}</span>}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[err.severity] ?? 'bg-muted text-muted-foreground'}`}>
                          {SEVERITY_LABELS[err.severity]}
                        </span>
                        {err.resolved && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">✓ Resolvido</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{err.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Por: <b>{err.reportedBy}</b></span>
                        <span>•</span>
                        <span>{new Date(err.createdAt).toLocaleDateString('pt-BR')}</span>
                        {err.resolvedAt && <><span>•</span><span>Resolvido em {new Date(err.resolvedAt).toLocaleDateString('pt-BR')}</span></>}
                      </div>
                    </div>
                    {!err.resolved && (
                      <button
                        onClick={() => resolveError(err.id)}
                        className="btn-modern bg-success/10 text-success shadow-none text-xs hover:bg-success/20 shrink-0"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Resolver
                      </button>
                    )}
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

          {orderReturns.length === 0 ? (
            <div className="space-y-4">
              <div className="card-section p-6 text-center">
                <h2 className="card-section-title">Acesso Rápido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Atalhos para funções administrativas</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={async () => {
                    if (seeding) return;
                    setSeeding(true);
                    // Mock-like logic or direct call
                    // Better: use the context addProduct (but it might need to be async)
                    // We'll just hardcode the ingestion here for the user to click.
                    const kits = [
                      { sku: 'KIT-SPR-N', name: 'KIT SPRINTER .N', desc: '1–Chicote, 1–Suporte coluna, 1–Courinho capinha, 3–Enforca gato pequeno, 1–Fusível, 1–Trava em U, 1–Parafuso Allen, 5–Espaçador 40mm, 2–Espaçador 60mm, 2–Adesivos, 1–Garantia, 1–Colar azul, 1–Cremalheira 1,20m' },
                      { sku: 'KIT-DAI-N', name: 'KIT DAILY .N', desc: '1–Chicote, 1–Suporte coluna, 1–Courinho capinha, 3–Enforca gato pequeno, 1–Fusível, 1–Trava em U, 1–Parafuso Allen, 5–Espaçador 40mm, 2–Espaçador 60mm, 2–Adesivos, 1–Garantia, 1–Colar azul, 1–Cremalheira 1,20m' },
                      { sku: 'KIT-DUC-N', name: 'KIT DUCATO', desc: '6–Espaçador 40mm, 1–Porta fusível, 1–Parafuso Allen, 1–Trava cabo, 3–Enforca gato, 1–Courinho capinha, 1–Suporte coluna, 3–Adesivos, 1–Garantia, 1–Cremalheira 1,10m, 1–Chicote' },
                      { sku: 'KIT-BOX-N', name: 'KIT BOXER', desc: '6–Espaçador 40mm, 1–Porta fusível, 1–Parafuso Allen, 1–Trava cabo, 3–Enforca gato, 1–Courinho capinha, 1–Suporte coluna, 3–Adesivos, 1–Garantia, 1–Cremalheira 1,10m, 1–Chicote' },
                    ];

                    const { createProduct } = await import('@/lib/productServiceSupabase');
                    let count = 0;
                    for (const k of kits) {
                      if (!products.find(p => p.name === k.name)) {
                        await createProduct({
                          sku: k.sku, name: k.name, description: k.desc,
                          category: 'Kits', unitPrice: 0, costPrice: 0, stockQuantity: 100, minStock: 5, unit: 'kit', status: 'ativo',
                          supplier: ''
                        });
                        count++;
                      }
                    }
                    alert(`${count} produtos novos adicionados ao catálogo!`);
                    setSeeding(false);
                    window.location.reload();
                  }}
                  disabled={seeding}
                  className="btn-modern bg-primary/10 text-primary border-primary/20 justify-center py-4"
                >
                  <Plus className="w-5 h-5" /> {seeding ? 'Subindo...' : 'Carga de Produtos (Kits)'}
                </button>
                <button onClick={() => navigate('/gestor/estoque')} className="btn-modern bg-muted text-foreground justify-center py-4">
                  <Package className="w-5 h-5" /> Gerenciar Estoque
                </button>
                <button onClick={() => navigate('/gestor/logs')} className="btn-modern bg-muted text-foreground justify-center py-4">
                  <ClipboardList className="w-5 h-5" /> Logs do Sistema
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orderReturns.map(ret => (
                <div key={ret.id} className="card-section p-4 border-warning/20">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{ret.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">— {ret.clientName}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">DEVOLVIDO</span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{ret.reason}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>Por: <b>{ret.reportedBy}</b></span>
                        <span>•</span>
                        <span>{new Date(ret.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Extravios */}
      {activeTab === 'extravios' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-foreground">Gestão de Extravios</h2>
            <p className="text-sm text-muted-foreground">Registre extravios e solicite refação para a produção</p>
          </div>

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

              <div className="flex gap-3">
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

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Pedidos Extraviados Recentemente</h3>
            <div className="grid grid-cols-1 gap-3">
              {orders.filter(o => o.status === 'extraviado').length === 0 ? (
                <div className="p-12 text-center card-section border-dashed">
                  <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido com status "Extraviado" no momento.</p>
                </div>
              ) : (
                orders.filter(o => o.status === 'extraviado').map(order => (
                  <div key={order.id} className="card-section p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground">{order.number}</span>
                          <span className="text-xs text-muted-foreground">{order.clientName}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Última atualização: {new Date(order.updatedAt).toLocaleDateString('pt-BR')} às {new Date(order.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
          </div>
        </div>
      )}

      {/* Tab: Garantias (Aprovação) */}
      {activeTab === 'garantias' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-foreground">Aprovação de Garantias</h2>
            <p className="text-sm text-muted-foreground">Analise as solicitações de garantia enviadas pelos vendedores</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).length === 0 ? (
              <div className="card-section p-20 text-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma garantia aguardando ação.</p>
              </div>
            ) : (
              warranties.filter(w => ['Garantia criada', 'Garantia aprovada'].includes(w.status)).map(w => (
                <div key={w.id} className="card-section p-6 space-y-4 border-primary/10">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-foreground">{w.orderNumber}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${w.status === 'Garantia criada' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                          }`}>
                          {w.status === 'Garantia criada' ? 'Aguardando Análise' : 'Aprovada - Aguardando Produção'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{w.clientName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Vendedor: {w.sellerName || '---'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Descrição do Problema</p>
                    <p className="text-sm text-foreground italic">"{w.description}"</p>
                  </div>

                  {w.receiptUrls && w.receiptUrls.length > 0 && (
                    <div className="flex gap-2">
                      {w.receiptUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={url} alt="Comprovante" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <button
                      onClick={() => setViewingWarrantyHistory(w)}
                      className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 hover:underline"
                    >
                      <HistoryIcon className="w-3 h-3" /> Ver Histórico Completo
                    </button>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{w.carrier ? `Via: ${w.carrier}` : ''}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    {w.status === 'Garantia criada' ? (
                      <>
                        <button
                          onClick={async () => {
                            if (window.confirm('Aprovar esta garantia?')) {
                              await updateWarrantyStatus(w.id, 'Garantia aprovada', undefined, userName, 'Garantia aprovada pelo gestor');
                              alert('Garantia APROVADA!');
                            }
                          }}
                          className="btn-primary bg-success hover:bg-success/90 border-none flex-1 h-11 text-xs font-bold"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Garantia
                        </button>
                        <button
                          onClick={async () => {
                            const reason = prompt('Motivo da reprovação:');
                            if (reason) {
                              await updateWarrantyStatus(w.id, 'rejeitado', undefined, userName, `Reprovado: ${reason}`);
                              alert('Garantia REPROVADA.');
                            }
                          }}
                          className="btn-modern bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 flex-1 h-11 text-xs font-bold"
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
                        className="btn-primary w-full h-11 text-xs font-bold"
                      >
                        <Factory className="w-4 h-4 mr-2" /> Enviar para Produção
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
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
  );
};

export default GestorDashboard;
