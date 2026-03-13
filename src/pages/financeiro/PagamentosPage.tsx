import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { CheckCircle, Clock, AlertTriangle, Search, ExternalLink, CreditCard, Landmark, QrCode, Banknote, XCircle } from 'lucide-react';

import type { Order, FinancialEntry } from '@/types/erp';

const METHOD_ICONS: Record<string, React.ReactNode> = {
  'Pix': <QrCode className="w-4 h-4" />,
  'Boleto': <Banknote className="w-4 h-4" />,
  'Cartão': <CreditCard className="w-4 h-4" />,
  'Transferência': <Landmark className="w-4 h-4" />,
};

const PagamentosPage: React.FC = () => {
  const { orders, products, updateOrderStatus, addFinancialEntry } = useERP();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const relevantOrders = orders.filter(o => {
    // Excluir produtos de Carenagem aqui (Robusto)
    const isCarenagem = o.items?.some(item => {
      const productName = (item.product || '').trim().toLowerCase();
      const product = (products || []).find(p => p.name.trim().toLowerCase() === productName || p.sku.trim().toLowerCase() === productName);
      if (product?.category === 'Carenagem' || (product?.sku || item.product || '').toUpperCase().startsWith('SS-')) return true;
      const keywords = ['side skirt', 'carenagem', 'saia lateral'];
      return keywords.some(k => productName.includes(k) || (item.description || '').toLowerCase().includes(k));
    });
    if (isCarenagem) return false;

    return o.status === 'aguardando_financeiro' || 
      o.status === 'aprovado_financeiro' ||
      o.paymentStatus === 'pago' ||
      o.paymentStatus === 'pendente';
  });

  const totalPago = relevantOrders.filter(o => o.paymentStatus === 'pago').reduce((s, o) => s + o.total, 0);
  const totalPendente = relevantOrders.filter(o => o.paymentStatus !== 'pago').reduce((s, o) => s + o.total, 0);
  const totalComComprovante = orders.filter(o => o.receiptUrl).length;

  const filtered = relevantOrders.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'todos' || (tab === 'pago' && o.paymentStatus === 'pago') || (tab === 'pendente' && o.paymentStatus !== 'pago');
    return matchSearch && matchTab;
  });

  const confirmPayment = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Gera lançamento financeiro para não ficar com saldo devedor
    const entry: FinancialEntry = {
      id: crypto.randomUUID(),
      type: 'receita',
      description: `Pagamento Total (Confirmado Manual) - ${order.number} - ${order.clientName}`,
      amount: order.total,
      category: 'Venda de Produtos',
      date: new Date().toISOString().split('T')[0],
      status: 'pago',
      orderId: order.id,
      orderNumber: order.number,
      clientId: order.clientId,
      clientName: order.clientName,
      paymentMethod: order.paymentMethod || 'Pix',
      createdAt: new Date().toISOString(),
    };
    
    await addFinancialEntry(entry);
    await updateOrderStatus(orderId, 'aprovado_financeiro', { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true }, 'Financeiro', 'Pagamento confirmado manualmente');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            Controle de <span className="finance-text-gradient">Pagamentos</span>
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-1">Validação de Fluxo Financeiro e Comprovantes</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card-premium p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Saldo Liquidado</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">{formatCurrency(totalPago)}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Contas a Receber</p>
              <p className="text-2xl font-black text-amber-500 tracking-tighter">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <AlertTriangle className="w-7 h-7 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Documentação Anexada</p>
              <p className="text-2xl font-black text-foreground tracking-tighter">{totalComComprovante} <span className="text-xs font-bold opacity-40">Arquivos</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-section p-4 glass-premium flex items-center gap-4 flex-wrap border-none shadow-xl">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input 
            type="text" 
            placeholder="Buscar por número do pedido ou nome do cliente..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-modern pl-11 py-3.5 bg-background/50 border-border/40 focus:border-primary/50 transition-all rounded-xl text-sm" 
          />
        </div>
        <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl border border-border/20">
          {([['todos', 'Todos'], ['pendente', 'Pendentes'], ['pago', 'Pagos']] as const).map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setTab(v)} 
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === v ? 'bg-white dark:bg-slate-800 text-primary shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-section glass-premium overflow-hidden border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="py-5 pl-8 uppercase tracking-widest text-[10px] font-black">ID do Pedido</th>
                <th className="py-5 uppercase tracking-widest text-[10px] font-black">Cliente / Razão Social</th>
                <th className="py-5 uppercase tracking-widest text-[10px] font-black">Gateway / Método</th>
                <th className="text-right py-5 uppercase tracking-widest text-[10px] font-black">Valor Total</th>
                <th className="py-5 uppercase tracking-widest text-[10px] font-black">Evidência</th>
                <th className="py-5 uppercase tracking-widest text-[10px] font-black">Status</th>
                <th className="text-center py-5 pr-8 uppercase tracking-widest text-[10px] font-black">Fluxo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <Search className="w-10 h-10" />
                      <p className="font-black text-[10px] uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(order => (
                <tr key={order.id} className="group hover:bg-primary/[0.02] transition-colors">
                  <td className="py-6 pl-8 font-black text-foreground">#{order.number}</td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{order.clientName}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Faturamento Direto</span>
                    </div>
                  </td>
                  <td className="py-6">
                    {order.paymentMethod ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 w-fit border border-border/40">
                        <span className="text-primary">{METHOD_ICONS[order.paymentMethod] ?? <CreditCard className="w-4 h-4" />}</span>
                        <span className="text-xs font-black uppercase tracking-tight text-foreground">{order.paymentMethod}</span>
                      </div>
                    ) : <span className="text-muted-foreground text-[10px] italic font-medium">Não definido</span>}
                  </td>
                  <td className="text-right py-6 font-black text-foreground tabular-nums tracking-tighter text-base">{formatCurrency(order.total)}</td>
                  <td className="py-6">
                    {order.receiptUrl ? (
                      <button 
                        type="button"
                        onClick={() => setPreviewUrl(order.receiptUrl || '')}
                        className="h-10 px-4 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> EXAMINAR
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-black uppercase opacity-40">Ausente</span>
                    )}
                  </td>
                  <td className="py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.paymentStatus === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${order.paymentStatus === 'pago' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                      {order.paymentStatus === 'pago' ? 'Liquidado' : 'Em Aberto'}
                    </span>
                  </td>
                  <td className="text-center py-6 pr-8">
                    {order.status === 'aguardando_financeiro' && order.paymentStatus !== 'pago' && (
                      <button 
                        onClick={() => confirmPayment(order.id)} 
                        className="h-10 px-6 rounded-xl bg-primary text-white hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
                      >
                        CONFIRMAR
                      </button>
                    )}
                    {order.paymentStatus === 'pago' && (
                      <div className="flex justify-center">
                        <span className="h-10 px-6 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> APROVADO
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Visualização Global */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Visualização de Comprovante</h2>
            <div className="flex items-center gap-4">
               <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = previewUrl.includes('pdf') ? 'comprovante.pdf' : 'comprovante.jpg';
                  a.click();
                }}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
              >
                Download
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}
                className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
            {previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe src={previewUrl} title="Documento" className="w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl bg-white border-none" />
            ) : (
              <img src={previewUrl} alt="Comprovante" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PagamentosPage;
