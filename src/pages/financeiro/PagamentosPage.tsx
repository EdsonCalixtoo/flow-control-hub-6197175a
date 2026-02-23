import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { CheckCircle, Clock, AlertTriangle, Search, ExternalLink, CreditCard, Landmark, QrCode, Banknote } from 'lucide-react';

const METHOD_ICONS: Record<string, React.ReactNode> = {
  'Pix': <QrCode className="w-4 h-4" />,
  'Boleto': <Banknote className="w-4 h-4" />,
  'Cartão': <CreditCard className="w-4 h-4" />,
  'Transferência': <Landmark className="w-4 h-4" />,
};

const PagamentosPage: React.FC = () => {
  const { orders, updateOrderStatus } = useERP();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'todos' | 'pendente' | 'pago'>('todos');

  const relevantOrders = orders.filter(o =>
    o.status === 'aguardando_financeiro' ||
    o.status === 'aprovado_financeiro' ||
    o.paymentStatus === 'pago' ||
    o.paymentStatus === 'pendente'
  );

  const totalPago = relevantOrders.filter(o => o.paymentStatus === 'pago').reduce((s, o) => s + o.total, 0);
  const totalPendente = relevantOrders.filter(o => o.paymentStatus !== 'pago').reduce((s, o) => s + o.total, 0);
  const totalComComprovante = orders.filter(o => o.receiptUrl).length;

  const filtered = relevantOrders.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'todos' || (tab === 'pago' && o.paymentStatus === 'pago') || (tab === 'pendente' && o.paymentStatus !== 'pago');
    return matchSearch && matchTab;
  });

  const confirmPayment = (orderId: string) => {
    updateOrderStatus(orderId, 'aprovado_financeiro', { paymentStatus: 'pago' }, 'Financeiro', 'Pagamento confirmado');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Controle de Pagamentos</h1>
        <p className="page-subtitle">Gerencie os comprovantes e status de pagamento dos pedidos</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Pago</p>
              <p className="text-xl font-extrabold text-success">{formatCurrency(totalPago)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">A Receber</p>
              <p className="text-xl font-extrabold text-warning">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-info/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Com Comprovante</p>
              <p className="text-xl font-extrabold text-foreground">{totalComComprovante}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Buscar pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
        </div>
        <div className="flex gap-1.5">
          {([['todos', 'Todos'], ['pendente', 'Pendentes'], ['pago', 'Pagos']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-section overflow-hidden">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Forma Pgto</th>
                <th className="text-right">Valor</th>
                <th>Comprovante</th>
                <th>Status</th>
                <th className="text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground p-6 text-sm">Nenhum pagamento encontrado</td></tr>
              )}
              {filtered.map(order => (
                <tr key={order.id}>
                  <td className="font-bold text-foreground">{order.number}</td>
                  <td className="text-foreground">{order.clientName}</td>
                  <td>
                    {order.paymentMethod ? (
                      <span className="flex items-center gap-1.5 text-xs text-foreground">
                        <span className="text-muted-foreground">{METHOD_ICONS[order.paymentMethod] ?? <CreditCard className="w-4 h-4" />}</span>
                        {order.paymentMethod}
                      </span>
                    ) : <span className="text-muted-foreground text-xs italic">—</span>}
                  </td>
                  <td className="text-right font-semibold text-foreground">{formatCurrency(order.total)}</td>
                  <td>
                    {order.receiptUrl ? (
                      <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold">
                        <ExternalLink className="w-3 h-3" /> Ver comprovante
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Não anexado</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${order.paymentStatus === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {order.paymentStatus === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="text-center">
                    {order.status === 'aguardando_financeiro' && order.paymentStatus !== 'pago' && (
                      <button onClick={() => confirmPayment(order.id)} className="px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 text-xs font-bold transition-colors">
                        Confirmar
                      </button>
                    )}
                    {order.paymentStatus === 'pago' && (
                      <span className="text-xs text-success font-semibold">✓ Confirmado</span>
                    )}
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
