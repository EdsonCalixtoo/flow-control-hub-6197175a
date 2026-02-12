import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';

const PagamentosPage: React.FC = () => {
  const { orders } = useERP();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Controle de Pagamentos</h1>
        <p className="page-subtitle">Pagamentos recebidos e pendentes</p>
      </div>

      <div className="card-section">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="hidden md:table-cell">Forma</th>
                <th className="text-right">Valor</th>
                <th>Status Pgto</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter(o => o.paymentMethod).map(order => (
                <tr key={order.id}>
                  <td className="font-semibold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td className="text-foreground hidden md:table-cell">{order.paymentMethod || '-'}</td>
                  <td className="text-right font-medium text-foreground">{formatCurrency(order.total)}</td>
                  <td>
                    <span className={`status-badge ${order.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
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
