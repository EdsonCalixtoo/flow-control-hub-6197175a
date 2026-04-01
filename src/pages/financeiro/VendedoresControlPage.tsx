import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { Search, TrendingUp, Eye, ArrowLeft, Lock, History, CheckCircle2, AlertCircle, Calendar, Download, FileText, Loader2 } from 'lucide-react';
import type { Order, MonthlyClosing } from '@/types/erp';
import { toast } from 'sonner';
import { generateClosingPDF, generateSellerItemsPDF } from '@/lib/pdfClosingGenerator';
import { uploadToR2 } from '@/lib/storageServiceR2';
import { updateMonthlyClosing } from '@/lib/fechamentoServiceSupabase';

const VendedoresControlPage: React.FC = () => {
  const { orders, clients, financialEntries, monthlyClosings, closeMonth } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'totalVendas' | 'qtdPedidos' | 'name'>('totalVendas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showClosingMode, setShowClosingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendedores' | 'historico'>('vendedores');
  const [isFixing, setIsFixing] = useState(false);

  // Helper para buscar último fechamento de um vendedor
  const getLastClosingDate = (sellerId: string) => {
    const closings = monthlyClosings.filter(c => c.sellerId === sellerId);
    if (closings.length === 0) return null;
    return new Date(closings.sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime())[0].closingDate);
  };

  // Helper para saldo devedor
  const getSaldoDevedor = (orderId: string, orderTotal: number) => {
    const pagos = financialEntries
      .filter(e => e.orderId === orderId && e.type === 'receita' && e.status === 'pago')
      .reduce((s, e) => s + e.amount, 0);
    return Math.max(0, orderTotal - pagos);
  };

  // Calcula estatísticas por vendedor
  const sellerStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      sellerId: string;
      totalVendas: number;
      qtdPedidos: number;
      pedidosAguardandoFinanceiro: number;
      pedidosAprovados: number;
      pedidosEmProducao: number;
      pedidosEntregues: number;
      valorMedio: number;
      valoresEmAberto: number;
      kitsComSensor: number;
      kitsSemSensor: number;
      estribos: number;
      totalProdutos: number;
      premios: number;
      lastClosingDate: Date | null;
      orders: Order[];
    }> = {};

    orders.forEach(order => {
      // ✅ Apenas conta vendas reais (ignora rascunhos, orçamentos e rejeitados)
      if (['rascunho', 'orcamento', 'rejeitado_financeiro'].includes(order.status)) return;

      const key = order.sellerId || order.sellerName;
      if (!stats[key]) {
        stats[key] = {
          name: order.sellerName,
          sellerId: order.sellerId,
          totalVendas: 0,
          qtdPedidos: 0,
          pedidosAguardandoFinanceiro: 0,
          pedidosAprovados: 0,
          pedidosEmProducao: 0,
          pedidosEntregues: 0,
          valorMedio: 0,
          valoresEmAberto: 0,
          kitsComSensor: 0,
          kitsSemSensor: 0,
          estribos: 0,
          totalProdutos: 0,
          premios: 0,
          lastClosingDate: getLastClosingDate(order.sellerId),
          orders: [],
        };
      }

      const lastClosing = stats[key].lastClosingDate;
      const isAfterClosing = !lastClosing || new Date(order.createdAt) > lastClosing;

      // Acumula história total para o detalhamento
      stats[key].orders.push(order);

      // Só incrementa KPIs de performance se for APÓS o último fechamento
      if (isAfterClosing) {
        stats[key].totalVendas += order.total;
        stats[key].qtdPedidos += 1;
        stats[key].valoresEmAberto += getSaldoDevedor(order.id, order.total);

        // Detalhamento de Itens
        order.items.forEach(item => {
          if (!item.isReward) {
            stats[key].totalProdutos += item.quantity;
          }
          
          if (item.product.toUpperCase().includes('ESTRIBO')) {
            stats[key].estribos += item.quantity;
          }

          if (item.isReward) {
            stats[key].premios += item.quantity;
          } else if (item.sensorType === 'com_sensor') {
            stats[key].kitsComSensor += item.quantity;
          } else if (item.sensorType === 'sem_sensor') {
            stats[key].kitsSemSensor += item.quantity;
          }
        });

        if (order.status === 'aguardando_financeiro') stats[key].pedidosAguardandoFinanceiro += 1;
        if (order.status === 'aprovado_financeiro') stats[key].pedidosAprovados += 1;
        if (order.status === 'em_producao') stats[key].pedidosEmProducao += 1;
        if (order.status === 'produto_liberado') stats[key].pedidosEntregues += 1;
      }
    });

    Object.values(stats).forEach(stat => {
      stat.valorMedio = stat.qtdPedidos > 0 ? stat.totalVendas / stat.qtdPedidos : 0;
    });

    return Object.values(stats);
  }, [orders, monthlyClosings, financialEntries]);

  // Filtra e ordena
  const filteredSellers = useMemo(() => {
    let result = [...sellerStats];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return result;
  }, [sellerStats, searchQuery, sortBy, sortDir]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  const handleCloseMonth = async (seller: typeof sellerStats[0]) => {
    const confirmMsg = `Deseja realizar o fechamento mensal para ${seller.name}?\n\n` +
      `📦 Total Vendido: ${formatCurrency(seller.totalVendas)}\n` +
      `📋 Pedidos: ${seller.qtdPedidos}\n` +
      `📦 Total de Produtos: ${seller.totalProdutos}\n` +
      `📡 Kits Com Sensor: ${seller.kitsComSensor}\n` +
      `📦 Kits Sem Sensor: ${seller.kitsSemSensor}\n` +
      `🪜 Estribos: ${seller.estribos}\n` +
      `🎁 Premiações: ${seller.premios}`;
    
    if (!window.confirm(confirmMsg)) return;

    const now = new Date();
    const referenceMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // 1. Gera o PDF (Download opcional se quiser feedback imediato)
    const pdfBlob = generateClosingPDF({
      sellerName: seller.name,
      referenceMonth,
      closingDate: now.toISOString(),
      totalSold: seller.totalVendas,
      orderCount: seller.qtdPedidos,
      outstandingValue: seller.valoresEmAberto,
      kitsComSensor: seller.kitsComSensor,
      kitsSemSensor: seller.kitsSemSensor,
      premios: seller.premios,
      totalProducts: seller.totalProdutos,
      estribos: seller.estribos
    }, true); // Já baixa para o usuário ter a cópia dele

    // 2. Sobe para o R2 para persistência eterna
    toast.info('Salvando relatório na nuvem...');
    let pdfUrl = '';
    try {
      const fileName = `fechamentos/${seller.name.replace(/\s+/g, '_')}-${now.getTime()}.pdf`;
      pdfUrl = await uploadToR2(pdfBlob, fileName);
    } catch (err) {
      console.error('Erro ao subir PDF para R2:', err);
      toast.error('Erro ao salvar cópia digital no R2, mas o registro foi gravado.');
    }

    const closingData = {
      sellerId: seller.sellerId,
      sellerName: seller.name,
      referenceMonth,
      closingDate: now.toISOString(),
      totalSold: seller.totalVendas,
      orderCount: seller.qtdPedidos,
      outstandingValue: seller.valoresEmAberto,
      details: {
        lastClosing: seller.lastClosingDate?.toISOString() || 'Início',
        calculatedAt: now.toISOString(),
        kitsComSensor: seller.kitsComSensor,
        kitsSemSensor: seller.kitsSemSensor,
        premios: seller.premios,
        totalItems: seller.totalProdutos,
        estribos: seller.estribos,
        pdfUrl: pdfUrl // 🔥 Link eterno
      }
    };

    await closeMonth(closingData);
    toast.success(`Fechamento concluído e salvo no histórico!`);
  };

  const handlePrintItems = (seller: typeof sellerStats[0]) => {
    const now = new Date();
    const referenceMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    // Coleta todos os itens dos pedidos do período atual
    const itemsToPrint: any[] = [];
    
    seller.orders.forEach(order => {
      const lastClosing = seller.lastClosingDate;
      const isAfterClosing = !lastClosing || new Date(order.createdAt) > lastClosing;
      
      if (isAfterClosing) {
        order.items.forEach(item => {
          itemsToPrint.push({
            product: item.product,
            quantity: item.quantity,
            orderNumber: order.number,
            clientName: order.clientName,
            date: new Date(order.createdAt).toLocaleDateString('pt-BR')
          });
        });
      }
    });

    if (itemsToPrint.length === 0) {
      toast.error('Nenhum item vendido neste período para imprimir.');
      return;
    }

    generateSellerItemsPDF({
      sellerName: seller.name,
      referenceMonth,
      items: itemsToPrint
    });
    
    toast.success('Relatório de itens gerado com sucesso!');
  };

  const handlePrintHistoricalItems = (closing: MonthlyClosing) => {
    // Busca pedidos do vendedor que caem no range deste fechamento
    // ✅ Reutiliza a lógica de períodos (lastClosing até o closingDate)
    const lastClosingStr = closing.details?.lastClosing;
    const lastClosingDate = (!lastClosingStr || lastClosingStr === 'Início') ? null : new Date(lastClosingStr);
    const closingDate = new Date(closing.closingDate);

    const itemsToPrint: any[] = [];

    orders.forEach(order => {
      // Ignora rascunhos e outros não contábeis (mesma lógica do stats)
      if (['rascunho', 'orcamento', 'rejeitado_financeiro'].includes(order.status)) return;
      
      const isSeller = order.sellerId === closing.sellerId || order.sellerName === closing.sellerName;
      if (!isSeller) return;

      const orderDate = new Date(order.createdAt);
      const isAfterPrev = !lastClosingDate || orderDate > lastClosingDate;
      const isBeforeCurrent = orderDate <= closingDate;

      if (isAfterPrev && isBeforeCurrent) {
        order.items.forEach(item => {
          itemsToPrint.push({
            product: item.product,
            quantity: item.quantity,
            orderNumber: order.number,
            clientName: order.clientName,
            date: orderDate.toLocaleDateString('pt-BR')
          });
        });
      }
    });

    if (itemsToPrint.length === 0) {
      toast.error('Não foi possível reconstruir a lista de itens para este fechamento antigo.');
      return;
    }

    generateSellerItemsPDF({
      sellerName: closing.sellerName,
      referenceMonth: closing.referenceMonth,
      items: itemsToPrint
    });
    
    toast.success('Relatório de itens históricos gerado!');
  };

  const needsFix = useMemo(() => {
    return monthlyClosings.some(c => c.details?.totalItems === undefined || c.details?.estribos === undefined);
  }, [monthlyClosings]);

  const handleFixOldClosings = async () => {
    if (!window.confirm("Deseja recalcular e atualizar todos os fechamentos antigos com o total de itens e estribos? Isso atualizará os relatórios permanentemente.")) return;
    
    setIsFixing(true);
    let successCount = 0;

    for (const closing of monthlyClosings) {
      if (closing.details?.totalItems !== undefined && closing.details?.estribos !== undefined) continue;

      const lastClosingStr = closing.details?.lastClosing;
      const lastClosingDate = (!lastClosingStr || lastClosingStr === 'Início') ? null : new Date(lastClosingStr);
      const closingDate = new Date(closing.closingDate);

      let totalProdutos = 0;
      let estribos = 0;
      let kitsCom = 0;
      let kitsSem = 0;
      let premios = 0;

      orders.forEach(order => {
        if (['rascunho', 'orcamento', 'rejeitado_financeiro'].includes(order.status)) return;
        const isSeller = order.sellerId === closing.sellerId || order.sellerName === closing.sellerName;
        if (!isSeller) return;

        const orderDate = new Date(order.createdAt);
        if ((!lastClosingDate || orderDate > lastClosingDate) && orderDate <= closingDate) {
          order.items.forEach(item => {
            if (!item.isReward) totalProdutos += item.quantity;
            if (item.product.toUpperCase().includes('ESTRIBO')) estribos += item.quantity;
            
            if (item.isReward) premios += item.quantity;
            else if (item.sensorType === 'com_sensor') kitsCom += item.quantity;
            else if (item.sensorType === 'sem_sensor') kitsSem += item.quantity;
          });
        }
      });

      const updatedDetails = {
        ...closing.details,
        totalItems: totalProdutos,
        estribos,
        kitsComSensor: kitsCom || closing.details?.kitsComSensor || 0,
        kitsSemSensor: kitsSem || closing.details?.kitsSemSensor || 0,
        premios: premios || closing.details?.premios || 0
      };

      try {
        await updateMonthlyClosing(closing.id, { details: updatedDetails });
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    setIsFixing(false);
    toast.success(`${successCount} fechamentos foram atualizados! Recarregando...`);
    window.location.reload();
  };

  // Detalhes de um vendedor
  if (selectedSeller) {
    const seller = sellerStats.find(s => s.sellerId === selectedSeller);
    if (!seller) return null;

    const sellerOrders = seller.orders.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedSeller(null)} className="h-10 w-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm hover:scale-105 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-foreground">{seller.name}</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Performance {seller.lastClosingDate ? `desde ${seller.lastClosingDate.toLocaleDateString('pt-BR')}` : 'Total Acumulada'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePrintItems(seller)}
              className="btn-modern bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-xs font-bold"
            >
              <FileText className="w-3.5 h-3.5 mr-2" /> Imprimir Itens
            </button>
            <button 
              onClick={() => handleCloseMonth(seller)}
              className="btn-modern bg-primary text-white shadow-lg shadow-primary/20 text-xs font-bold"
            >
              <Lock className="w-3.5 h-3.5 mr-2" /> Fechar Mês
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Vendido', value: formatCurrency(seller.totalVendas), color: 'text-success', icon: TrendingUp },
            { label: 'Qtd Pedidos', value: seller.qtdPedidos.toString(), color: 'text-primary', icon: CheckCircle2 },
            { label: 'Valores em Aberto', value: formatCurrency(seller.valoresEmAberto), color: 'text-destructive', icon: AlertCircle },
            { label: 'Valor Médio', value: formatCurrency(seller.valorMedio), color: 'text-info', icon: History },
            { label: 'Sinc. Financeiro', value: seller.pedidosAguardandoFinanceiro.toString(), color: 'text-warning', icon: Calendar },
          ].map((card, i) => (
            <div key={i} className="glass-card p-5 border-border/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                   <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">{card.label}</p>
                   <p className={`text-xl font-black ${card.color} tracking-tight`}>{card.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color.replace('text-', 'bg-')}/10 overflow-hidden`}>
                   <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status dos Pedidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Aguardando Financeiro', value: seller.pedidosAguardandoFinanceiro, color: 'bg-warning/10 border-warning/30 text-warning' },
            { label: 'Aprovados', value: seller.pedidosAprovados, color: 'bg-success/10 border-success/30 text-success' },
            { label: 'Em Produção', value: seller.pedidosEmProducao, color: 'bg-info/10 border-info/30 text-info' },
            { label: 'Entregues', value: seller.pedidosEntregues, color: 'bg-primary/10 border-primary/30 text-primary' },
          ].map((status, i) => (
            <div key={i} className={`p-4 rounded-xl border ${status.color}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">{status.label}</p>
              <p className="text-2xl font-bold">{status.value}</p>
            </div>
          ))}
        </div>

        {/* Tabela de Pedidos */}
        <div className="card-section p-0 border-border/10 overflow-hidden">
          <div className="p-6 border-b border-border/10 bg-muted/20 flex items-center justify-between">
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Histórico Completo de Pedidos</h2>
            <span className="text-[10px] font-bold text-muted-foreground bg-white px-2 py-1 rounded-md border border-border/40">
              {sellerOrders.length} PEDIDOS NO TOTAL
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Saldo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sellerOrders.map(order => {
                  const isNew = !seller.lastClosingDate || new Date(order.createdAt) > seller.lastClosingDate;
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <tr key={order.id} className={isNew ? 'bg-primary/[0.02]' : 'opacity-60'}>
                      <td className="font-semibold text-foreground flex items-center gap-2">
                        {order.number}
                        {isNew && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Novo Período" />}
                      </td>
                      <td className="text-muted-foreground text-xs">{order.clientName}</td>
                      <td className="text-[11px] font-medium text-muted-foreground/70">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="text-right font-bold text-foreground">{formatCurrency(order.total)}</td>
                      <td className={`text-right font-bold ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(saldo)}</td>
                      <td>
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${order.status === 'aguardando_financeiro' ? 'bg-warning/20 text-warning' :
                          order.status === 'aprovado_financeiro' ? 'bg-success/20 text-success' :
                            order.status === 'em_producao' ? 'bg-info/20 text-info' :
                              order.status === 'produto_liberado' ? 'bg-primary/20 text-primary' :
                                'bg-muted/30 text-muted-foreground'
                          }`}>
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Lista de Vendedores
  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-header">Controle por Vendedor</h1>
          <p className="page-subtitle">Monitoramento de performance e gestão de períodos</p>
        </div>
        
        <div className="flex p-1 bg-muted rounded-2xl border border-border/40">
           <button 
             onClick={() => setActiveTab('vendedores')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'vendedores' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
           >
             VENDEDORES
           </button>
           <button 
             onClick={() => setActiveTab('historico')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'historico' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
           >
             HISTÓRICO DE FECHAMENTOS
           </button>
        </div>
      </div>

      {activeTab === 'vendedores' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Busca */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Buscar vendedor por nome..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-modern pl-11 w-full h-12 shadow-sm"
              />
            </div>

            <button 
              onClick={() => setShowClosingMode(!showClosingMode)}
              className={`btn-modern flex items-center gap-2 h-12 px-6 transition-all font-black text-xs ${showClosingMode ? 'bg-primary text-white' : 'bg-muted/80 text-muted-foreground border-border/40'}`}
            >
              {showClosingMode ? <History className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {showClosingMode ? 'SAIR DO MODO FECHAMENTO' : 'MODO FECHAMENTO MENSAL'}
            </button>
          </div>

          {/* Tabela de Vendedores */}
          <div className="card-section p-0 border-border/10 shadow-2xl shadow-primary/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="cursor-pointer hover:text-primary py-5" onClick={() => handleSort('name')}>
                      Vendedor {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('qtdPedidos')}>
                      Qtd Pedidos {sortBy === 'qtdPedidos' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('totalVendas')}>
                      Total Vendido {sortBy === 'totalVendas' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-right">Aberto</th>
                    <th className="text-right">Valor Médio</th>
                    <th className="text-center">Aguardando</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSellers.map(seller => (
                    <tr key={seller.sellerId} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="font-extrabold text-foreground py-4">
                        <div className="flex flex-col">
                          <span>{seller.name}</span>
                          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.1em]">
                            {seller.lastClosingDate ? `Ciclo desde ${seller.lastClosingDate.toLocaleDateString('pt-BR')}` : 'Ciclo Inicial'}
                          </span>
                        </div>
                      </td>
                      <td className="text-right font-black text-foreground">{seller.qtdPedidos}</td>
                      <td className="text-right font-black text-emerald-500">{formatCurrency(seller.totalVendas)}</td>
                      <td className="text-right font-black text-destructive">{formatCurrency(seller.valoresEmAberto)}</td>
                      <td className="text-right text-muted-foreground font-bold">{formatCurrency(seller.valorMedio)}</td>
                      <td className="text-center">
                        <span className={`inline-flex items-center justify-center min-w-[24px] h-6 rounded-lg text-[10px] font-black ${seller.pedidosAguardandoFinanceiro > 0
                          ? 'bg-warning/20 text-warning'
                          : 'bg-muted/30 text-muted-foreground'
                          }`}>
                          {seller.pedidosAguardandoFinanceiro}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                           {seller.valoresEmAberto === 0 && seller.totalVendas > 0 ? (
                             <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                           ) : (
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                           )}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedSeller(seller.sellerId)}
                            className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {showClosingMode && (
                            <button
                              onClick={() => handleCloseMonth(seller)}
                              className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                              title="Fechar Mês"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSellers.length === 0 && (
              <div className="py-20 text-center bg-muted/5">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                   <Search className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="font-black text-foreground uppercase tracking-widest">Nenhum vendedor encontrado</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Tente ajustar o termo de busca para localizar o registro.</p>
              </div>
            )}
          </div>

          {/* Resumo Total */}
          <div className="card-section p-8 border-primary/20 bg-primary/[0.01]">
            <h3 className="font-black text-foreground uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Resumo Geral do Período Atual
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Vendedores Ativos', value: sellerStats.length.toString(), color: 'text-primary', icon: Users2 },
                { label: 'Pedidos no Ciclo', value: sellerStats.reduce((s, st) => s + st.qtdPedidos, 0).toString(), color: 'text-info', icon: ShoppingCart },
                { label: 'Vendas Totais', value: formatCurrency(sellerStats.reduce((s, st) => s + st.totalVendas, 0)), color: 'text-emerald-500', icon: DollarSign },
                { label: 'Aberto Total', value: formatCurrency(sellerStats.reduce((s, st) => s + st.valoresEmAberto, 0)), color: 'text-destructive', icon: AlertCircle },
              ].map((card, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${card.color.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0`}>
                     {React.createElement(card.icon as any, { className: `w-6 h-6 ${card.color}` })}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{card.label}</p>
                    <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* HISTÓRICO DE FECHAMENTOS */
        <div className="space-y-6 animate-fade-in">
           {needsFix && (
             <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <AlertCircle className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">Fechamentos sem métricas novas</p>
                      <p className="text-xs text-muted-foreground">Existem fechamentos antigos que ainda não possuem contagem de itens e estribos.</p>
                   </div>
                </div>
                <button
                  onClick={handleFixOldClosings}
                  disabled={isFixing}
                  className="btn-modern bg-primary text-white text-xs font-black shadow-lg shadow-primary/20"
                >
                  {isFixing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  CORRIGIR E ATUALIZAR TODOS
                </button>
             </div>
           )}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monthlyClosings.length === 0 ? (
                <div className="col-span-full py-20 text-center glass-card border-dashed">
                    <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="font-black text-foreground uppercase tracking-widest text-sm">Nenhum fechamento registrado</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Os fechamentos mensais realizados no modo de controle aparecerão listados aqui por ordem cronológica.</p>
                </div>
              ) : (
                monthlyClosings.map(closing => (
                  <div key={closing.id} className="glass-card p-6 border-border/10 hover:shadow-xl transition-all group/card relative">
                     <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                           <Lock className="w-5 h-5" />
                        </div>
                         <div className="flex flex-col items-end gap-2">
                           <span className="text-[10px] font-black bg-muted px-2 py-1 rounded text-muted-foreground uppercase tracking-widest border border-border/40 mb-2">
                             Ref: {closing.referenceMonth}
                           </span>
                           <div className="flex gap-2">
                              <button
                                onClick={() => handlePrintHistoricalItems(closing)}
                                className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center hover:bg-info hover:text-white transition-all shadow-sm"
                                title="Baixar Lista de Itens"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  // 🔥 Forçamos a geração local para garantir que as novas métricas (Estribos e Total de Produtos) 
                                  // apareçam no PDF, mesmo em fechamentos antigos que foram "corrigidos".
                                  generateClosingPDF({
                                    sellerName: closing.sellerName,
                                    referenceMonth: closing.referenceMonth,
                                    closingDate: closing.closingDate,
                                    totalSold: closing.totalSold,
                                    orderCount: closing.orderCount,
                                    outstandingValue: closing.outstandingValue,
                                    kitsComSensor: closing.details?.kitsComSensor || 0,
                                    kitsSemSensor: closing.details?.kitsSemSensor || 0,
                                    premios: closing.details?.premios || 0,
                                    totalProducts: closing.details?.totalItems || 0,
                                    estribos: closing.details?.estribos || 0
                                  });
                                }}
                                className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title="Gerar PDF Atualizado"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                           </div>
                         </div>
                     </div>
                     
                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Vendedor</p>
                           <p className="text-lg font-black text-foreground">{closing.sellerName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[10px] text-muted-foreground font-bold mb-1">Total Vendido</p>
                              <p className="text-base font-black text-emerald-500">{formatCurrency(closing.totalSold)}</p>
                           </div>
                           <div>
                              <p className="text-[10px] text-muted-foreground font-bold mb-1">Pedidos</p>
                              <p className="text-base font-black text-foreground">{closing.orderCount}</p>
                           </div>
                        </div>

                        {/* Detalhes específicos do PDF no Card também */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/5">
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground" title="Kits Com Sensor">
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              {closing.details?.kitsComSensor || 0} COM
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground" title="Kits Sem Sensor">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              {closing.details?.kitsSemSensor || 0} SEM
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground" title="Total de Produtos (excl. brindes)">
                              <FileText className="w-3 h-3 text-info" />
                              {closing.details?.totalItems || 0} PROD
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground" title="Estribos">
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                              {closing.details?.estribos || 0} ESTRIBOS
                           </div>
                        </div>

                        <div className="pt-4 border-t border-border/10 flex items-center justify-between text-[10px] text-muted-foreground font-bold italic">
                           <span>Realizado em:</span>
                           <span>{new Date(closing.closingDate).toLocaleString('pt-BR')}</span>
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// Placeholder para ícones que não foram importados mas usados no loop
const Users2 = (props: any) => <TrendingUp {...props} />;
const ShoppingCart = (props: any) => <CheckCircle2 {...props} />;
const DollarSign = (props: any) => <TrendingUp {...props} />;

export default VendedoresControlPage;
