import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { CheckCircle, XCircle, Eye, Send, ArrowLeft, Inbox, History } from 'lucide-react';
import type { Order } from '@/types/erp';

const ConferenciaPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const pendentes = orders.filter(o => o.status === 'aguardando_gestor');
  const aprovados = orders.filter(o => o.status === 'aprovado_gestor');

  const aprovar = (orderId: string) => {
    updateOrderStatus(orderId, 'aprovado_gestor', undefined, 'Ricardo Souza', 'Pedido conferido e aprovado');
    setSelectedOrder(null);
  };

  const rejeitar = (orderId: string) => {
    updateOrderStatus(orderId, 'rejeitado_gestor', { rejectionReason: rejectReason }, 'Ricardo Souza', `Rejeitado: ${rejectReason}`);
    setSelectedOrder(null);
    setShowReject(false);
    setRejectReason('');
  };

  const enviarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_producao', undefined, 'Ricardo Souza', 'Enviado para produção');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Conferência de Pedidos</h1>
        <p className="page-subtitle">{pendentes.length} pedido(s) para conferir</p>
      </div>

      {selectedOrder ? (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number} - {selectedOrder.clientName}</h2>
            <button onClick={() => { setSelectedOrder(null); setShowReject(false); }} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>
          {/* Pipeline */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso do Pedido</p>
            <OrderPipeline order={selectedOrder} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Vendedor', value: selectedOrder.sellerName },
              { label: 'Pagamento', value: selectedOrder.paymentMethod || 'N/A' },
              { label: 'Status Pgto', value: selectedOrder.paymentStatus === 'pago' ? 'Pago' : 'Pendente', color: selectedOrder.paymentStatus === 'pago' ? 'text-success' : 'text-warning' },
              { label: 'Total', value: formatCurrency(selectedOrder.total), bold: true },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/30">
                <span className="text-xs text-muted-foreground block mb-1">{item.label}</span>
                <span className={`font-semibold text-foreground ${item.color || ''} ${item.bold ? 'text-lg font-extrabold' : 'text-sm'}`}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="modern-table">
              <thead><tr><th>Produto</th><th className="text-right">Qtd</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">{item.product}</td>
                    <td className="text-right text-foreground">{item.quantity}</td>
                    <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Histórico */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Histórico
            </p>
            <OrderHistory order={selectedOrder} />
          </div>
          {showReject ? (
            <div className="space-y-3">
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Observação..." className="input-modern min-h-[80px] resize-none" rows={3} />
              <div className="flex gap-2">
                <button onClick={() => rejeitar(selectedOrder.id)} className="btn-modern bg-destructive text-destructive-foreground text-xs">Confirmar</button>
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
              <div className="space-y-3 stagger-children">
                {pendentes.map(order => (
                  <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
                    <div>
                      <p className="font-bold text-foreground text-sm">{order.number} - {order.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(order.total)} • Vendedor: {order.sellerName}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(order)} className="btn-modern bg-gestor/10 text-gestor shadow-none text-xs px-4 py-2 hover:bg-gestor/20">
                      <Eye className="w-3.5 h-3.5" /> Conferir
                    </button>
                  </div>
                ))}
              </div>
              {aprovados.length > 0 && (
                <div className="space-y-3 mt-8">
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-producao" />
                    Aprovados - Enviar para Produção
                  </h2>
                  {aprovados.map(order => (
                    <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-bold text-foreground text-sm">{order.number} - {order.clientName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(order.total)}</p>
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
        </>
      )}
    </div>
  );
};

export default ConferenciaPage;
