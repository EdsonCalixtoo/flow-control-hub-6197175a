import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { CheckCircle, XCircle, Eye, Send } from 'lucide-react';
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
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-lg">{selectedOrder.number} - {selectedOrder.clientName}</h2>
            <button onClick={() => { setSelectedOrder(null); setShowReject(false); }} className="text-sm text-muted-foreground hover:text-foreground">Voltar</button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50"><th className="text-left px-4 py-2 text-muted-foreground font-medium">Produto</th><th className="text-right px-4 py-2 text-muted-foreground font-medium">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2 text-foreground">{item.product} (x{item.quantity})</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-lg font-bold text-foreground">Total: {formatCurrency(selectedOrder.total)}</div>
          {showReject ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motivo da rejeição..."
                className="w-full p-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => rejeitar(selectedOrder.id)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium">Confirmar Rejeição</button>
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
          {pendentes.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-foreground font-medium">Nenhuma venda pendente</p>
              <p className="text-sm text-muted-foreground">Todas as vendas foram processadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendentes.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} item(s) • {formatCurrency(order.total)}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                    <Eye className="w-3.5 h-3.5" /> Analisar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Approved orders ready to send to gestor */}
          {orders.filter(o => o.status === 'aprovado_financeiro').length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-foreground">Aprovados - Enviar para Gestor</h2>
              {orders.filter(o => o.status === 'aprovado_financeiro').map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{order.number} - {order.clientName}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(order.total)} • <StatusBadge status={order.status} /></p>
                  </div>
                  <button onClick={() => enviarGestor(order.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-financeiro/10 text-financeiro rounded-lg text-xs font-medium hover:bg-financeiro/20">
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
