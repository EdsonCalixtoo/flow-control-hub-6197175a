import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { Search, TrendingUp, Eye, ArrowLeft } from 'lucide-react';
import type { Order } from '@/types/erp';

const VendedoresControlPage: React.FC = () => {
  const { orders, clients, financialEntries } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'totalVendas' | 'qtdPedidos' | 'name'>('totalVendas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
      comissaoEstimada: number;
      valorMedio: number;
      orders: Order[];
    }> = {};

    orders.forEach(order => {
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
          comissaoEstimada: 0,
          valorMedio: 0,
          orders: [],
        };
      }

      stats[key].totalVendas += order.total;
      stats[key].qtdPedidos += 1;
      stats[key].orders.push(order);
      stats[key].comissaoEstimada += order.total * 0.05; // 5% de comissão

      if (order.status === 'aguardando_financeiro') stats[key].pedidosAguardandoFinanceiro += 1;
      if (order.status === 'aprovado_financeiro') stats[key].pedidosAprovados += 1;
      if (order.status === 'em_producao') stats[key].pedidosEmProducao += 1;
      if (order.status === 'produto_liberado') stats[key].pedidosEntregues += 1;
    });

    Object.values(stats).forEach(stat => {
      stat.valorMedio = stat.qtdPedidos > 0 ? stat.totalVendas / stat.qtdPedidos : 0;
    });

    return Object.values(stats);
  }, [orders]);

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
          <div>
            <h1 className="page-header">{seller.name}</h1>
            <p className="page-subtitle">Detalhes de vendas e comissões</p>
          </div>
          <button onClick={() => setSelectedSeller(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Vendido', value: formatCurrency(seller.totalVendas), color: 'text-success' },
            { label: 'Qtd Pedidos', value: seller.qtdPedidos.toString(), color: 'text-primary' },
            { label: 'Valor Médio', value: formatCurrency(seller.valorMedio), color: 'text-info' },
            { label: 'Comissão (5%)', value: formatCurrency(seller.comissaoEstimada), color: 'text-amber-500' },
            { label: 'Sinc. Financeiro', value: seller.pedidosAguardandoFinanceiro.toString(), color: 'text-warning' },
          ].map((card, i) => (
            <div key={i} className="stat-card">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium truncate">{card.label}</p>
                <p className={`text-lg font-extrabold ${card.color} truncate`}>{card.value}</p>
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
        <div className="card-section p-6">
          <h2 className="card-section-title mb-4">Pedidos do Vendedor</h2>
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sellerOrders.map(order => (
                  <tr key={order.id}>
                    <td className="font-semibold text-foreground">{order.number}</td>
                    <td className="text-muted-foreground">{order.clientName}</td>
                    <td className="text-sm">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="text-right font-bold text-foreground">{formatCurrency(order.total)}</td>
                    <td>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'aguardando_financeiro' ? 'bg-warning/20 text-warning' :
                        order.status === 'aprovado_financeiro' ? 'bg-success/20 text-success' :
                        order.status === 'em_producao' ? 'bg-info/20 text-info' :
                        order.status === 'produto_liberado' ? 'bg-primary/20 text-primary' :
                        'bg-muted/30 text-muted-foreground'
                      }`}>
                        {order.status.replace(/_/g, ' ').toUpperCase()}
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
  }

  // Lista de Vendedores
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Controle por Vendedor</h1>
          <p className="page-subtitle">Monitore vendas, comissões e performance</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Buscar vendedor..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-modern pl-11 w-full"
        />
      </div>

      {/* Tabela de Vendedores */}
      <div className="card-section p-6">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th className="cursor-pointer hover:text-primary" onClick={() => handleSort('name')}>
                  Vendedor {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('qtdPedidos')}>
                  Qtd Pedidos {sortBy === 'qtdPedidos' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('totalVendas')}>
                  Total Vendido {sortBy === 'totalVendas' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right">Valor Médio</th>
                <th className="text-right">Comissão (5%)</th>
                <th className="text-center">Aguardando</th>
                <th className="text-center">Aprovados</th>
                <th className="text-center">Entregues</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map(seller => (
                <tr key={seller.sellerId} className="hover:bg-muted/20 transition-colors">
                  <td className="font-semibold text-foreground">{seller.name}</td>
                  <td className="text-right font-semibold text-foreground">{seller.qtdPedidos}</td>
                  <td className="text-right font-bold text-success">{formatCurrency(seller.totalVendas)}</td>
                  <td className="text-right text-foreground">{formatCurrency(seller.valorMedio)}</td>
                  <td className="text-right font-bold text-amber-500">{formatCurrency(seller.comissaoEstimada)}</td>
                  <td className="text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      seller.pedidosAguardandoFinanceiro > 0
                        ? 'bg-warning/20 text-warning'
                        : 'bg-muted/30 text-muted-foreground'
                    }`}>
                      {seller.pedidosAguardandoFinanceiro}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      seller.pedidosAprovados > 0
                        ? 'bg-success/20 text-success'
                        : 'bg-muted/30 text-muted-foreground'
                    }`}>
                      {seller.pedidosAprovados}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      seller.pedidosEntregues > 0
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/30 text-muted-foreground'
                    }`}>
                      {seller.pedidosEntregues}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => setSelectedSeller(seller.sellerId)}
                      className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-2 py-1 hover:bg-primary/20"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSellers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum vendedor encontrado
          </div>
        )}
      </div>

      {/* Resumo Total */}
      <div className="card-section p-6">
        <h3 className="font-bold text-foreground mb-4">Resumo Geral</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total de Vendedores', value: sellerStats.length.toString(), color: 'text-primary' },
            { label: 'Total de Pedidos', value: orders.length.toString(), color: 'text-info' },
            { label: 'Total de Vendas', value: formatCurrency(orders.reduce((s, o) => s + o.total, 0)), color: 'text-success' },
            { label: 'Comissões (5%)', value: formatCurrency(orders.reduce((s, o) => s + (o.total * 0.05), 0)), color: 'text-amber-500' },
            { label: 'Aguardando Financeiro', value: orders.filter(o => o.status === 'aguardando_financeiro').length.toString(), color: 'text-warning' },
          ].map((card, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendedoresControlPage;
