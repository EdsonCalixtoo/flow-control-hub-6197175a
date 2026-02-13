import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { Play, CheckCircle, Printer, Package, ArrowLeft, Search, ScanLine, X } from 'lucide-react';
import BarcodeComponent from 'react-barcode';

const PedidosProducaoPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [guia, setGuia] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const allOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
  );

  const filteredOrders = allOrders.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

  const handleScan = () => {
    const code = scanInput.trim().toUpperCase();
    const order = orders.find(o => o.number === code);
    if (order) {
      if (order.status === 'producao_finalizada') {
        updateOrderStatus(order.id, 'produto_liberado', {
          releasedAt: new Date().toISOString(),
          releasedBy: 'Scanner',
        });
        setScanResult({ success: true, message: `Pedido ${order.number} liberado com sucesso!`, orderNumber: order.number });
      } else if (order.status === 'produto_liberado') {
        setScanResult({ success: true, message: `Pedido ${order.number} já foi liberado.`, orderNumber: order.number });
      } else {
        setScanResult({ success: false, message: `Pedido ${order.number} não está pronto para liberação. Status atual: ${order.status}` });
      }
    } else {
      setScanResult({ success: false, message: 'Código não encontrado. Verifique e tente novamente.' });
    }
    setScanInput('');
  };

  // Scanner screen
  if (showScanner) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Leitura de Código</h1>
            <p className="page-subtitle">Escaneie ou digite o código do pedido</p>
          </div>
          <button onClick={() => { setShowScanner(false); setScanResult(null); }} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>

        <div className="max-w-lg mx-auto space-y-6">
          <div className="card-section p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center mx-auto">
              <ScanLine className="w-10 h-10 text-producao" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Scanner de Código de Barras</h2>
              <p className="text-sm text-muted-foreground mt-1">Escaneie ou digite o número do pedido (ex: PED-001)</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="PED-001"
                className="input-modern text-center text-lg font-mono font-bold tracking-widest"
                autoFocus
              />
              <button onClick={handleScan} className="btn-primary px-6" disabled={!scanInput.trim()}>
                Validar
              </button>
            </div>
          </div>

          {scanResult && (
            <div className={`card-section p-6 text-center animate-scale-in ${scanResult.success ? 'border-success/40' : 'border-destructive/40'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${scanResult.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {scanResult.success ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <X className="w-8 h-8 text-destructive" />
                )}
              </div>
              <p className={`font-bold text-sm ${scanResult.success ? 'text-success' : 'text-destructive'}`}>
                {scanResult.success ? 'Sucesso!' : 'Erro'}
              </p>
              <p className="text-sm text-foreground mt-1">{scanResult.message}</p>
              {scanResult.success && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date().toLocaleString('pt-BR')} • Liberado por Scanner
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Guia de produção
  const guiaOrder = guia ? orders.find(o => o.id === guia) : null;

  if (guiaOrder) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
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

          {/* Código de barras + Etiqueta */}
          <div className="flex flex-col items-center py-8 border-t border-border/40 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código de Barras do Pedido</p>
            <div className="bg-white p-4 rounded-xl">
              <BarcodeComponent value={guiaOrder.number} format="CODE128" width={2} height={80} displayValue={true} fontSize={14} margin={10} />
            </div>
            <button onClick={() => window.print()} className="btn-modern bg-producao/10 text-producao shadow-none text-xs hover:bg-producao/20">
              <Printer className="w-3.5 h-3.5" /> Imprimir Etiqueta Térmica
            </button>
          </div>
        </div>

        {/* Etiqueta térmica (print only) */}
        <div className="hidden print:block">
          <div className="w-[300px] mx-auto p-4 border border-foreground text-center space-y-2">
            <p className="font-bold text-sm">{guiaOrder.clientName}</p>
            <p className="text-xs">{guiaOrder.number}</p>
            <BarcodeComponent value={guiaOrder.number} format="CODE128" width={1.5} height={50} displayValue={true} fontSize={10} margin={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Pedidos de Produção</h1>
          <p className="page-subtitle">Gerencie a produção dos pedidos aprovados</p>
        </div>
        <button onClick={() => setShowScanner(true)} className="btn-modern bg-gradient-to-r from-producao to-producao/80 text-primary-foreground">
          <ScanLine className="w-4 h-4" /> Ler Código
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Buscar pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'aguardando_producao', label: 'Aguardando' },
            { value: 'em_producao', label: 'Em Produção' },
            { value: 'producao_finalizada', label: 'Finalizado' },
            { value: 'produto_liberado', label: 'Liberado' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card-section p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-bold text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Aguardando pedidos aprovados</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredOrders.map(order => (
            <div key={order.id} className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-producao" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-foreground text-sm">{order.number}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{order.clientName} • {order.items[0]?.product} (x{order.items[0]?.quantity})</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Criado: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      {order.productionStartedAt && ` • Iniciado: ${new Date(order.productionStartedAt).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
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
                  {(order.status === 'producao_finalizada' || order.status === 'produto_liberado') && (
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
