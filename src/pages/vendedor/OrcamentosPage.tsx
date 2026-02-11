import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { FileText, Plus, Send, Eye } from 'lucide-react';
import type { Order } from '@/types/erp';

const OrcamentosPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const myOrders = orders;

  const enviarFinanceiro = (orderId: string) => {
    updateOrderStatus(orderId, 'aguardando_financeiro');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Orçamentos</h1>
          <p className="page-subtitle">Gerencie seus orçamentos e vendas</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      {selectedOrder ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-lg">{selectedOrder.number}</h2>
            <button onClick={() => setSelectedOrder(null)} className="text-sm text-muted-foreground hover:text-foreground">Voltar</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium text-foreground">{selectedOrder.clientName}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedOrder.status} /></div>
            <div><span className="text-muted-foreground">Data:</span> <span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</span></div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-foreground">{formatCurrency(selectedOrder.total)}</span></div>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Produto</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Qtd</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium hidden sm:table-cell">Unit.</th>
                  <th className="text-right px-4 py-2 text-muted-foreground font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2 text-foreground">{item.product}</td>
                    <td className="px-4 py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Subtotal: {formatCurrency(selectedOrder.subtotal)} • Impostos: {formatCurrency(selectedOrder.taxes)}
            </div>
            <div className="text-lg font-bold text-foreground">{formatCurrency(selectedOrder.total)}</div>
          </div>
          {(selectedOrder.status === 'rascunho' || selectedOrder.status === 'enviado' || selectedOrder.status === 'aprovado_cliente') && (
            <button
              onClick={() => { enviarFinanceiro(selectedOrder.id); setSelectedOrder(null); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-vendedor text-primary-foreground rounded-lg text-sm font-medium hover:bg-vendedor/90 transition-colors"
            >
              <Send className="w-4 h-4" /> Enviar para Financeiro
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Pedido</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Valor</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{order.number}</td>
                    <td className="px-5 py-3 text-foreground">{order.clientName}</td>
                    <td className="px-5 py-3 text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setSelectedOrder(order)} className="text-primary hover:text-primary/80">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentosPage;
