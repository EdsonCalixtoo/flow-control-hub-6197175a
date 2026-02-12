import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { FileText, Plus, Send, Eye, ArrowLeft } from 'lucide-react';
import type { Order } from '@/types/erp';

const OrcamentosPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      {selectedOrder ? (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number}</h2>
            <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Cliente</span><span className="font-semibold text-foreground">{selectedOrder.clientName}</span></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Status</span><StatusBadge status={selectedOrder.status} /></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Data</span><span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</span></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Total</span><span className="font-extrabold text-foreground text-lg">{formatCurrency(selectedOrder.total)}</span></div>
          </div>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right hidden sm:table-cell">Unit.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">{item.product}</td>
                    <td className="text-right text-foreground">{item.quantity}</td>
                    <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="text-sm text-muted-foreground">
              Subtotal: {formatCurrency(selectedOrder.subtotal)} • Impostos: {formatCurrency(selectedOrder.taxes)}
            </div>
            <div className="text-xl font-extrabold text-foreground">{formatCurrency(selectedOrder.total)}</div>
          </div>
          {(selectedOrder.status === 'rascunho' || selectedOrder.status === 'enviado' || selectedOrder.status === 'aprovado_cliente') && (
            <button
              onClick={() => { enviarFinanceiro(selectedOrder.id); setSelectedOrder(null); }}
              className="btn-modern bg-gradient-to-r from-vendedor to-vendedor/80 text-primary-foreground"
            >
              <Send className="w-4 h-4" /> Enviar para Financeiro
            </button>
          )}
        </div>
      ) : (
        <div className="card-section">
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th className="hidden md:table-cell">Valor</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="font-semibold text-foreground">{order.number}</td>
                    <td className="text-foreground">{order.clientName}</td>
                    <td className="text-foreground font-medium hidden md:table-cell">{formatCurrency(order.total)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="text-right">
                      <button onClick={() => setSelectedOrder(order)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors">
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
