import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { CheckCircle, XCircle, Eye, Send, ArrowLeft, Inbox, History, Star, Truck, Wrench, Calendar } from 'lucide-react';
import type { Order } from '@/types/erp';

const AprovacoesPage: React.FC = () => {
  const { orders, clients, updateOrderStatus } = useERP();
  const { user } = useAuth();
  const userName = user?.name || 'Financeiro';
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const pendentes = orders.filter(o => o.status === 'aguardando_financeiro');

  const aprovar = (orderId: string) => {
    // Fluxo: Financeiro aprova e envia direto para Produção (sem Gestor)
    updateOrderStatus(orderId, 'aguardando_producao', { paymentStatus: 'pago' }, userName, 'Pagamento aprovado - Enviando para produção');
    setSelectedOrder(null);
  };

  const rejeitar = (orderId: string) => {
    updateOrderStatus(orderId, 'rejeitado_financeiro', { rejectionReason: rejectReason }, userName, `Rejeitado: ${rejectReason}`);
    setSelectedOrder(null); setShowReject(false); setRejectReason('');
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Aprovações de Vendas</h1>
        <p className="page-subtitle">{pendentes.length} vendas aguardando aprovação</p>
      </div>

      {selectedOrder ? (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number} - {selectedOrder.clientName}</h2>
            <button onClick={() => { setSelectedOrder(null); setShowReject(false); }} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>
          {/* Info do pedido — consignado + tipo + entrega */}
          {(() => {
            const client = clients.find(c => c.id === selectedOrder.clientId);
            return (
              <div className="space-y-3">
                {/* Aviso Consignado */}
                {client?.consignado && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-400">Cliente Consignado</p>
                      <p className="text-[11px] text-amber-400/70">Opera em regime de consignação — verifique as condições especiais.</p>
                    </div>
                  </div>
                )}
                {/* Info rápida */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block mb-1">Vendedor</span>
                    <span className="text-sm font-semibold text-foreground">{selectedOrder.sellerName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block mb-1">Tipo</span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      {selectedOrder.orderType === 'instalacao'
                        ? <><Wrench className="w-3.5 h-3.5 text-producao" /> Instalação</>
                        : <><Truck className="w-3.5 h-3.5 text-primary" /> Entrega</>
                      }
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block mb-1">Data Entrega</span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(selectedOrder.deliveryDate)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block mb-1">Pagamento</span>
                    <span className={`text-sm font-semibold ${selectedOrder.paymentStatus === 'pago' ? 'text-success' : 'text-warning'}`}>
                      {selectedOrder.paymentStatus === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Pipeline */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso do Pedido</p>
            <OrderPipeline order={selectedOrder} />
          </div>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="modern-table">
              <thead><tr><th>Produto</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">{item.product} (x{item.quantity})</td>
                    <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-xl font-extrabold text-foreground">Total: {formatCurrency(selectedOrder.total)}</div>
          {/* Comprovante do vendedor */}
          {selectedOrder.receiptUrl && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <ComprovanteUpload
                value={selectedOrder.receiptUrl}
                onChange={() => { }}
                label="Comprovante Enviado pelo Vendedor"
              />
            </div>
          )}
          {!selectedOrder.receiptUrl && (
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-medium">
              ⚠ Nenhum comprovante foi anexado pelo vendedor.
            </div>
          )}
          {/* Histórico */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Histórico
            </p>
            <OrderHistory order={selectedOrder} />
          </div>
          {showReject ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motivo da rejeição..."
                className="input-modern min-h-[80px] resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => rejeitar(selectedOrder.id)} className="btn-modern bg-destructive text-destructive-foreground text-xs">Confirmar Rejeição</button>
                <button onClick={() => setShowReject(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => aprovar(selectedOrder.id)} className="btn-modern bg-gradient-to-r from-success to-success/80 text-success-foreground"><CheckCircle className="w-4 h-4" />Aprovar</button>
              <button onClick={() => setShowReject(true)} className="btn-modern bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20"><XCircle className="w-4 h-4" />Rejeitar</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {pendentes.length === 0 ? (
            <div className="card-section p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-success" />
              </div>
              <p className="text-foreground font-bold text-lg">Nenhuma venda pendente</p>
              <p className="text-sm text-muted-foreground mt-1">Todas as vendas foram processadas</p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {pendentes.map(order => (
                <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
                  <div>
                    <p className="font-bold text-foreground text-sm">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{order.items.length} item(s) • {formatCurrency(order.total)}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(order)} className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-4 py-2 hover:bg-primary/20">
                    <Eye className="w-3.5 h-3.5" /> Analisar
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

export default AprovacoesPage;
