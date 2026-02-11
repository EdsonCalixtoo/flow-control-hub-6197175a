import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Play, CheckCircle, Printer, QrCode, Package } from 'lucide-react';

const PedidosProducaoPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [guia, setGuia] = useState<string | null>(null);

  const relevantOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
  );

  const iniciarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'em_producao', { productionStartedAt: new Date().toISOString() });
  };

  const finalizarProducao = (orderId: string) => {
    const qrCode = `${window.location.origin}/qr/${orderId}`;
    updateOrderStatus(orderId, 'producao_finalizada', {
      productionFinishedAt: new Date().toISOString(),
      qrCode,
    });
    setGuia(orderId);
  };

  const guiaOrder = guia ? orders.find(o => o.id === guia) : null;

  if (guiaOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="page-header">Guia de Produção</h1>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => setGuia(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm">Voltar</button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 print:shadow-none print:border-0 space-y-5">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">GUIA DE PRODUÇÃO</h2>
            <p className="text-lg font-semibold text-primary mt-1">{guiaOrder.number}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span><p className="font-semibold text-foreground">{guiaOrder.clientName}</p></div>
            <div><span className="text-muted-foreground">Data:</span><p className="font-semibold text-foreground">{new Date().toLocaleDateString('pt-BR')}</p></div>
            <div><span className="text-muted-foreground">Vendedor:</span><p className="font-semibold text-foreground">{guiaOrder.sellerName}</p></div>
            <div><span className="text-muted-foreground">Status:</span><p><StatusBadge status={guiaOrder.status} /></p></div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50"><th className="text-left px-4 py-2 text-muted-foreground font-medium">Produto</th><th className="text-right px-4 py-2 text-muted-foreground font-medium">Qtd</th><th className="text-right px-4 py-2 text-muted-foreground font-medium">Total</th></tr></thead>
              <tbody>
                {guiaOrder.items.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2 text-foreground">{item.product}</td>
                    <td className="px-4 py-2 text-right text-foreground">{item.quantity}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center py-6 border-t border-border">
            <div className="text-center">
              <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">QR Code do Pedido</p>
              <p className="text-xs text-primary font-mono mt-1 break-all">{guiaOrder.qrCode}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Pedidos de Produção</h1>
        <p className="page-subtitle">Gerencie a produção dos pedidos aprovados</p>
      </div>

      {relevantOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Nenhum pedido para produção</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relevantOrders.map(order => (
            <div key={order.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{order.number}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{order.clientName} • {order.items[0]?.product} (x{order.items[0]?.quantity})</p>
                </div>
                <div className="flex gap-2">
                  {order.status === 'aguardando_producao' && (
                    <button onClick={() => iniciarProducao(order.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-producao text-primary-foreground rounded-lg text-xs font-medium hover:bg-producao/90">
                      <Play className="w-3.5 h-3.5" /> Iniciar Produção
                    </button>
                  )}
                  {order.status === 'em_producao' && (
                    <button onClick={() => finalizarProducao(order.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90">
                      <CheckCircle className="w-3.5 h-3.5" /> Finalizar Produção
                    </button>
                  )}
                  {order.status === 'producao_finalizada' && (
                    <button onClick={() => setGuia(order.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                      <Printer className="w-3.5 h-3.5" /> Ver Guia
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PedidosProducaoPage;
