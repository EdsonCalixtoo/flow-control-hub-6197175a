import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline } from '@/components/shared/OrderTimeline';
import {
  ShoppingCart, FileText, Clock, Eye, Package, CheckCircle, Star,
  FileUp, Loader2, XCircle, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

import { uploadToR2, generateR2Path } from '@/lib/storageServiceR2';

const VendedorDashboard: React.FC = () => {
  const { orders, monthlyClosings, clients, financialEntries, updateOrderStatus } = useERP();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'resumo' | 'dividas'>('resumo');
  const [uploadingOrderId, setUploadingOrderId] = React.useState<string | null>(null);
  const [selectedClientOrders, setSelectedClientOrders] = React.useState<{clientId: string, name: string} | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  // ✅ Lógica de Saldo Devedor Blindada (Fuzzy Match)
  const getSaldoDevedor = (orderId: string, orderTotal: number, paymentStatus?: string, orderNumber?: string) => {
    if (paymentStatus?.toLowerCase() === 'pago') return 0;
    const cleanNum = (n: string) => n.replace('#', '').trim().toLowerCase();
    const targetNum = orderNumber ? cleanNum(orderNumber) : null;

    const pagos = financialEntries
      .filter(e => {
        const matchesId = e.orderId === orderId;
        const matchesNumber = targetNum && e.orderNumber && cleanNum(e.orderNumber) === targetNum;
        const isReceita = e.type?.toLowerCase() === 'receita';
        const isNotCancelled = e.status?.toLowerCase() !== 'cancelado';
        return (matchesId || matchesNumber) && isReceita && isNotCancelled;
      })
      .reduce((s, e) => s + e.amount, 0);
    
    const saldoRaw = orderTotal - pagos;
    return saldoRaw < 0.10 ? 0 : saldoRaw;
  };

  const handleFileUpload = async (orderId: string, file: File) => {
    setUploadingOrderId(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // ☁️ Upload real para o R2 em vez de Base64 no banco de dados
      const path = generateR2Path(file, orderId);
      const publicUrl = await uploadToR2(file, path);

      const updatedReceipts = [...(order.receiptUrls || []), publicUrl];

      await updateOrderStatus(
        orderId,
        order.status,
        { receiptUrls: updatedReceipts },
        'Vendedor',
        'Comprovante enviado através do Dashboard de Saldo Devedor'
      );

      import('sonner').then(({ toast }) => toast.success('Comprovante enviado com sucesso!'));
      setFileInputKey(prev => prev + 1);
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error('Erro ao enviar comprovante: ' + (err.message || 'Tente novamente.')));
    } finally {
      setUploadingOrderId(null);
    }
  };

  // ✅ Filtra SOMENTE os pedidos do vendedor logado
  const myOrders = useMemo(() => orders.filter(o => o.sellerId === user?.id), [orders, user?.id]);
  
  const lastClosing = useMemo(() => {
    if (!user?.id) return null;
    const closings = (monthlyClosings || []).filter(c => c.sellerId === user.id);
    if (closings.length === 0) return null;
    return new Date(closings.sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime())[0].closingDate);
  }, [monthlyClosings, user?.id]);
  
  const STATUS_VISIVEL_FINANCEIRO = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
  ];

  // Filtro extra: vendas reais que aparecem no financeiro (exclui rascunhos e orçamentos não enviados)
  const myRealOrders = useMemo(() => myOrders.filter(o => 
    STATUS_VISIVEL_FINANCEIRO.includes(o.status) &&
    o.status !== 'rejeitado_financeiro' && // Rejeitados não contam como venda ou dívida
    (!o.isWarranty ? (o.total > 0 || (o.items && o.items.some(item => item.isReward))) : true)
  ), [myOrders]);

  // Vendas que contam para a performance (apenas pedidos APÓS o último fechamento)
  const myCurrentCycleOrders = useMemo(() => myRealOrders.filter(o => 
    !lastClosing || new Date(o.createdAt) > lastClosing
  ), [myRealOrders, lastClosing]);

  // KPIs da Dashboard (Respeitam o Ciclo Novo)
  const pedidosEnviadosCiclo = useMemo(() => myCurrentCycleOrders.filter(o => o.status !== 'rascunho').length, [myCurrentCycleOrders]);
  
  // Orçamentos pendentes (Sempre visíveis)
  const orcamentosPendentes = useMemo(() => myRealOrders.filter(o =>
    o.status === 'rascunho' || o.status === 'enviado'
  ).length, [myRealOrders]);

  const statusesQueContam: string[] = [
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado',
    'retirado_entregador'
  ];

  const totalVendasCiclo = useMemo(() => myCurrentCycleOrders
    .filter(o => statusesQueContam.includes(o.status))
    .reduce((s, o) => s + o.total, 0), [myCurrentCycleOrders]);

  // ✅ Resumo de produtos vendidos agrupados (Respeita o Ciclo)
  const produtosVendidosAgrupados = useMemo(() => {
    const map = new Map<string, { product: string; quantity: number; sensorType?: string; totalValue: number }>();

    myCurrentCycleOrders
      .filter(o => statusesQueContam.includes(o.status))
      .forEach(order => {
        order.items.forEach(item => {
          if (item.unitPrice > 0) {
            const key = `${item.product}-${item.sensorType || ''}`;
            const current = map.get(key) || { product: item.product, quantity: 0, sensorType: item.sensorType, totalValue: 0 };
            current.quantity += item.quantity;
            current.totalValue += (item.quantity * item.unitPrice);
            map.set(key, current);
          }
        });
      });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [myCurrentCycleOrders]);

  // ✅ Agrupamento de Dívida por Cliente (Sincronizado com Financeiro)
  const clientesComDividas = useMemo(() => {
    const map = new Map<string, { clientId: string; name: string; totalDebt: number; totalPaid: number; ordersCount: number; isConsigned: boolean }>();

    myRealOrders.forEach(o => {
      // ✅ Usa exatamente a mesma lógica do financeiro para saldo
      const saldo = getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number);
      const pago = o.total - saldo;
      
      // ✅ SÓ entra na lista se houver dívida >= 0.10 (mesmo critério do financeiro)
      if (saldo >= 0.10) {
        const client = clients.find(c => c.id === o.clientId);
        const current = map.get(o.clientId) || { 
          clientId: o.clientId, 
          name: o.clientName, 
          totalDebt: 0, 
          totalPaid: 0,
          ordersCount: 0, 
          isConsigned: client?.consignado === true || o.isConsigned === true 
        };
        current.totalDebt += saldo;
        current.totalPaid += pago;
        current.ordersCount += 1;
        map.set(o.clientId, current);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [myRealOrders, financialEntries, clients]);

  // ✅ LISTAS (Não respeitam o ciclo, mostram tudo para controle do vendedor)
  const pedidosRecentes = useMemo(() => myOrders
    .filter(o => o.status !== 'rascunho')
    .slice(0, 8), [myOrders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard do Vendedor</h1>
        <p className="page-subtitle">Acompanhe suas vendas e metas — {user?.name}</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('resumo')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'resumo' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
        >
          MEU RESUMO
        </button>
        <button
          onClick={() => setActiveTab('dividas')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'dividas' ? 'bg-rose-500 text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'}`}
        >
          SALDO DEVEDOR
          {clientesComDividas.length > 0 && (
            <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              {clientesComDividas.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'resumo' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            <Link to="/vendedor/orcamentos" className="block">
              <StatCard title="Vendido no Ciclo" value={formatCurrency(totalVendasCiclo)} icon={ShoppingCart} color="text-vendedor" />
            </Link>
            <Link to="/vendedor/orcamentos" className="block">
              <StatCard title="Pedidos no Ciclo" value={pedidosEnviadosCiclo} icon={FileText} color="text-success" />
            </Link>
            <Link to="/vendedor/orcamentos" className="block">
              <StatCard title="Orçam. Pendentes" value={orcamentosPendentes} icon={Clock} color="text-warning" />
            </Link>
            <Link to="/vendedor/orcamentos" className="block">
              <StatCard title="Itens no Ciclo" value={produtosVendidosAgrupados.reduce((acc, p) => acc + p.quantity, 0)} icon={Package} color="text-primary" />
            </Link>
          </div>

          {/* Atalhos rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/vendedor/orcamentos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vendedor/20 to-vendedor/5 flex items-center justify-center text-vendedor group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Criar Orçamento</p>
                  <p className="text-xs text-muted-foreground">Novo orçamento rápido</p>
                </div>
              </div>
            </Link>
            <Link to="/vendedor/clientes" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-financeiro/20 to-financeiro/5 flex items-center justify-center text-financeiro group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Gestão de Clientes</p>
                  <p className="text-xs text-muted-foreground">CRM completo</p>
                </div>
              </div>
            </Link>
            <Link to="/vendedor/orcamentos" className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center text-producao group-hover:scale-110 transition-transform">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Acompanhar Pedidos</p>
                  <p className="text-xs text-muted-foreground">Todos os status</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-section overflow-hidden h-fit">
              <div className="card-section-header bg-muted/20 border-b border-border/40 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20 uppercase">
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-foreground uppercase tracking-tight">{user?.name}</h2>
                    <p className="text-[10px] text-muted-foreground font-bold">{pedidosEnviadosCiclo} pedido(s) no ciclo</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Vendido no Ciclo</p>
                  <p className="text-lg font-black text-success">{formatCurrency(totalVendasCiclo)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/10 border-b border-border/30">
                      <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Produto</th>
                      <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Quantidade</th>
                      <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {produtosVendidosAgrupados.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground text-sm italic">
                          Nenhuma venda registrada para o ciclo atual.
                        </td>
                      </tr>
                    ) : (
                      produtosVendidosAgrupados.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors uppercase">{prod.product}</span>
                              {prod.sensorType && (
                                <span className={`inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded-full border ${prod.sensorType === 'com_sensor'
                                  ? 'bg-success/10 border-success/20 text-success'
                                  : 'bg-muted border-border/40 text-muted-foreground'
                                  }`}>
                                  {prod.sensorType === 'com_sensor' ? '✓ COM SENSOR' : '⚡ SEM SENSOR'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 min-w-[32px] rounded-lg bg-primary/10 text-primary font-black text-xs">
                              {prod.quantity}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-[11px] font-black text-foreground">{formatCurrency(prod.totalValue)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-section">
              <div className="card-section-header">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-producao" />
                  <h2 className="card-section-title">Todos os Meus Pedidos</h2>
                </div>
                <Link to="/vendedor/orcamentos" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
              </div>
              <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto custom-scrollbar">
                {pedidosRecentes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum pedido encontrado.
                  </div>
                ) : (
                  pedidosRecentes.map(order => (
                    <div key={order.id} className="p-4 md:p-5 space-y-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground text-sm">{order.number}</span>
                          <span className="text-muted-foreground text-xs ml-2">{order.clientName}</span>
                        </div>
                        <span className="font-semibold text-foreground text-sm">{formatCurrency(order.total)}</span>
                      </div>
                      <OrderPipeline order={order} compact />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card-section p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-rose-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">Saldo Devedor de Clientes</h2>
                <p className="text-rose-100 text-xs font-medium">Lista de clientes com pagamentos pendentes ou parciais vinculados a você.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total a Cobrar</p>
                <p className="text-3xl font-black">{formatCurrency(clientesComDividas.reduce((acc, c) => acc + c.totalDebt, 0))}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b border-border/30">
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest items-center gap-2">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Pedidos</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Valor Pago</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Saldo Devedor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {clientesComDividas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                      <div className="max-w-xs mx-auto space-y-2">
                        <CheckCircle className="w-12 h-12 text-success/20 mx-auto" />
                        <p className="font-bold text-foreground">Tudo limpo por aqui!</p>
                        <p className="text-xs">Nenhum dos seus clientes possui saldo devedor pendente no momento.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clientesComDividas.map((client) => (
                    <tr key={client.clientId} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-rose-500 transition-colors">{client.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">ID: {client.clientId.slice(0,8)}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          {client.isConsigned ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">
                              <Star className="w-3 h-3" /> CONSIGNADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black border border-blue-500/20">
                              PADRÃO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2 py-1 rounded-lg bg-muted text-foreground font-black text-xs">
                          {client.ordersCount}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-black text-emerald-500 tabular-nums">{formatCurrency(client.totalPaid)}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-base font-black text-rose-500 tracking-tighter tabular-nums">{formatCurrency(client.totalDebt)}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClientOrders({ clientId: client.clientId, name: client.name });
                            }}
                            className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Anexar Comprovantes"
                          >
                            <FileUp className="w-5 h-5" />
                          </button>
                          <Link 
                            to={`/vendedor/clientes`}
                            className="h-10 px-4 rounded-xl bg-muted hover:bg-rose-500 hover:text-white text-foreground transition-all text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"
                          >
                            Detalhes <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal: Seleção de Pedido para Upload */}
      {selectedClientOrders && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-lg rounded-[2rem] border border-border shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 bg-primary text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Anexar Comprovante</h3>
                <p className="text-xs opacity-80">{selectedClientOrders.name}</p>
              </div>
              <button 
                onClick={() => setSelectedClientOrders(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Selecione o pedido pendente:</p>
              
              {myRealOrders
                .filter(o => o.clientId === selectedClientOrders.clientId && getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) > 0)
                .map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
                  return (
                    <div 
                      key={order.id} 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5', 'scale-[1.02]'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-primary', 'bg-primary/5', 'scale-[1.02]');
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileUpload(order.id, file);
                      }}
                      className="p-4 rounded-2xl bg-muted/30 border border-border/40 hover:border-primary/40 transition-all group flex items-center justify-between"
                    >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-foreground">#{order.number}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500">Pendente</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Saldo: <span className="font-black text-rose-500">{formatCurrency(saldo)}</span></p>
                          
                          {/* Miniaturas de comprovantes já enviados */}
                          {order.receiptUrls && order.receiptUrls.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {order.receiptUrls.slice(0, 5).map((url, idx) => (
                                <button 
                                  key={idx} 
                                  onClick={() => setPreviewUrl(url)}
                                  className="w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-background hover:scale-110 transition-transform"
                                  title="Clique para ver"
                                >
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </button>
                              ))}
                              {order.receiptUrls.length > 5 && (
                                <span className="text-[8px] font-black text-muted-foreground">+{order.receiptUrls.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          key={fileInputKey}
                          type="file"
                          id={`file-dash-${order.id}`}
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(order.id, file);
                          }}
                        />
                        <button
                          onClick={() => document.getElementById(`file-dash-${order.id}`)?.click()}
                          disabled={uploadingOrderId === order.id}
                          className={`h-11 px-4 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                            uploadingOrderId === order.id 
                              ? 'bg-muted text-muted-foreground animate-pulse' 
                              : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {uploadingOrderId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>ENVIAR <FileUp className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização Global */}
      {previewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Visualização do Comprovante</h2>
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
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Download
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}
                className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe src={previewUrl} title="Documento" className="w-full max-w-5xl h-full rounded-2xl bg-white border-none shadow-2xl" />
            ) : (
              <img src={previewUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendedorDashboard;
