import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { DollarSign, CreditCard, Receipt } from 'lucide-react';

const PagamentosPage: React.FC = () => {
  const { orders } = useERP();
  const paidOrders = orders.filter(o => o.paymentStatus === 'pago');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Controle de Pagamentos</h1>
        <p className="page-subtitle">Pagamentos recebidos e pendentes</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Pedido</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Cliente</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Forma</th>
                <th className="text-right px-5 py-3 text-muted-foreground font-medium">Valor</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status Pgto</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => o.paymentMethod).map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{order.number}</td>
                  <td className="px-5 py-3 text-foreground">{order.clientName}</td>
                  <td className="px-5 py-3 text-foreground hidden md:table-cell">{order.paymentMethod || '-'}</td>
                  <td className="px-5 py-3 text-right text-foreground">{formatCurrency(order.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`status-badge ${order.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {order.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PagamentosPage;
