import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, Navigate } from 'react-router-dom';
import { CheckCircle, QrCode } from 'lucide-react';

const QRCodePage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders, updateOrderStatus } = useERP();

  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Pedido não encontrado</h1>
          <p className="text-muted-foreground text-sm mt-1">O QR Code escaneado não corresponde a nenhum pedido.</p>
        </div>
      </div>
    );
  }

  const handleLiberar = () => {
    updateOrderStatus(order.id, 'produto_liberado', {
      releasedAt: new Date().toISOString(),
      releasedBy: 'QR Code Scan',
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{order.number}</h1>
          <p className="text-muted-foreground text-sm mt-1">Pedido de {order.clientName}</p>
        </div>
        <div className="text-left space-y-2 text-sm">
          <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground">Produto</span>
            <span className="text-foreground font-medium">{order.items[0]?.product}</span>
          </div>
          <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground">Quantidade</span>
            <span className="text-foreground font-medium">{order.items[0]?.quantity}</span>
          </div>
          <div className="flex justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium ${order.status === 'produto_liberado' ? 'text-success' : 'text-producao'}`}>
              {order.status === 'produto_liberado' ? 'Produto Liberado ✓' : 'Produção Finalizada'}
            </span>
          </div>
        </div>
        {order.status === 'producao_finalizada' && (
          <button onClick={handleLiberar} className="w-full py-3 bg-success text-success-foreground rounded-xl font-semibold text-sm hover:bg-success/90 transition-colors">
            Liberar Produto
          </button>
        )}
        {order.status === 'produto_liberado' && (
          <div className="py-3 bg-success/10 text-success rounded-xl font-semibold text-sm">
            ✓ Produto Liberado em {order.releasedAt ? new Date(order.releasedAt).toLocaleString('pt-BR') : 'N/A'}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodePage;
