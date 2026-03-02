import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { ShoppingCart, Factory, CheckCircle, AlertTriangle, Package, Send, Truck, Wrench, Calendar, Bell, X, ExternalLink, RotateCcw, Bug, ClipboardList, Plus } from 'lucide-react';
import type { OrderStatus, ProductionError } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';
import { useNavigate, useSearchParams } from 'react-router-dom';

type GestorTab = 'dashboard' | 'problemas' | 'devolvidos' | 'erros';

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
  const { orders, products, updateOrderStatus, delayReports, unreadDelayReports, markDelayReportRead, orderReturns, addOrderReturn, productionErrors, addProductionError, resolveError } = useERP();
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
                            <td className="text-foreground">{order.clientName}</td>
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
            <div className="card-section p-12 text-center">
              <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground">Nenhum pedido devolvido</p>
              <p className="text-sm text-muted-foreground mt-1">Nenhuma devolução registrada</p>
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
    </div>
  );
};

export default GestorDashboard;
