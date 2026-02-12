import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { CheckCircle, XCircle, Eye, Send, ArrowLeft, Inbox } from 'lucide-react';
import type { Order } from '@/types/erp';

const AprovacoesPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const pendentes = orders.filter(o => o.status === 'aguardando_financeiro');

  const aprovar = (orderId: string) => {
    updateOrderStatus(orderId, 'aprovado_financeiro', { paymentStatus: 'pago' });
    setSelectedOrder(null);
  };

  const rejeitar = (orderId: string) => {
    updateOrderStatus(orderId, 'rejeitado_financeiro', { rejectionReason: rejectReason });
    setSelectedOrder(null);
    setShowReject(false);
    setRejectReason('');
  };

  const enviarGestor = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_gestor');
  };

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

          {orders.filter(o => o.status === 'aprovado_financeiro').length > 0 && (
            <div className="space-y-3 mt-8">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-financeiro" />
                Aprovados - Enviar para Gestor
              </h2>
              {orders.filter(o => o.status === 'aprovado_financeiro').map(order => (
                <div key={order.id} className="card-section p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-foreground text-sm">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(order.total)} • <StatusBadge status={order.status} /></p>
                  </div>
                  <button onClick={() => enviarGestor(order.id)} className="btn-modern bg-financeiro/10 text-financeiro shadow-none text-xs px-4 py-2 hover:bg-financeiro/20">
                    <Send className="w-3.5 h-3.5" /> Enviar para Gestor
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
