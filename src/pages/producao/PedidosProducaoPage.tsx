import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Play, CheckCircle, Printer, QrCode, Package, ArrowLeft } from 'lucide-react';

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
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <h1 className="page-header">Guia de Produção</h1>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-primary">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => setGuia(null)} className="btn-modern bg-muted text-foreground shadow-none">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>

        <div className="card-section p-8 print:shadow-none print:border-0 space-y-6">
          <div className="text-center pb-6 border-b border-border/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-producao to-producao/70 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground">GUIA DE PRODUÇÃO</h2>
            <p className="text-lg font-bold gradient-text mt-1">{guiaOrder.number}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Cliente', value: guiaOrder.clientName },
              { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
              { label: 'Vendedor', value: guiaOrder.sellerName },
              { label: 'Status', badge: true },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <span className="text-xs text-muted-foreground block mb-1">{item.label}</span>
                {item.badge ? <StatusBadge status={guiaOrder.status} /> : <p className="font-bold text-foreground text-sm">{item.value}</p>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="modern-table">
              <thead><tr><th>Produto</th><th className="text-right">Qtd</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {guiaOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">{item.product}</td>
                    <td className="text-right text-foreground">{item.quantity}</td>
                    <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center py-8 border-t border-border/40">
            <div className="text-center">
              <div className="w-36 h-36 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border/40">
                <QrCode className="w-20 h-20 text-muted-foreground/60" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QR Code do Pedido</p>
              <p className="text-xs text-primary font-mono mt-2 break-all max-w-xs">{guiaOrder.qrCode}</p>
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
        <div className="card-section p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-bold text-lg">Nenhum pedido para produção</p>
          <p className="text-sm text-muted-foreground mt-1">Aguardando pedidos aprovados</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {relevantOrders.map(order => (
            <div key={order.id} className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-foreground text-sm">{order.number}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{order.clientName} • {order.items[0]?.product} (x{order.items[0]?.quantity})</p>
                </div>
                <div className="flex gap-2">
                  {order.status === 'aguardando_producao' && (
                    <button onClick={() => iniciarProducao(order.id)} className="btn-modern bg-gradient-to-r from-producao to-producao/80 text-primary-foreground text-xs px-4 py-2">
                      <Play className="w-3.5 h-3.5" /> Iniciar
                    </button>
                  )}
                  {order.status === 'em_producao' && (
                    <button onClick={() => finalizarProducao(order.id)} className="btn-modern bg-gradient-to-r from-success to-success/80 text-success-foreground text-xs px-4 py-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Finalizar
                    </button>
                  )}
                  {order.status === 'producao_finalizada' && (
                    <button onClick={() => setGuia(order.id)} className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-4 py-2 hover:bg-primary/20">
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
