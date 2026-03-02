import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { CheckCircle, XCircle, Eye, Send, ArrowLeft, Inbox, History, Truck, Wrench, Calendar } from 'lucide-react';
import type { Order } from '@/types/erp';
import { useSearchParams } from 'react-router-dom';

const ConferenciaPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userName = user?.name || 'Gestor';

  // Se vier ?view=orderId (ex: de um alerta de atraso), abre direto o pedido
  const viewParam = searchParams.get('view');
  const initialOrder = viewParam ? (orders.find(o => o.id === viewParam) ?? null) : null;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(initialOrder);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const pendentes = orders.filter(o => o.status === 'aguardando_gestor');
  const aprovados = orders.filter(o => o.status === 'aprovado_gestor');

  const aprovar = (orderId: string) => {
    updateOrderStatus(orderId, 'aprovado_gestor', undefined, userName, 'Pedido conferido e aprovado');
    setSelectedOrder(null);
  };

  const rejeitar = (orderId: string) => {
    updateOrderStatus(orderId, 'rejeitado_gestor', { rejectionReason: rejectReason }, userName, `Rejeitado: ${rejectReason}`);
    setSelectedOrder(null); setShowReject(false); setRejectReason('');
  };

  const enviarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_producao', undefined, userName, 'Enviado para produção');
  };

  /* ─── helpers ─────────────────────────────────────── */
  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const isLate = (order: Order) => {
    if (!order.deliveryDate) return false;
    return new Date(order.deliveryDate) < new Date();
  };

  /* ─── Detalhe do pedido ───────────────────────────── */
  if (selectedOrder) {
    return (
      <div className="card-section p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number} — {selectedOrder.clientName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Vendedor: {selectedOrder.sellerName}</p>
          </div>
          <button onClick={() => { setSelectedOrder(null); setShowReject(false); }} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
        </div>

        {/* Pipeline */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso</p>
          <OrderPipeline order={selectedOrder} />
        </div>

        {/* Informações — SEM preços */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-muted/30">
            <span className="text-[10px] text-muted-foreground block mb-1">Tipo</span>
            <span className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
              {selectedOrder.orderType === 'instalacao'
                ? <><Wrench className="w-3.5 h-3.5 text-producao" /> Instalação</>
                : <><Truck className="w-3.5 h-3.5 text-primary" /> Entrega</>
              }
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <span className="text-[10px] text-muted-foreground block mb-1">Data de Entrega</span>
            <span className={`flex items-center gap-1.5 font-semibold text-sm ${isLate(selectedOrder) ? 'text-destructive' : 'text-foreground'}`}>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(selectedOrder.deliveryDate)}
              {isLate(selectedOrder) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">ATRASADO</span>}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <span className="text-[10px] text-muted-foreground block mb-1">Status</span>
            <StatusBadge status={selectedOrder.status} />
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <span className="text-[10px] text-muted-foreground block mb-1">Criado em</span>
            <span className="text-sm text-foreground">{formatDate(selectedOrder.createdAt)}</span>
          </div>
        </div>

        {/* Produtos — SEM coluna de preço */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="modern-table">
            <thead><tr>
              <th>Produto</th>
              <th className="text-center">Quantidade</th>
              <th className="text-right">Status</th>
            </tr></thead>
            <tbody>
              {selectedOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="text-foreground font-semibold">
                    {item.product}
                    {item.product.toUpperCase().includes('KIT') && item.sensorType && (
                      <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                        {item.sensorType === 'com_sensor' ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                      </span>
                    )}
                  </td>
                  <td className="text-center font-bold text-foreground text-lg">{item.quantity}</td>
                  <td className="text-right">
                    <span className="status-badge bg-success/10 text-success text-[10px]">• Confirmado</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Observações */}
        {selectedOrder.notes && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
            <p className="text-sm text-foreground">{selectedOrder.notes}</p>
          </div>
        )}

        {/* Histórico */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <History className="w-3 h-3" /> Histórico
          </p>
          <OrderHistory order={selectedOrder} />
        </div>

        {/* Ações */}
        {showReject ? (
          <div className="space-y-3">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Observação..." className="input-modern min-h-[80px] resize-none" rows={3} />
            <div className="flex gap-2">
              <button onClick={() => rejeitar(selectedOrder.id)} className="btn-modern bg-destructive text-destructive-foreground text-xs">Confirmar</button>
              <button onClick={() => setShowReject(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => aprovar(selectedOrder.id)} className="btn-modern bg-gradient-to-r from-success to-success/80 text-success-foreground">
              <CheckCircle className="w-4 h-4" /> Aprovar
            </button>
            <button onClick={() => setShowReject(true)} className="btn-modern bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20">
              <XCircle className="w-4 h-4" /> Rejeitar
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ─── Lista ───────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Conferência de Pedidos</h1>
        <p className="page-subtitle">{pendentes.length} pedido(s) para conferir</p>
      </div>

      {pendentes.length === 0 && aprovados.length === 0 ? (
        <div className="card-section p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-success" />
          </div>
          <p className="text-foreground font-bold text-lg">Nenhum pedido para conferir</p>
          <p className="text-sm text-muted-foreground mt-1">Todos os pedidos foram processados</p>
        </div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <div className="space-y-3 stagger-children">
              {pendentes.map(order => (
                <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground text-sm">{order.number} — {order.clientName}</p>
                      {order.orderType === 'instalacao'
                        ? <span className="status-badge bg-producao/10 text-producao text-[9px]"><Wrench className="w-2.5 h-2.5" /> Instalação</span>
                        : <span className="status-badge bg-primary/10 text-primary text-[9px]"><Truck className="w-2.5 h-2.5" /> Entrega</span>
                      }
                      {isLate(order) && <span className="status-badge bg-destructive/10 text-destructive text-[9px]">⚠ Atrasado</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vendedor: {order.sellerName}
                      {order.deliveryDate && ` • Entrega: ${formatDate(order.deliveryDate)}`}
                    </p>
                  </div>
                  <button onClick={() => setSelectedOrder(order)} className="btn-modern bg-gestor/10 text-gestor shadow-none text-xs px-4 py-2 hover:bg-gestor/20">
                    <Eye className="w-3.5 h-3.5" /> Conferir
                  </button>
                </div>
              ))}
            </div>
          )}

          {aprovados.length > 0 && (
            <div className="space-y-3 mt-8">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-producao" /> Aprovados — Enviar para Produção
              </h2>
              {aprovados.map(order => (
                <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground text-sm">{order.number} — {order.clientName}</p>
                      {order.orderType === 'instalacao'
                        ? <span className="status-badge bg-producao/10 text-producao text-[9px]"><Wrench className="w-2.5 h-2.5" /> Instalação</span>
                        : <span className="status-badge bg-primary/10 text-primary text-[9px]"><Truck className="w-2.5 h-2.5" /> Entrega</span>
                      }
                    </div>
                    {order.deliveryDate && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Entrega: {formatDate(order.deliveryDate)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => enviarProducao(order.id)} className="btn-modern bg-producao/10 text-producao shadow-none text-xs px-4 py-2 hover:bg-producao/20">
                    <Send className="w-3.5 h-3.5" /> Enviar para Produção
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConferenciaPage;
