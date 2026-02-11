import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { CheckCircle, XCircle, Eye, Send } from 'lucide-react';
import type { Order } from '@/types/erp';

const ConferenciaPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const pendentes = orders.filter(o => o.status === 'aguardando_gestor');
  const aprovados = orders.filter(o => o.status === 'aprovado_gestor');

  const aprovar = (orderId: string) => {
    updateOrderStatus(orderId, 'aprovado_gestor');
    setSelectedOrder(null);
  };

  const rejeitar = (orderId: string) => {
    updateOrderStatus(orderId, 'rejeitado_gestor', { rejectionReason: rejectReason });
    setSelectedOrder(null);
    setShowReject(false);
    setRejectReason('');
  };

  const enviarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_producao');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Conferência de Pedidos</h1>
        <p className="page-subtitle">{pendentes.length} pedido(s) para conferir</p>
      </div>

      {selectedOrder ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-lg">{selectedOrder.number} - {selectedOrder.clientName}</h2>
            <button onClick={() => { setSelectedOrder(null); setShowReject(false); }} className="text-sm text-muted-foreground hover:text-foreground">Voltar</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Vendedor:</span> <span className="text-foreground">{selectedOrder.sellerName}</span></div>
            <div><span className="text-muted-foreground">Pagamento:</span> <span className="text-foreground">{selectedOrder.paymentMethod || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Status Pgto:</span> <span className={`${selectedOrder.paymentStatus === 'pago' ? 'text-success' : 'text-warning'} font-medium`}>{selectedOrder.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}</span></div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-foreground">{formatCurrency(selectedOrder.total)}</span></div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50"><th className="text-left px-4 py-2 text-muted-foreground font-medium">Produto</th><th className="text-right px-4 py-2 text-muted-foreground font-medium">Qtd</th><th className="text-right px-4 py-2 text-muted-foreground font-medium">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2 text-foreground">{item.product}</td>
                    <td className="px-4 py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showReject ? (
            <div className="space-y-3">
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Observação..." className="w-full p-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" rows={3} />
              <div className="flex gap-2">
                <button onClick={() => rejeitar(selectedOrder.id)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium">Confirmar</button>
                <button onClick={() => setShowReject(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => aprovar(selectedOrder.id)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-success text-success-foreground rounded-lg text-sm font-medium"><CheckCircle className="w-4 h-4" />Aprovar</button>
              <button onClick={() => setShowReject(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium"><XCircle className="w-4 h-4" />Rejeitar</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {pendentes.length === 0 && aprovados.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-foreground font-medium">Nenhum pedido para conferir</p>
            </div>
          ) : (
            <>
              {pendentes.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(order.total)} • Vendedor: {order.sellerName}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gestor/10 text-gestor rounded-lg text-xs font-medium hover:bg-gestor/20">
                    <Eye className="w-3.5 h-3.5" /> Conferir
                  </button>
                </div>
              ))}
              {aprovados.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-foreground">Aprovados - Enviar para Produção</h2>
                  {aprovados.map(order => (
                    <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{order.number} - {order.clientName}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(order.total)}</p>
                      </div>
                      <button onClick={() => enviarProducao(order.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-producao/10 text-producao rounded-lg text-xs font-medium hover:bg-producao/20">
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
