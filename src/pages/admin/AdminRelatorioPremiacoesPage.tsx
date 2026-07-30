import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Download, Gift, CalendarDays, Loader2, Search, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RewardItem {
  id: string; // Order item doesn't have an ID usually, we will make one up
  seller: string;
  client: string;
  orderNumber: string;
  product: string;
  date: string;
  quantity: number;
  rewardType: string;
}

interface GroupedBySeller {
  [sellerName: string]: {
    total: number;
    items: RewardItem[];
    expanded?: boolean;
  };
}

interface GroupedByMonth {
  [monthYear: string]: RewardItem[];
}

interface AvailableReward {
  id: string;
  client: string;
  rewardType: string;
  date: string;
}

export function AdminRelatorioPremiacoesPage() {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'seller' | 'month' | 'available' | 'client'>('seller');
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({});
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [availableRewards, setAvailableRewards] = useState<AvailableReward[]>([]);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('users').select('id, name');
      const userMap: Record<string, string> = {};
      if (usersData) {
        usersData.forEach(u => userMap[u.id] = u.name);
      }

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('id, number, seller_name, seller_id, client_name, items, status, created_at, is_warranty, notes, observation')
        .not('status', 'in', '("rascunho","orcamento","rejeitado_financeiro","cancelado")');

      if (error) throw error;
      
      const extractedRewards: RewardItem[] = [];

      (ordersData || []).forEach(order => {
        let seller = order.seller_name || userMap[order.seller_id] || 'Desconhecido';
        
        // Consolidar Delly
        if (seller.toLowerCase().includes('delly')) {
          seller = 'Delly Soutto';
        } else {
          seller = seller.trim();
          seller = seller.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }

        const items = Array.isArray(order.items) ? order.items : [];
        
        items.forEach((item: any, index: number) => {
          const prodName = (item.product || '').toUpperCase();
          const desc = (item.description || '').toUpperCase();
          const notes = (order.notes || '').toUpperCase();
          
          const obs = (order.observation || '').toUpperCase();
          
          const isReward = 
             item.isReward ||
             prodName.includes('PRÊMIO') || prodName.includes('PREMIO') || 
             desc.includes('PRÊMIO') || desc.includes('PREMIO') || 
             notes.includes('PRÊMIO') || notes.includes('PREMIO') ||
             obs.includes('PRÊMIO') || obs.includes('PREMIO') ||
             ((Number(item.unitPrice) === 0 || Number(item.total) === 0) && !order.is_warranty);

          if (isReward) {
             let rType = 'tier_2';
             if (prodName.includes('CAMERA') || prodName.includes('CÂMERA')) rType = 'tier_1';

             extractedRewards.push({
               id: `${order.id}-${index}`,
               seller,
               client: order.client_name || 'Desconhecido',
               orderNumber: order.number || 'S/N',
               product: item.product || 'Prêmio',
               date: order.created_at,
               quantity: item.quantity || 1,
               rewardType: rType
             });
          }
        });
      });

      // Ordenar por data mais recente
      extractedRewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRewards(extractedRewards);

      // Buscar prêmios disponíveis
      const { data: clientsData } = await supabase.from('clients').select('id, name');
      const clientMap: Record<string, string> = {};
      if (clientsData) {
         clientsData.forEach(c => clientMap[c.id] = c.name);
      }

      const { data: availableData, error: err2 } = await supabase
        .from('client_rewards')
        .select('*')
        .eq('reward_status', 'liberado');
      
      if (!err2 && availableData) {
          const avail = availableData.map(r => ({
              id: r.id,
              client: clientMap[r.client_id] || 'Desconhecido',
              rewardType: r.reward_type,
              date: r.created_at
          }));
          avail.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setAvailableRewards(avail);
      }

    } catch (error) {
      console.error('Erro ao buscar premiações:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeller = (seller: string) => {
    setExpandedSellers(prev => ({ ...prev, [seller]: !prev[seller] }));
  };

  const toggleClient = (client: string) => {
    setExpandedClients(prev => ({ ...prev, [client]: !prev[client] }));
  };

  const getRewardBadge = (type: string) => {
    switch (type) {
      case 'tier_1': return <span className="px-3 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-xs font-bold uppercase tracking-wide">Bronze</span>;
      case 'tier_2': return <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-300 rounded-full text-xs font-bold uppercase tracking-wide">Prata</span>;
      case 'tier_3': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-full text-xs font-bold uppercase tracking-wide">Ouro</span>;
      default: return <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wide">Prêmio</span>;
    }
  };

  const getRewardName = (type: string) => {
    switch (type) {
      case 'tier_1': return 'BRONZE';
      case 'tier_2': return 'PRATA';
      case 'tier_3': return 'OURO';
      default: return 'PRÊMIO';
    }
  };

  const filteredRewards = rewards.filter(r => 
    r.client.toLowerCase().includes(search.toLowerCase()) ||
    r.seller.toLowerCase().includes(search.toLowerCase()) ||
    r.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.product.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAvailable = availableRewards.filter(r => 
    r.client.toLowerCase().includes(search.toLowerCase()) ||
    getRewardName(r.rewardType).toLowerCase().includes(search.toLowerCase())
  );

  const groupedBySeller = filteredRewards.reduce((acc, curr) => {
    if (!acc[curr.seller]) {
      acc[curr.seller] = { total: 0, items: [] };
    }
    acc[curr.seller].total += curr.quantity;
    acc[curr.seller].items.push(curr);
    return acc;
  }, {} as GroupedBySeller);

  // Ordenar vendedores pelo total de prêmios
  const sortedSellers = Object.entries(groupedBySeller).sort((a, b) => b[1].total - a[1].total);

  const groupedByMonth = filteredRewards.reduce((acc, curr) => {
    const date = curr.date ? parseISO(curr.date) : new Date();
    const monthYear = format(date, 'MMMM / yyyy', { locale: ptBR });
    
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {} as GroupedByMonth);

  const groupedByClient = filteredRewards.reduce((acc, curr) => {
    if (!acc[curr.client]) {
      acc[curr.client] = { total: 0, items: [] };
    }
    acc[curr.client].total += curr.quantity;
    acc[curr.client].items.push(curr);
    return acc;
  }, {} as GroupedBySeller);

  const sortedClients = Object.entries(groupedByClient).sort((a, b) => b[1].total - a[1].total);

  const groupedAvailableByClient = filteredAvailable.reduce((acc, curr) => {
    if (!acc[curr.client]) {
      acc[curr.client] = { total: 0, items: [] };
    }
    acc[curr.client].total += 1;
    acc[curr.client].items.push(curr);
    return acc;
  }, {} as Record<string, { total: number, items: AvailableReward[] }>);

  const sortedAvailableClients = Object.entries(groupedAvailableByClient).sort((a, b) => b[1].total - a[1].total);

  const generatePDF = () => {
    if (activeTab !== 'available' && filteredRewards.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
    }
    if (activeTab === 'available' && filteredAvailable.length === 0) {
        alert("Nenhum prêmio disponível para exportar.");
        return;
    }

    const html = `
    <html>
    <head>
        <title>Relatório de Premiações Resgatadas</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; background-color: #fff; }
            .header { text-align: center; margin-bottom: 50px; border-bottom: 2px solid #3b82f6; padding-bottom: 30px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
            .header p { margin: 12px 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
            .month-group { margin-bottom: 50px; }
            .month-title { background: #f8fafc; padding: 16px 24px; font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 6px solid #3b82f6; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); page-break-after: avoid; }
            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; font-size: 14px; }
            th, td { padding: 16px 20px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #fff; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 2px solid #cbd5e1; }
            tr { page-break-inside: avoid; }
            tr:hover { background-color: #f8fafc; }
            .reward-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-tier_1 { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-tier_2 { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            .badge-tier_3 { background: #fef08a; color: #854d0e; border: 1px solid #fde047; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
                body { padding: 20px; }
                .month-title { box-shadow: none; border: 1px solid #e2e8f0; border-left: 6px solid #3b82f6; page-break-after: avoid; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório de Premiações</h1>
            <p>Visão ${activeTab === 'seller' ? 'Por Vendedor' : activeTab === 'month' ? 'Mensal' : activeTab === 'client' ? 'Por Cliente' : 'Disponíveis para Resgate'}</p>
            <p>Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}</p>
        </div>

        ${activeTab === 'seller' ? sortedSellers.map(([seller, data]) => `
            <div class="month-group">
                <div class="month-title">
                    <span>${seller}</span>
                    <span style="font-size: 14px; color: #3b82f6;">${data.total} resgates no total</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Data</th>
                            <th style="width: 15%;">Pedido</th>
                            <th style="width: 30%;">Cliente</th>
                            <th style="width: 30%;">Produto</th>
                            <th style="width: 10%;">Qtd</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td><strong style="color: #475569;">${format(parseISO(item.date), "dd/MM/yyyy")}</strong></td>
                                <td><strong style="color: #3b82f6;">${item.orderNumber}</strong></td>
                                <td><strong style="font-size: 15px;">${item.client}</strong></td>
                                <td>${item.product}</td>
                                <td><strong>${item.quantity}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('') : activeTab === 'client' ? sortedClients.map(([client, data]) => `
            <div class="month-group">
                <div class="month-title">
                    <span>${client}</span>
                    <span style="font-size: 14px; color: #3b82f6;">${data.total} resgates no total</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Data</th>
                            <th style="width: 15%;">Pedido</th>
                            <th style="width: 30%;">Vendedor</th>
                            <th style="width: 30%;">Produto</th>
                            <th style="width: 10%;">Qtd</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td><strong style="color: #475569;">${format(parseISO(item.date), "dd/MM/yyyy")}</strong></td>
                                <td><strong style="color: #3b82f6;">${item.orderNumber}</strong></td>
                                <td><strong style="font-size: 15px;">${item.seller}</strong></td>
                                <td>${item.product}</td>
                                <td><strong>${item.quantity}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('') : activeTab === 'month' ? Object.entries(groupedByMonth).map(([month, items]) => `
            <div class="month-group">
                <div class="month-title">
                    <span>${month}</span>
                    <span style="font-size: 14px; color: #3b82f6;">${items.length} resgates neste mês</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%;">Data</th>
                            <th style="width: 20%;">Vendedor</th>
                            <th style="width: 15%;">Pedido</th>
                            <th style="width: 25%;">Cliente</th>
                            <th style="width: 25%;">Produto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td><strong style="color: #475569;">${format(parseISO(item.date), "dd/MM/yyyy")}</strong></td>
                                <td>${item.seller}</td>
                                <td><strong style="color: #3b82f6;">${item.orderNumber}</strong></td>
                                <td><strong style="font-size: 15px;">${item.client}</strong></td>
                                <td>${item.product}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('') : activeTab === 'available' ? `
            <div class="month-group">
                <div class="month-title">
                    <span>Prêmios Pendentes de Resgate</span>
                    <span style="font-size: 14px; color: #3b82f6;">${sortedAvailableClients.length} clientes aguardando</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%;">Cliente Beneficiado</th>
                            <th style="width: 30%;">Prêmios</th>
                            <th style="width: 20%;">Qtd Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedAvailableClients.map(([client, data]) => `
                            <tr>
                                <td><strong style="font-size: 15px;">${client}</strong></td>
                                <td>
                                    ${data.items.map(r => `<span class="reward-badge badge-${r.rewardType}">${getRewardName(r.rewardType)}</span>`).join(' ')}
                                </td>
                                <td><strong style="color: #3b82f6; font-size: 16px;">${data.total}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}

        <div class="footer">
            Sistema de Gestão Automatiza • Relatório Oficial
        </div>
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    setTimeout(window.close, 1000);
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        alert("Por favor, permita pop-ups para gerar o PDF.");
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-card/50 backdrop-blur-sm border-2 border-border/50 p-4 sm:p-6 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-muted/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Gift className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight">
                Relatório de Premiações
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
                Acompanhe o histórico de prêmios entregues aos clientes.
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={generatePDF}
          disabled={loading || (activeTab !== 'available' && filteredRewards.length === 0) || (activeTab === 'available' && filteredAvailable.length === 0)}
          className="w-full sm:w-auto h-12 px-6 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download className="w-5 h-5" />
          Exportar PDF
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background p-2 rounded-2xl shadow-sm border border-border/50">
          <div className="flex flex-wrap w-full md:w-auto gap-2 p-1 bg-muted/30 rounded-xl">
             <button 
                onClick={() => setActiveTab('seller')}
                className={`flex-1 sm:w-auto min-w-[120px] py-2.5 px-4 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'seller' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
             >
                 <Users className="w-4 h-4" />
                 Por Vendedor
             </button>
             <button 
                onClick={() => setActiveTab('client')}
                className={`flex-1 sm:w-auto min-w-[120px] py-2.5 px-4 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'client' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
             >
                 <Users className="w-4 h-4" />
                 Por Cliente
             </button>
             <button 
                onClick={() => setActiveTab('month')}
                className={`flex-1 sm:w-auto min-w-[120px] py-2.5 px-4 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'month' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
             >
                 <CalendarDays className="w-4 h-4" />
                 Visão Mensal
             </button>
             <button 
                onClick={() => setActiveTab('available')}
                className={`flex-1 sm:w-auto min-w-[120px] py-2.5 px-4 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'available' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:bg-white/50'}`}
             >
                 <Gift className="w-4 h-4" />
                 Liberados <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-xs">{availableRewards.length}</span>
             </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar pedido, vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-muted/20 border-2 border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/50 rounded-[2rem] border-2 border-border/50">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Carregando histórico completo...
          </p>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/50 rounded-[2rem] border-2 border-border/50">
          <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
             <Gift className="w-10 h-10 text-primary/30" />
          </div>
          <p className="text-xl font-bold text-foreground">Nenhum resgate encontrado</p>
          <p className="text-muted-foreground font-medium mt-1">
            {search ? 'Nenhum prêmio bate com sua pesquisa.' : 'Ainda não há prêmios registrados no sistema.'}
          </p>
        </div>
      ) : activeTab === 'seller' ? (
        <div className="space-y-4">
            {sortedSellers.map(([seller, data]) => (
                <div key={seller} className="bg-card rounded-[1.5rem] shadow-sm border border-border/50 overflow-hidden transition-all hover:border-primary/20">
                    <button 
                        onClick={() => toggleSeller(seller)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r hover:from-primary/[0.02] hover:to-transparent transition-colors text-left"
                    >
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-foreground">{seller}</h3>
                                <p className="text-sm text-muted-foreground font-medium mt-0.5">Vendedor</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="text-right">
                                <div className="text-2xl font-black text-primary">{data.total}</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prêmios Totais</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                                {expandedSellers[seller] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </button>
                    
                    {expandedSellers[seller] && (
                        <div className="border-t border-border/50 bg-muted/10 p-5 sm:p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                                            <th className="pb-3 px-4 font-bold text-[11px]">Data</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Pedido</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Cliente</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Produto Resgatado</th>
                                            <th className="pb-3 px-4 font-bold text-[11px] text-center">Qtd</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.items.map(item => (
                                            <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                                <td className="py-4 px-4 whitespace-nowrap text-muted-foreground font-medium">
                                                    {format(parseISO(item.date), "dd/MM/yyyy")}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <span className="text-primary font-bold">{item.orderNumber}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="font-bold text-foreground block max-w-[200px] truncate">{item.client}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-foreground font-medium">{item.product}</span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="font-black text-foreground">{item.quantity}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      ) : activeTab === 'client' ? (
        <div className="space-y-4">
            {sortedClients.map(([client, data]) => (
                <div key={client} className="bg-card rounded-[1.5rem] shadow-sm border border-border/50 overflow-hidden transition-all hover:border-primary/20">
                    <button 
                        onClick={() => toggleClient(client)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r hover:from-primary/[0.02] hover:to-transparent transition-colors text-left"
                    >
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-foreground">{client}</h3>
                                <p className="text-sm text-muted-foreground font-medium mt-0.5">Cliente</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="text-right">
                                <div className="text-2xl font-black text-primary">{data.total}</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prêmios Totais</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
                                {expandedClients[client] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </button>
                    
                    {expandedClients[client] && (
                        <div className="border-t border-border/50 bg-muted/10 p-5 sm:p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                                            <th className="pb-3 px-4 font-bold text-[11px]">Data</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Pedido</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Vendedor</th>
                                            <th className="pb-3 px-4 font-bold text-[11px]">Produto Resgatado</th>
                                            <th className="pb-3 px-4 font-bold text-[11px] text-center">Qtd</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.items.map(item => (
                                            <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                                <td className="py-4 px-4 whitespace-nowrap text-muted-foreground font-medium">
                                                    {format(parseISO(item.date), "dd/MM/yyyy")}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <span className="text-primary font-bold">{item.orderNumber}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="font-bold text-foreground block max-w-[200px] truncate">{item.seller}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-foreground font-medium">{item.product}</span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="font-black text-foreground">{item.quantity}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      ) : activeTab === 'available' ? (
        <div className="bg-card rounded-[2rem] shadow-sm border border-border/50 overflow-hidden">
          <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Gift className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Pendentes de Resgate</h3>
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wide">
              {filteredAvailable.length} disponíveis
            </div>
          </div>
          
          <div className="p-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold text-[11px]">Cliente Beneficiado</th>
                    <th className="px-4 py-3 font-bold text-[11px]">Prêmios</th>
                    <th className="px-4 py-3 font-bold text-[11px] text-center">Quantidade Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAvailableClients.map(([client, data]) => (
                    <tr key={client} className="group hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                      <td className="px-4 py-4">
                        <span className="font-bold text-foreground block">{client}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {data.items.map(r => (
                             <div key={r.id} className="flex items-center gap-2 mb-1">
                               {getRewardBadge(r.rewardType)}
                               <span className="text-muted-foreground text-xs">{format(parseISO(r.date), "dd/MM/yyyy")}</span>
                             </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-black text-primary text-lg">{data.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, items]) => (
            <div key={month} className="bg-card rounded-[2rem] shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{month}</h3>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wide">
                  {items.length} resgate{items.length > 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="p-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-muted-foreground font-bold uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-[11px]">Data</th>
                        <th className="px-4 py-3 font-bold text-[11px]">Vendedor</th>
                        <th className="px-4 py-3 font-bold text-[11px]">Pedido</th>
                        <th className="px-4 py-3 font-bold text-[11px]">Cliente Beneficiado</th>
                        <th className="px-4 py-3 font-bold text-[11px]">Prêmio Resgatado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="group hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                              {format(parseISO(item.date), "dd/MM/yyyy HH:mm")}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-bold text-slate-600 block max-w-[150px] truncate" title={item.seller}>
                              {item.seller}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-primary font-bold">
                              {item.orderNumber}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-foreground block max-w-[200px] truncate" title={item.client}>
                              {item.client}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {getRewardBadge(item.rewardType)}
                              <span className="text-muted-foreground font-medium truncate max-w-[250px]" title={item.product}>
                                {item.product}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
