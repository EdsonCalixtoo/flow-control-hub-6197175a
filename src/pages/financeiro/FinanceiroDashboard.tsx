import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useERP } from '@/contexts/ERPContext';
import { StatCard, StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { RealtimeNotificationHandler } from '@/components/shared/RealtimeNotificationHandler';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Send, ArrowLeft, Users2, BarChart3, Radio, Star, Plus, Trash2, Inbox, Bell, FileText, Package, Info, BadgeCheck, MapPin, Box, CreditCard, Image as ImageIcon, Maximize2, Edit3, RotateCcw, Download } from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { uploadToR2, generateR2Path, cleanR2Url } from '@/lib/storageServiceR2';
import { generateFinanceiroDashboardPDF } from '@/lib/pdfClosingGenerator';
import { toast } from 'sonner';
import type { Order, FinancialEntry } from '@/types/erp';

// Status que devem aparecer no financeiro (apenas quando o vendedor clicou em Enviar)
// Fluxo simplificado: Financeiro aprova e envia direto para Produção (sem Gestor)
const STATUS_VISIVEL_FINANCEIRO = [
  'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
  'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
];

type PaymentFilter = 'todos' | 'pago' | 'pendente' | 'vencido' | 'cancelado';
type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado' | 'todos';
type Tab = 'pedidos' | 'vendedores';

interface FinanceiroDashboardProps {
  defaultTab?: 'pedidos' | 'vendedores' | 'carenagem';
}

const FinanceiroDashboard: React.FC<FinanceiroDashboardProps> = ({ defaultTab = 'pedidos' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { orders, clients, financialEntries, products, monthlyClosings, updateOrderStatus, updateOrder, updateFinancialEntry, addFinancialEntry, loadFromSupabase, loadOrderDetails } = useERP();
  const [activeTab, setActiveTab] = useState<'pedidos' | 'vendedores' | 'carenagem'>(defaultTab);
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'number' | 'clientName' | 'total' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);

  // ⚡ OTIMIZAÇÃO: Carregamento sob demanda para economizar egress
  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetails(selectedOrderId);
    }
  }, [selectedOrderId, loadOrderDetails]);
  const [showFilters, setShowFilters] = useState(false);
  const [sellerPeriod, setSellerPeriod] = useState<PeriodFilter>('todos');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showConsignados, setShowConsignados] = useState(false);
  const [showInstallations, setShowInstallations] = useState(false);
  const [showRetiradas, setShowRetiradas] = useState(false);
  const [showRecebido, setShowRecebido] = useState(false);
  const [showAguardandoAprovacao, setShowAguardandoAprovacao] = useState(false);
  const [showAReceber, setShowAReceber] = useState(false);
  const [showAguardandoProducao, setShowAguardandoProducao] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Pagamentos parciais (consignado)
  const [novoPagValor, setNovoPagValor] = useState('');
  const [novoPagComprovantes, setNovoPagComprovantes] = useState<string[]>([]);
  const [novoPagDescricao, setNovoPagDescricao] = useState('');
  const [novoPagTransactionId, setNovoPagTransactionId] = useState('');
  const [novoPagCardDigits, setNovoPagCardDigits] = useState('');
  const [salvandoPag, setSalvandoPag] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempItems, setTempItems] = useState<any[]>([]);
  const [tempTaxes, setTempTaxes] = useState(0);
  const [deletingReceipt, setDeletingReceipt] = useState<{ url: string; title: string; category: string; financialEntryId?: string; index?: number; source: 'order_main' | 'order_urls' | 'financial_main' | 'financial_urls' } | null>(null);
  const [confirmStep, setConfirmStep] = useState(1);
  const itemsPerPage = 50;

  // Estados para edição de lançamentos financeiros (correção de erros)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryAmount, setEditingEntryAmount] = useState('');
  const [editingEntryDescription, setEditingEntryDescription] = useState('');
  const [showQuickAdjust, setShowQuickAdjust] = useState<'recebido' | 'saldo' | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // ✅ Filtra APENAS pedidos que foram enviados ao financeiro
  // Rascunhos e orçamentos não enviados NÃO aparecem aqui
  const ordersVisiveisFinanceiro = useMemo(
    () => orders.filter(o => 
      STATUS_VISIVEL_FINANCEIRO.includes(o.status) && 
      (!o.isWarranty ? (o.total > 0 || o.items.some(item => item.isReward)) : true)
    ),
    [orders, STATUS_VISIVEL_FINANCEIRO]
  );

  // Atualiza indicador de último refresh quando orders mudam
  const prevOrdersLen = useRef(orders.length);
  useEffect(() => {
    if (orders.length !== prevOrdersLen.current) {
      setLastUpdate(new Date());
      prevOrdersLen.current = orders.length;
    }
  }, [orders]);

  // 📡 Monitora em tempo real quando novos pedidos chegam ou comprovantes são atualizados
  const handleOrderRealtime = useCallback((event: any) => {
    // Busca o pedido no estado local atual para comparar
    const existingOrder = orders.find(o => o.id === event.order.id);
    const wasAlreadySeen = existingOrder && (event.order.receiptUrls?.length || 0) <= (existingOrder.receiptUrls?.length || 0);

    const isNewStatusForFinanceiro =
      (event.type === 'INSERT' && event.order.status === 'aguardando_financeiro') ||
      (event.type === 'UPDATE' && event.previousStatus !== 'aguardando_financeiro' && event.order.status === 'aguardando_financeiro');

    const isNewReceipt = event.type === 'UPDATE' && !wasAlreadySeen && event.order.status !== 'rascunho';

    if (isNewStatusForFinanceiro || isNewReceipt) {
      setNotificationCount(prev => prev + 1);
      
      const msg = isNewStatusForFinanceiro 
        ? `🔔 Novo Pedido #${event.order.number}` 
        : `💰 Novo Comprovante no Pedido #${event.order.number}`;
      
      toast.info(msg, {
        description: `Cliente: ${event.order.clientName}. Clique para ver.`,
        duration: 5000,
        action: {
          label: 'Ver Agora',
          onClick: () => {
            setSelectedOrderId(event.order.id);
            setNotificationCount(prev => Math.max(0, prev - 1));
          }
        }
      });
      
      console.log(`[FinanceiroDashboard] 🔔 ${msg} - Tempo Real`);
      setLastUpdate(new Date());
    } else if (event.type === 'UPDATE' || event.type === 'INSERT') {
      setLastUpdate(new Date());
    }

    // Carrega a lista com um pequeno delay para garantir que o banco já processou as inserções
    setTimeout(() => {
      loadFromSupabase?.();
    }, 1500);
  }, [loadFromSupabase, orders]);


  const statusesWatch = useMemo(() => ['aguardando_financeiro'], []);

  useRealtimeOrders(handleOrderRealtime, statusesWatch);

  const totalRecebido = useMemo(() =>
    financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').reduce((s, e) => s + e.amount, 0)
    , [financialEntries]);

  // Função para calcular saldo devedor de um pedido - VERSÃO BLINDADA E FUZZY
  const getSaldoDevedor = (orderId: string, orderTotal: number, paymentStatus?: string, orderNumber?: string) => {
    // Se o status já é PAGO, o saldo devedor é ABSOLUTAMENTE zero
    if (paymentStatus?.toLowerCase() === 'pago') return 0;

    const cleanNum = (n: string) => n.replace('#', '').trim().toLowerCase();
    const targetNum = orderNumber ? cleanNum(orderNumber) : null;

    // ✅ CRUCIAL: Busca pagamentos por ID ou por Número Limpo (PED-024 === #PED-024)
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
    
    // ✅ TRATAMENTO DE CENTAVOS: Saldo menor que 0.10 é considerado quitado
    if (saldoRaw < 0.10) return 0;
    
    return saldoRaw;
  };

  const isOrderCarenagem = useCallback((order: Order) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.some(item => {
      // 1. Busca por categoria no produto (robusto)
      const productName = (item.product || '').trim().toLowerCase();
      const product = (products || []).find(p =>
        p.name.trim().toLowerCase() === productName ||
        p.sku.trim().toLowerCase() === productName ||
        (item.description && p.description?.toLowerCase() === item.description.toLowerCase())
      );

      if (product?.category === 'Carenagem') return true;

      // 2. Fallback: Palavras-chave no nome do produto ou descrição
      const keywords = ['side skirt', 'carenagem', 'saia lateral'];
      const hasKeyword = keywords.some(k =>
        productName.includes(k) ||
        (item.description || '').toLowerCase().includes(k)
      );

      if (hasKeyword) return true;

      // 3. Fallback: SKU começando com SS (Side Skirt)
      const sku = (product?.sku || item.product || '').toUpperCase();
      if (sku.startsWith('SS-')) return true;

      return false;
    });
  }, [products]);

  const totalPendenteNormal = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro')
      .filter(o => {
        if (isOrderCarenagem(o)) return false;
        
        // UNIFICAÇÃO: Mesma lógica da lista detalhada
        const isConsigned = o.isConsigned !== undefined 
          ? o.isConsigned 
          : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
          
        return !isConsigned;
      })
      .filter(o => getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10)
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients, products]);

  const totalConsignadoOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro')
      .filter(o => {
        // UNIFICAÇÃO: Mesma lógica da lista detalhada
        const isConsigned = o.isConsigned !== undefined 
          ? o.isConsigned 
          : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
          
        return isConsigned;
      })
      .filter(o => getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10)
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients, products]);

  const totalInstallationsOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro')
      .filter(o => {
        if (o.orderType !== 'instalacao') return false;
        
        // EXCLUIR CONSIGNADOS (pois já estão no card de Consignados)
        const isConsigned = o.isConsigned !== undefined 
          ? o.isConsigned 
          : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
          
        return !isConsigned;
      })
      .filter(o => getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10)
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients]);

  const totalRetiradasOwed = useMemo(() => {
    return ordersVisiveisFinanceiro
      .filter(o => o.status !== 'rejeitado_financeiro')
      .filter(o => {
        if (o.orderType !== 'retirada') return false;
        
        // EXCLUIR CONSIGNADOS (pois já estão no card de Consignados)
        const isConsigned = o.isConsigned !== undefined 
          ? o.isConsigned 
          : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
          
        return !isConsigned;
      })
      .filter(o => getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10)
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number), 0);
  }, [ordersVisiveisFinanceiro, financialEntries, clients]);

  const handleDeleteReceipt = async () => {
    if (!deletingReceipt || !selectedOrder) return;
    
    try {
      const { source, financialEntryId, index } = deletingReceipt;
      
      if (source === 'order_main') {
        await updateOrder(selectedOrder.id, { receiptUrl: '' });
      } else if (source === 'order_urls' && index !== undefined) {
        const newUrls = [...(selectedOrder.receiptUrls || [])];
        newUrls.splice(index, 1);
        await updateOrder(selectedOrder.id, { receiptUrls: newUrls });
      } else if (source === 'financial_main' && financialEntryId) {
        await updateFinancialEntry(financialEntryId, { receiptUrl: '' });
      } else if (source === 'financial_urls' && financialEntryId && index !== undefined) {
        const entry = financialEntries.find(e => e.id === financialEntryId);
        if (entry) {
          const newUrls = [...(entry.receiptUrls || [])];
          newUrls.splice(index, 1);
          await updateFinancialEntry(financialEntryId, { receiptUrls: newUrls });
        }
      }
      
      toast.success('Comprovante removido com sucesso!');
      setDeletingReceipt(null);
    } catch (err) {
      toast.error('Erro ao remover comprovante.');
    }
  };

  // Pedidos de CARENAGEM
  const carenagemOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => {
    if (!isOrderCarenagem(o)) return false;
    
    // EXCLUIR CONSIGNADOS (regra de exclusividade)
    const isConsigned = o.isConsigned !== undefined 
      ? o.isConsigned 
      : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
      
    return !isConsigned;
  }), [ordersVisiveisFinanceiro, products, clients]);

  const totalCarenagemOwed = useMemo(() => {
    return carenagemOrders
      .filter(o => o.status !== 'rejeitado_financeiro')
      .filter(o => {
        // UNIFICAÇÃO: Mesma lógica da lista detalhada
        const isConsigned = o.isConsigned !== undefined 
          ? o.isConsigned 
          : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
          
        return !isConsigned;
      })
      .filter(o => getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10) // ✅ Blindado
      .reduce((s, o) => s + getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number), 0);
  }, [carenagemOrders, financialEntries, clients]);

  const grandTotalPending = useMemo(() => {
    return totalPendenteNormal + totalConsignadoOwed + totalInstallationsOwed + totalRetiradasOwed + totalCarenagemOwed;
  }, [totalPendenteNormal, totalConsignadoOwed, totalInstallationsOwed, totalRetiradasOwed, totalCarenagemOwed]);


  const aguardandoLiberacao = ordersVisiveisFinanceiro.filter(o => (o.status === 'aprovado_financeiro' || o.status === 'aguardando_producao') && !isOrderCarenagem(o)).length;
  const aguardandoFinanceiro = ordersVisiveisFinanceiro.filter(o => o.status === 'aguardando_financeiro' && !isOrderCarenagem(o)).length;

  // Pedidos de clientes consignados que ainda possuem saldo devedor
  const consignadosOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => {
    const isConsigned = o.isConsigned !== undefined ? o.isConsigned : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
    if (!isConsigned) return false;
    
    // Filtro crucial: SÓ mostra se ainda houver saldo devedor relevante ou novos comprovantes pendentes de análise
    const hasSaldo = getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10;
    const hasUnseenReceipts = (o.receiptUrls?.length || 0) > (o.comprovantesVistos || 0);
    
    return hasSaldo || hasUnseenReceipts;
  }), [ordersVisiveisFinanceiro, clients, financialEntries]);

  // 🔔 Contador de novos comprovantes especificamente para consignados
  const newReceiptsInConsigned = useMemo(() => {
    return consignadosOrders.filter(o => (o.receiptUrls?.length || 0) > (o.comprovantesVistos || 0)).length;
  }, [consignadosOrders]);

  // Agrupar pedidos consignados por cliente para visualização resumida
  const consignedByClient = useMemo(() => {
    const groups: { [key: string]: { clientName: string, orders: any[], totalOwed: number, hasNewReceipts: boolean } } = {};
    
    consignadosOrders.forEach(order => {
      const clientName = order.clientName || 'Cliente não identificado';
      if (!groups[clientName]) {
        groups[clientName] = {
          clientName,
          orders: [],
          totalOwed: 0,
          hasNewReceipts: false
        };
      }
      
      const saldo = getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
      groups[clientName].orders.push(order);
      groups[clientName].totalOwed += saldo;
      
      if ((order.receiptUrls?.length || 0) > (order.comprovantesVistos || 0)) {
        groups[clientName].hasNewReceipts = true;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [consignadosOrders, financialEntries]);

  // --- ⏰ LÓGICA DE NOTIFICAÇÃO DE ATRASO DE PAGAMENTO ---
  const calcularDiasAtraso = (dataCriacao: string) => {
    const criada = new Date(dataCriacao);
    const hoje = new Date();
    const diffTime = Math.abs(hoje.getTime() - criada.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Notifica automaticamente sobre pedidos atrasados — dispara apenas 1x por montagem
  const alertasDisparadosRef = React.useRef(false);
  useEffect(() => {
    if (alertasDisparadosRef.current) return; // Já disparou, não repetir
    alertasDisparadosRef.current = true;

    const pedidosAtrasados = ordersVisiveisFinanceiro.filter(o => {
      const saldo = getSaldoDevedor(o.id, o.total);
      if (saldo <= 0) return false;
      const dias = calcularDiasAtraso(o.createdAt);
      return dias >= 3;
    });

    if (pedidosAtrasados.length > 0) {
      pedidosAtrasados.forEach(o => {
        const dias = calcularDiasAtraso(o.createdAt);
        toast.warning(`⚠️ ALERTA DE PAGAMENTO: ${o.clientName}`, {
          description: `Pedido ${o.number} está há ${dias} dias com saldo devedor de ${formatCurrency(getSaldoDevedor(o.id, o.total))}`,
          duration: 10000,
        });
      });
    }
  }, []); // Executa apenas 1x ao montar o componente

  // Pedidos de instalação
  const installationOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => {
    if (o.orderType !== 'instalacao') return false;
    
    // EXCLUIR CONSIGNADOS (regra de exclusividade)
    const isConsigned = o.isConsigned !== undefined 
      ? o.isConsigned 
      : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
      
    if (isConsigned) return false;

    const hasSaldo = getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10;
    const hasUnseenReceipts = (o.receiptUrls?.length || 0) > (o.comprovantesVistos || 0);
    return hasSaldo || hasUnseenReceipts;
  }), [ordersVisiveisFinanceiro, clients, financialEntries]);

  // Pedidos de retirada
  const retiradaOrders = useMemo(() => ordersVisiveisFinanceiro.filter(o => {
    if (o.orderType !== 'retirada') return false;
    
    // EXCLUIR CONSIGNADOS (regra de exclusividade)
    const isConsigned = o.isConsigned !== undefined 
      ? o.isConsigned 
      : clients.find(c => c.id === o.clientId || c.name === o.clientName)?.consignado === true;
      
    if (isConsigned) return false;

    const hasSaldo = getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number) >= 0.10;
    const hasUnseenReceipts = (o.receiptUrls?.length || 0) > (o.comprovantesVistos || 0);
    return hasSaldo || hasUnseenReceipts;
  }), [ordersVisiveisFinanceiro, clients, financialEntries]);


  const [showCarenagem, setShowCarenagem] = useState(defaultTab === 'carenagem');

  // ── Filtro por período ─────────────────────────────────────
  const filterByPeriod = (date: string, period: PeriodFilter): boolean => {
    const d = new Date(date);
    const now = new Date();
    if (period === 'hoje') {
      return d.toDateString() === now.toDateString();
    }
    if (period === '7dias') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    }
    if (period === '30dias') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    }
    return true; // 'todos'
  };

  // ── Controle de vendas por vendedor ───────────────────────
  const sellerStats = useMemo(() => {
    // Para o financeiro, as vendas por vendedor mostram apenas pedidos enviados
    const periodOrders = ordersVisiveisFinanceiro.filter(o =>
      filterByPeriod(o.createdAt, sellerPeriod) && o.status !== 'rejeitado_financeiro'
    );

    const getLastClosingDate = (sellerId: string) => {
      const closings = monthlyClosings.filter(c => c.sellerId === sellerId);
      if (closings.length === 0) return null;
      return new Date(closings.sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime())[0].closingDate);
    };

    const stats: Record<string, {
      sellerName: string;
      sellerId: string;
      items: { product: string; sensorType?: string; quantity: number; total: number }[];
      totalVendas: number;
      totalDivida: number;
      qtdPedidos: number;
    }> = {};

    for (const order of periodOrders) {
      const key = order.sellerId || order.sellerName;
      
      // ✅ Respeita o fechamento mensal se o filtro de período for 'todos' ou se quisermos o ciclo atual
      const lastClosing = getLastClosingDate(order.sellerId);
      if (sellerPeriod === 'todos' && lastClosing && new Date(order.createdAt) <= lastClosing) {
        // Se já foi fechado e estamos vendo "todos", este pedido pertence a um ciclo anterior
        // Poderíamos optar por não mostrar ou mostrar em cinza, mas o pedido fala em "zerar indicadores"
        // Então ignoramos pedidos anteriores ao último fechamento se estivermos no modo padrão.
        continue;
      }

      if (!stats[key]) {
        stats[key] = {
          sellerName: order.sellerName,
          sellerId: order.sellerId,
          items: [],
          totalVendas: 0,
          totalDivida: 0,
          qtdPedidos: 0,
        };
      }
      stats[key].totalVendas += order.total;
      stats[key].totalDivida += getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
      stats[key].qtdPedidos += 1;
      for (const item of order.items) {
        // Apenas itens com valor real contam como "venda"
        if (item.unitPrice > 0) {
          const existingItem = stats[key].items.find(i =>
            i.product === item.product && i.sensorType === item.sensorType
          );
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.total += item.total;
          } else {
            stats[key].items.push({
              product: item.product,
              sensorType: item.sensorType,
              quantity: item.quantity,
              total: item.total,
            });
          }
        }
      }
    }

    return Object.values(stats).sort((a, b) => b.totalVendas - a.totalVendas);
  }, [ordersVisiveisFinanceiro, sellerPeriod, monthlyClosings]);

  const filteredOrders = useMemo(() => {
    // ✅ Começa apenas com pedidos visíveis ao financeiro (não rascunhos)
    let result = [...ordersVisiveisFinanceiro];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.number.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q));
    }

    if (statusFilter !== 'todos') {
      result = result.filter(o => {
        if (statusFilter === 'pago') return o.paymentStatus === 'pago';
        if (statusFilter === 'pendente') return o.paymentStatus === 'pendente' || o.status === 'aguardando_financeiro';
        return true;
      });
    }

    if (paymentMethodFilter !== 'todos') {
      result = result.filter(o => o.paymentMethod === paymentMethodFilter);
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
  }, [ordersVisiveisFinanceiro, searchQuery, statusFilter, paymentMethodFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Fluxo: Financeiro aprova e envia direto para Produção (sem etapa intermediária do Gestor)
  const aprovarEEnviarProducao = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const client = clients.find(c => c.id === order.clientId);
    // IMPORTANTE: Se o cliente não for encontrado por ID, tenta por nome como fallback
    const actualClient = client || clients.find(c => c.name === order.clientName);
    const isConsignado = actualClient?.consignado === true;
    
    if (order.isWarranty) {
      // ✅ Pedidos de GARANTIA: Financeiro aprova e envia para o GESTOR (conforme fluxograma)
      await updateOrderStatus(orderId, 'aguardando_gestor', { financeiroAprovado: true }, 'Financeiro', 'Garantia: Enviado para validação do Gestor');
      setSelectedOrderId(null);
      return;
    }

    if (isConsignado) {
      // ✅ Para clientes CONSIGNADOS, permite enviar para produção SEM obrigatoriedade de pagamento total
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
        'Financeiro',
        'Consignado: Aprovado para produção sem obrigatoriedade de pagamento imediato'
      );
    } else if (order.orderType === 'instalacao') {
      // ✅ Para INSTALAÇÕES, também permite enviar para produção mesmo sem pagamento total (ex: pagar na hora)
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
        'Financeiro',
        'Instalação: Aprovado para produção. Pagamento será controlado pelo financeiro.'
      );
    } else if (order.orderType === 'retirada') {
      // ✅ Para RETIRADAS, também permite enviar para produção mesmo sem pagamento total (ex: cobrar no local)
      await updateOrderStatus(
        orderId,
        'aguardando_producao',
        { paymentStatus: order.paymentStatus || 'pendente', statusPagamento: order.statusPagamento || 'pendente', financeiroAprovado: true },
        'Financeiro',
        'Retirada: Aprovado para produção. Pagamento será controlado pelo financeiro.'
      );
    } else {
      // ✅ Para clientes normais, cria lançamento financeiro total (venda direta)
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: 'receita',
        description: `Pagamento total - ${order.number} - ${order.clientName}`,
        amount: order.total,
        category: 'Venda de Produtos',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        paymentMethod: order.paymentMethod || 'Pix',
        receiptUrls: order.receiptUrls || [], // 🔥 COPIA OS COMPROVANTES DO PEDIDO PARA O LANÇAMENTO
        transactionId: (order as any).transactionId,
        cardLastDigits: (order as any).cardLastDigits,
        createdAt: new Date().toISOString(),
      };

      await addFinancialEntry(entry);
      await updateOrderStatus(orderId, 'aguardando_producao', { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true }, 'Financeiro', 'Pagamento aprovado - Enviando para produção');
    }

    setSelectedOrderId(null);
    setShowReject(false);
    setRejectReason('');
  };

  const syncData = async () => {
    setIsRefreshing(true);
    try {
      if (loadFromSupabase) await loadFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const rejeitarPedido = async (orderId: string) => {
    if (!rejectReason.trim()) return;
    try {
      // ✅ Passa o status e o motivo no metadata (extra) para persistência e exibição correta
      await updateOrderStatus(orderId, 'rejeitado_financeiro', { rejectionReason: rejectReason }, 'Financeiro', `Rejeitado: ${rejectReason}`);
      toast.success('Pedido rejeitado com sucesso');
      setSelectedOrderId(null); // Retorna para a lista após rejeitar
      setShowReject(false);
      setRejectReason('');
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
      toast.error('Erro ao rejeitar pedido. Tente novamente.');
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedOrderId) return;

    if (!file.type.includes('pdf')) {
      toast.error('Por favor, envie apenas arquivos PDF.');
      return;
    }

    setIsUploading(true);
    try {
      const path = generateR2Path(file, selectedOrderId);
      const url = await uploadToR2(file, path);
      
      const currentOrder = orders.find(o => o.id === selectedOrderId);
      if (currentOrder) {
        await updateOrderStatus(
          selectedOrderId, 
          currentOrder.status, 
          { attachmentUrl: url, attachmentName: file.name },
          'Financeiro',
          `Arquivo Produção/NF anexado: ${file.name}`
        );
        toast.success(`Arquivo ${file.name} anexado!`);
      }
    } catch (error) {
      console.error('Erro no upload de anexo:', error);
      toast.error('Falha ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!selectedOrderId || !window.confirm('Deseja realmente remover este anexo técnico?')) return;
    
    setIsUploading(true);
    try {
      const currentOrder = orders.find(o => o.id === selectedOrderId);
      if (currentOrder) {
        await updateOrderStatus(
          selectedOrderId, 
          currentOrder.status, 
          { attachmentUrl: null, attachmentName: null },
          'Financeiro',
          'Anexo técnico/Produção removido'
        );
        toast.success('Anexo removido!');
      }
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast.error('Falha ao remover arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelarEnvioProducao = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'aguardando_financeiro', { 
        financeiroAprovado: false,
        paymentStatus: 'pendente' 
      }, 'Financeiro', 'Envio cancelado. O pedido retornou para análise financeira.');
      
      toast.success('Envio cancelado com sucesso.');
    } catch (error) {
      console.error('Erro ao cancelar envio:', error);
      toast.error('Erro ao cancelar envio. Tente novamente.');
    }
  };

  const handleOpenEdit = () => {
    if (!selectedOrder) return;
    setTempItems([...selectedOrder.items]);
    setTempTaxes(selectedOrder.taxes || 0);
    setShowEditModal(true);
  };

  const saveQuickEdit = async () => {
    if (!selectedOrder) return;
    
    const subtotal = tempItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const total = subtotal + tempTaxes;
    
    try {
      await updateOrder(selectedOrder.id, {
        items: tempItems,
        subtotal,
        taxes: tempTaxes,
        total
      });
      
      setShowEditModal(false);
      toast.success('Valores atualizados!');
    } catch (err) {
      toast.error('Erro ao salvar alterações.');
    }
  };

  const handleAprovarCarenagem = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const nextStatus = 'produto_liberado';
    const note = 'Carenagem: Aprovado e Liberado (Sem Produção)';

    const client = clients.find(c => c.id === order.clientId);
    const actualClient = client || clients.find(c => c.name === order.clientName);
    const isConsignado = actualClient?.consignado === true;
    
    const extra: Partial<Order> = {
      financeiroAprovado: true
    };
    
    // Se não for consignado/instalação/retirada, marca como pago e gera lançamento
    if (!isConsignado && order.orderType !== 'instalacao' && order.orderType !== 'retirada') {
      extra.paymentStatus = 'pago';
      extra.statusPagamento = 'pago';
      
      // Gera lançamento financeiro para não ficar com saldo devedor
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: 'receita',
        description: `Pagamento total (Carenagem) - ${order.number} - ${order.clientName}`,
        amount: order.total,
        category: 'Venda de Produtos',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        paymentMethod: order.paymentMethod || 'Pix',
        receiptUrls: order.receiptUrls || [], // 🔥 COPIA OS COMPROVANTES DO PEDIDO PARA O LANÇAMENTO
        transactionId: (order as any).transactionId,
        cardLastDigits: (order as any).cardLastDigits,
        createdAt: new Date().toISOString(),
      };
      await addFinancialEntry(entry);
    }

    try {
      await updateOrderStatus(orderId, nextStatus, extra, 'Financeiro', note);
      toast.success(`Pedido ${order.number} aprovado!`);
    } catch (error) {
      toast.error('Erro ao aprovar pedido');
    }
  };

  const handleRejeitarCarenagem = async (orderId: string, reason: string) => {
    if (!reason) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    try {
      await updateOrderStatus(orderId, 'rejeitado_financeiro', {}, 'Financeiro', `Rejeitado: ${reason}`);
      toast.info('Pedido rejeitado');
      setShowReject(false);
      setRejectReason('');
    } catch (error) {
      toast.error('Erro ao rejeitar');
    }
  };

  // ── Pagamentos Parciais (Consignado) ──────────────────────────
  const getPagamentosDosPedido = (orderId: string): FinancialEntry[] =>
    financialEntries.filter(e => e.orderId === orderId && e.status !== 'cancelado');

  const adicionarPagamentoParcial = async (order: Order) => {
    const valor = parseFloat(novoPagValor.replace(',', '.'));
    if (!valor || valor <= 0) { alert('Informe um valor válido.'); return; }

    // ✅ Validação de Duplicidade por ID de Transação
    if (novoPagTransactionId.trim()) {
      const duplicate = financialEntries.find(e => 
        e.transactionId?.trim().toLowerCase() === novoPagTransactionId.trim().toLowerCase()
      );
      if (duplicate) {
        if (!window.confirm(`⚠️ ATENÇÃO: A transação "${novoPagTransactionId}" já foi creditada anteriormente no pedido ${duplicate.orderNumber}.\n\nPossível causa: Comprovante duplicado.\n\nDeseja prosseguir mesmo assim?`)) {
          return;
        }
      }
    }

    const pagamentos = getPagamentosDosPedido(order.id);
    const totalPago = pagamentos.reduce((s, p) => s + (p.type === 'despesa' ? -p.amount : p.amount), 0);
    if (totalPago + valor > order.total) {
      alert(`Valor excede o saldo devedor de ${formatCurrency(order.total - totalPago)}.`);
      return;
    }
    try {
      setSalvandoPag(true);
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: 'receita',
        description: novoPagDescricao || `Pagamento parcial - ${order.number} - ${order.clientName}`,
        amount: valor,
        category: 'Pagamento Consignado',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: order.id,
        orderNumber: order.number,
        clientId: order.clientId,
        clientName: order.clientName,
        receiptUrls: novoPagComprovantes,
        transactionId: novoPagTransactionId.trim(),
        cardLastDigits: novoPagCardDigits.trim(),
        createdAt: new Date().toISOString(),
      };
      addFinancialEntry(entry);
      setNovoPagValor('');
      setNovoPagDescricao('');
      setNovoPagComprovantes([]);
      setNovoPagTransactionId('');
      setNovoPagCardDigits('');

      // Se pagou 100%, aprova e envia para produção
      const novoTotal = totalPago + valor;
      if (novoTotal >= order.total) {
        if (order.status === 'aguardando_financeiro') {
          await updateOrderStatus(order.id, 'aguardando_producao', { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true }, 'Financeiro', 'Valor total quitado — enviando para produção');
        } else {
          // Se já estava em outro status (ex: já em produção), apenas marca como pago
          await updateOrderStatus(order.id, order.status, { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true }, 'Financeiro', 'Valor total quitado');
        }
        setSelectedOrderId(null);
      } else {
        // ✅ Atualiza status para PARCIAL se ainda não quitou
        await updateOrderStatus(order.id, order.status, { paymentStatus: 'parcial', statusPagamento: 'parcial' }, 'Financeiro', `Pagamento parcial de ${formatCurrency(valor)} recebido`);
      }
      if (loadFromSupabase) await loadFromSupabase();
      toast.success('Pagamento registrado!');
    } catch (err: any) {
      toast.error('Erro ao registrar pagamento: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSalvandoPag(false);
    }
  };

  const handleSaveEditEntry = async (entryId: string) => {
    const amount = parseFloat(editingEntryAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    try {
      await updateFinancialEntry(entryId, {
        amount,
        description: editingEntryDescription
      });
      setEditingEntryId(null);
      if (loadFromSupabase) await loadFromSupabase();
      toast.success('Lançamento atualizado!');
    } catch (err) {
      toast.error('Erro ao atualizar lançamento.');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    // Primeira etapa: pede confirmação visual mudando o botão
    if (deletingEntryId !== entryId) {
      setDeletingEntryId(entryId);
      // Reset automático após 3 segundos se não confirmar
      setTimeout(() => setDeletingEntryId(current => current === entryId ? null : current), 3000);
      return;
    }

    try {
      await updateFinancialEntry(entryId, { status: 'cancelado' });
      setDeletingEntryId(null);
      if (loadFromSupabase) await loadFromSupabase();
      toast.success('Lançamento cancelado!');
    } catch (err: any) {
      toast.error('Erro ao excluir lançamento: ' + (err?.message || 'Tente novamente'));
    }
  };

  const handleQuickAdjust = async () => {
    if (!selectedOrder) return;
    const newValue = parseFloat(adjustValue.replace(',', '.'));
    if (isNaN(newValue)) { toast.error('Valor inválido'); return; }

    const pagamentos = getPagamentosDosPedido(selectedOrder.id);
    const totalPagoAtualmente = pagamentos.reduce((s, p) => s + (p.type === 'despesa' ? -p.amount : p.amount), 0);
    
    let diff = 0;
    let description = '';

    if (showQuickAdjust === 'recebido') {
      diff = newValue - totalPagoAtualmente;
      description = `Ajuste manual de saldo recebido (Novo total: ${formatCurrency(newValue)})`;
    } else if (showQuickAdjust === 'saldo') {
      const currentBalance = selectedOrder.total - totalPagoAtualmente;
      // Se eu quero que o novo saldo seja X, então eu preciso pagar (CurrentBalance - X)
      diff = currentBalance - newValue;
      description = `Ajuste manual de saldo devedor (Novo saldo: ${formatCurrency(newValue)})`;
    }

    if (diff === 0) { 
      toast.info('O valor informado é igual ao atual. Nenhuma alteração necessária.');
      setShowQuickAdjust(null); 
      return; 
    }

    try {
      const entry: FinancialEntry = {
        id: crypto.randomUUID(),
        type: diff > 0 ? 'receita' : 'despesa',
        description,
        amount: Math.abs(diff),
        category: 'Ajuste de Saldo',
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.number,
        clientId: selectedOrder.clientId,
        clientName: selectedOrder.clientName,
        createdAt: new Date().toISOString(),
      };
      
      await addFinancialEntry(entry);
      setShowQuickAdjust(null);
      setAdjustValue('');
      if (loadFromSupabase) await loadFromSupabase();
      toast.success('Valor ajustado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao ajustar valor:', err);
      toast.error('Erro ao ajustar valor: ' + (err?.message || 'Tente novamente'));
    }
  };

  if (selectedOrder) {
    const isDevedor = getSaldoDevedor(selectedOrder.id, selectedOrder.total) > 0;
    const client = clients.find(c => c.id === selectedOrder.clientId);
    const pagamentos = getPagamentosDosPedido(selectedOrder.id);
    const totalPago = pagamentos.reduce((s, p) => s + (p.type === 'despesa' ? -p.amount : p.amount), 0);
    const saldoDevedor = selectedOrder.total - totalPago;

    return (
      <div className="space-y-8 animate-fade-in pb-20 relative select-text cursor-default">
        {/* Header de Ação */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedOrderId(null)} 
              className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-foreground border border-border/40"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight select-text">Pedido <span className="text-primary select-all cursor-text">#{selectedOrder.number}</span></h1>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Gerenciamento financeiro detalhado
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border shadow-xl ${selectedOrder.paymentStatus === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10'}`}>
              Pagamento: {selectedOrder.paymentStatus === 'pago' ? 'CONFIRMADO' : 'PENDENTE'}
            </div>
            <StatusBadge status={selectedOrder.status} />
          </div>
        </div>

        {/* Central de Comprovantes Agregada */}
        {(() => {
          const allVouchers: { url: string; title: string; category: string; date?: string; source: any; financialEntryId?: string; index?: number }[] = [];
          const seenUrls = new Set<string>();
          
          if (selectedOrder.receiptUrl) {
            allVouchers.push({ url: selectedOrder.receiptUrl, title: 'Comprovante Principal', category: 'Venda', source: 'order_main' });
            seenUrls.add(selectedOrder.receiptUrl);
          }
          if (selectedOrder.receiptUrls && selectedOrder.receiptUrls.length > 0) {
            selectedOrder.receiptUrls.forEach((url, i) => {
              if (!seenUrls.has(url)) {
                allVouchers.push({ url, title: `Anexo Pedido #${i + 1}`, category: 'Venda', source: 'order_urls', index: i });
                seenUrls.add(url);
              }
            });
          }

          // Adiciona comprovantes de cada pagamento vinculado
          const orderPayments = financialEntries.filter(e => e.orderId === selectedOrder.id && e.type === 'receita');
          orderPayments.forEach(p => {
            if (p.receiptUrl && !seenUrls.has(p.receiptUrl)) {
              allVouchers.push({ url: p.receiptUrl, title: p.description || 'Comprovante', category: 'Recebimento', date: p.date, source: 'financial_main', financialEntryId: p.id });
              seenUrls.add(p.receiptUrl);
            }
            if (p.receiptUrls && p.receiptUrls.length > 0) {
              p.receiptUrls.forEach((url, i) => {
                if (!seenUrls.has(url)) {
                  allVouchers.push({ url, title: `${p.description || 'Pagamento'} (${i + 1})`, category: 'Recebimento', date: p.date, source: 'financial_urls', financialEntryId: p.id, index: i });
                  seenUrls.add(url);
                }
              });
            }
          });

          if (allVouchers.length === 0) return null;

          return (
            <div className="card-premium p-8 border-primary/30 bg-primary/[0.02] shadow-primary/10 relative z-[40] pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Central de Comprovantes e Anexos
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold">Total de {allVouchers.length} arquivo(s) encontrado(s)</p>
                </div>

                {selectedOrder.receiptUrls && selectedOrder.receiptUrls.length > (selectedOrder.comprovantesVistos || 0) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await updateOrder(selectedOrder.id, { 
                          comprovantesVistos: selectedOrder.receiptUrls?.length || 0 
                        });
                        toast.success('Comprovantes marcados como vistos!');
                      } catch (err) {
                        toast.error('Erro ao atualizar status.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 animate-bounce"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Visto ({selectedOrder.receiptUrls.length - (selectedOrder.comprovantesVistos || 0)} novo)
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {allVouchers.map((rec, idx) => (
                  <div key={idx} className="relative group/item">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(cleanR2Url(rec.url)); }}
                      className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-border/60 hover:border-primary/50 hover:shadow-xl hover:scale-[1.02] transition-all text-left group cursor-pointer pointer-events-auto relative z-50"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                        {rec.url.toLowerCase().includes('.pdf') ? <FileText className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-foreground uppercase truncate tracking-tight">{rec.title}</p>
                        <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded-md ${rec.category === 'Venda' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {rec.category}
                          </span>
                          {rec.date ? new Date(rec.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDeletingReceipt({ 
                          url: rec.url, 
                          title: rec.title, 
                          category: rec.category, 
                          financialEntryId: rec.financialEntryId, 
                          index: rec.index, 
                          source: rec.source 
                        }); 
                      }}
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-lg shadow-rose-500/30 z-[60] hover:scale-110 active:scale-90"
                      title="Excluir Comprovante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Coluna Principal: Informações e Produtos */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Card de Informações Gerais */}
            <div className="card-premium p-8 select-text">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Dados da Transação
                </h3>
              </div>

              <div className="space-y-6">

                {/* Alertas Críticos */}
                <div className="grid grid-cols-1 gap-4">
                  {client?.consignado && (
                    <div className="flex items-start gap-4 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 group hover:bg-amber-500/10 transition-colors">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                        <Star className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-amber-600 uppercase tracking-tight select-text">Regime de Consignação</p>
                        <p className="text-xs text-amber-600/70 mt-1 font-medium leading-relaxed italic select-text">Condições especiais de pagamento aplicadas a este cliente.</p>
                      </div>
                    </div>
                  )}

                  {selectedOrder.requiresInvoice && (
                    <div className="flex items-start gap-4 p-5 rounded-3xl bg-primary/5 border-2 border-primary/20 animate-pulse">
                      <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-tight">Emissão de Nota Fiscal (FATURAMENTO)</p>
                        <p className="text-xs text-primary/70 mt-1 font-medium leading-relaxed font-semibold">Este pedido deve ser formalizado com NF-e obrigatoriamente.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid de Dados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente */}
                  <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 select-text relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 select-text">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Cliente Final</span>
                      <span className="text-sm font-black text-foreground block select-all cursor-text pointer-events-auto">{selectedOrder.clientName}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5 select-all cursor-text pointer-events-auto">{client?.cpfCnpj ? `CPF/CNPJ: ${client.cpfCnpj}` : 'Sem documento'}</span>
                    </div>
                  </div>

                  {/* Vendedor */}
                  <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 select-text relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 select-text">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Consultor de Vendas</span>
                      <span className="text-sm font-black text-foreground block select-all cursor-text pointer-events-auto">{selectedOrder.sellerName}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5 select-all cursor-text pointer-events-auto">Responsável direto</span>
                    </div>
                  </div>

                  {/* Meio de Entrega */}
                  <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 select-text relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 select-text">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Meio de Entrega</span>
                      <span className="text-sm font-black text-foreground block select-all cursor-text pointer-events-auto">
                        {selectedOrder.orderType === 'retirada' ? '📦 Retirada no Local'
                          : selectedOrder.orderType === 'instalacao' ? '🔧 Instalação'
                          : selectedOrder.orderType === 'manutencao' ? '🛠️ Manutenção'
                          : selectedOrder.carrier ? `🚚 ${selectedOrder.carrier}` : '🚚 Entrega Própria'}
                      </span>
                      {(selectedOrder.orderType === 'retirada' || selectedOrder.orderType === 'instalacao' || selectedOrder.orderType === 'manutencao') && (
                        <span className={`mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          selectedOrder.installationPaymentType === 'pago'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-700 border-amber-500/40 shadow-sm shadow-amber-500/10'
                        }`}>
                          {selectedOrder.installationPaymentType === 'pago' ? '✅ Já pago' : '⚠️ Pagar na hora da retirada'}
                        </span>
                      )}
                      {(selectedOrder.orderType === 'instalacao' || selectedOrder.orderType === 'manutencao') && selectedOrder.installationDate && (
                        <span className="text-[10px] font-black text-primary block mt-1 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg w-fit">
                          📅 {new Date(selectedOrder.installationDate + 'T12:00:00').toLocaleDateString('pt-BR')} {selectedOrder.installationTime ? `às ${selectedOrder.installationTime}` : ''}
                        </span>
                      )}
                      {selectedOrder.orderType === 'entrega' && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">Entrega / Frete</span>
                      )}
                    </div>
                  </div>

                  {/* NOTA FISCAL / PRODUÇÃO */}
                  <div className={`flex items-center gap-4 p-5 rounded-3xl border transition-all md:col-span-2 ${
                    selectedOrder.attachmentUrl
                      ? 'bg-indigo-500/5 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-border/40'
                  }`}>
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                      selectedOrder.attachmentUrl ? 'bg-indigo-600 text-white' : 'bg-background border border-border/40 text-muted-foreground'
                    }`}>
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Nota Fiscal / Produção</span>
                      
                      {selectedOrder.attachmentUrl ? (
                         <div className="flex items-center justify-between gap-4 mt-1">
                            <div className="min-w-0">
                               <p className="text-sm font-black text-indigo-600 truncate">{selectedOrder.attachmentName || 'Arquivo de Produção.pdf'}</p>
                               <a 
                                 href={cleanR2Url(selectedOrder.attachmentUrl)} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="text-[10px] font-bold text-indigo-400 hover:underline pointer-events-auto relative z-10"
                               >
                                 Visualizar PDF Técnico
                               </a>
                            </div>
                            <input 
                              type="file" 
                              id="attachment-upload-replace"
                              className="hidden" 
                              accept=".pdf" 
                              onChange={handleAttachmentUpload} 
                            />
                            <div className="flex items-center gap-2">
                               <button 
                                  onClick={handleRemoveAttachment}
                                  className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all pointer-events-auto relative z-10"
                                  title="Remover Anexo"
                                  disabled={isUploading}
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                               <button 
                                  onClick={() => document.getElementById('attachment-upload-replace')?.click()}
                                  className="btn-modern bg-indigo-600/10 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-600/20 transition-all shrink-0 pointer-events-auto relative z-10"
                                  disabled={isUploading}
                               >
                                  {isUploading ? '...' : 'SUBSTITUIR'}
                               </button>
                            </div>
                         </div>
                      ) : (
                         <div className="flex items-center justify-between gap-4 mt-1">
                            <p className="text-xs font-bold text-muted-foreground italic">Nenhum arquivo técnico anexado para a produção.</p>
                            <input 
                              type="file" 
                              id="attachment-upload-new"
                              className="hidden" 
                              accept=".pdf" 
                              onChange={handleAttachmentUpload} 
                            />
                            <button 
                               onClick={() => document.getElementById('attachment-upload-new')?.click()}
                               className={`btn-modern bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all shrink-0 shadow-lg shadow-indigo-500/30 pointer-events-auto relative z-10 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                               disabled={isUploading}
                            >
                               {isUploading ? 'ENVIANDO...' : 'ANEXAR PDF'}
                            </button>
                         </div>
                      )}

                      {selectedOrder.requiresInvoice && (
                        <div className="mt-2 flex items-center gap-2">
                           <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-tighter">Obrigatório NF-e</span>
                           {selectedOrder.requiresShippingNote && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-tighter">Nota de Envio</span>
                           )}
                           {selectedOrder.isWarranty && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black uppercase tracking-tighter shadow-lg shadow-rose-500/20 animate-pulse">🛡️ GARANTIA</span>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fluxo Operacional */}
                  <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 select-text relative z-10 md:col-span-2">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 select-text">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Fluxo Operacional</span>
                      <span className="text-sm font-black text-foreground block select-all cursor-text">{isOrderCarenagem(selectedOrder) ? 'Direto p/ Estoque (Carenagem)' : 'Fluxo de Produção'}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Processamento automático</span>
                    </div>
                  </div>
                </div>

                {/* Motivo de Rejeição (quando aplicável) */}
                {selectedOrder.status === 'rejeitado_financeiro' && (selectedOrder as any).rejectionReason && (
                  <div className="flex items-start gap-4 p-5 rounded-3xl bg-rose-500/5 border border-rose-500/20">
                    <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-rose-600 uppercase tracking-tight">Motivo da Rejeição</p>
                      <p className="text-xs text-rose-600/80 mt-1 font-medium leading-relaxed">{(selectedOrder as any).rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Endereço */}
                {client && (
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-muted-foreground shrink-0 shadow-sm">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="select-text pointer-events-auto">
                      <span className="text-[10px] uppercase font-black text-muted-foreground/60 block tracking-widest">Local de Entrega / Instalação</span>
                      <p className="text-sm font-bold text-foreground leading-snug mt-1 select-all cursor-text pointer-events-auto">
                        {client.address}, {client.bairro ? `${client.bairro}, ` : ''}{client.city} - {client.state}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono select-all cursor-text pointer-events-auto">CEP: {client.cep}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="card-premium overflow-hidden border-none shadow-2xl">
              <div className="p-6 border-b border-border/20 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary" />
                  Itens do Pedido ({selectedOrder.items.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                      <th className="py-4 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Produto</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Qtd</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Preço Un.</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {selectedOrder.items.map(item => (
                      <tr key={item.id} className="group hover:bg-primary/[0.01] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-foreground flex items-center gap-2">
                              {item.product}
                              {item.isReward && <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black">PRÊMIO</span>}
                            </span>
                            <span className="text-[11px] text-muted-foreground opacity-60 mt-0.5 line-clamp-1 italic">{item.description || 'Nenhuma descrição técnica'}</span>
                            {item.sensorType && (
                              <span className={`mt-2 text-[8px] font-black px-2 py-0.5 rounded-lg w-fit border ${item.sensorType === 'com_sensor' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-slate-500/5 text-slate-500 border-slate-500/10'}`}>
                                {item.sensorType === 'com_sensor' ? '✓ COM SENSOR' : '✕ SEM SENSOR'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-foreground tabular-nums">{item.quantity}</td>
                        <td className="py-4 px-6 text-right font-medium text-muted-foreground tabular-nums text-xs">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-4 px-6 text-right font-black text-foreground tabular-nums">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-slate-50/50 dark:bg-slate-900/40 border-t border-border/10">
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="flex items-center gap-8 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Subtotal: {formatCurrency(selectedOrder.subtotal)}</span>
                    <span>Tributos: {formatCurrency(selectedOrder.taxes)}</span>
                  </div>
                  <div className="text-3xl font-black text-foreground tracking-tighter mt-1 flex items-center gap-3">
                    <span className="text-[10px] uppercase text-muted-foreground tracking-[0.3em] font-black">Total Geral:</span>
                    {formatCurrency(selectedOrder.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Observações do Pedido */}
            {(selectedOrder.observation || selectedOrder.notes) && (
              <div className="card-premium p-6 space-y-4 bg-amber-500/5 border-amber-500/20 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Observações do Pedido
                </h3>
                <div className="space-y-3">
                  {selectedOrder.observation && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-500/60 block tracking-widest">Observação Geral</span>
                      <p className="text-sm font-semibold text-foreground leading-relaxed italic">"{selectedOrder.observation}"</p>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-500/60 block tracking-widest">Notas Adicionais</span>
                      <p className="text-sm font-semibold text-foreground leading-relaxed italic">"{selectedOrder.notes}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Lateral: Resumo Financeiro e Ações */}
          <div className="space-y-8">
            {/* Status Financeiro & Quitação */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fluxo de Caixa</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/40 select-text relative z-10">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Total do Pedido</p>
                      <p className="text-sm font-black text-foreground">{formatCurrency(selectedOrder.total)}</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all relative">
                    <div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase">Valor Recebido</p>
                      <p className="text-sm font-black text-emerald-600">{formatCurrency(totalPago)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setAdjustValue(totalPago.toString());
                          setShowQuickAdjust('recebido');
                        }}
                        className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 pointer-events-auto relative z-[60]"
                        title="Alterar valor recebido total"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="group flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-all relative">
                    <div>
                      <p className="text-[10px] font-black text-rose-500 uppercase">Saldo Faltante</p>
                      <p className="text-xl font-black text-rose-600 tabular-nums">{formatCurrency(saldoDevedor)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setAdjustValue(saldoDevedor.toString());
                          setShowQuickAdjust('saldo');
                        }}
                        className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-500/20 pointer-events-auto relative z-[60]"
                        title="Alterar saldo faltante diretamente"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {pagamentos.length > 0 && (
                  <div className="space-y-3" id="detalhamento-pagamentos">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Recebimentos Detalhados</p>
                    {pagamentos.map((pag, idx) => (
                      <div key={pag.id} className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex flex-col gap-3 group hover:bg-muted/30 transition-all relative">
                        {editingEntryId === pag.id ? (
                          <div className="space-y-3 p-1 animate-in slide-in-from-top-2 duration-300">
                             <div className="flex items-center gap-2">
                               <div className="flex-1">
                                 <label className="text-[8px] font-black text-primary uppercase ml-1">Valor (R$)</label>
                                 <input
                                   type="text"
                                   value={editingEntryAmount}
                                   onChange={e => setEditingEntryAmount(e.target.value)}
                                   className="input-modern bg-white dark:bg-slate-900 border-primary/30 py-1.5 text-xs font-bold w-full"
                                 />
                               </div>
                               <div className="flex-[2]">
                                 <label className="text-[8px] font-black text-primary uppercase ml-1">Descrição</label>
                                 <input
                                   type="text"
                                   value={editingEntryDescription}
                                   onChange={e => setEditingEntryDescription(e.target.value)}
                                   className="input-modern bg-white dark:bg-slate-900 border-primary/30 py-1.5 text-xs font-bold w-full"
                                 />
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => handleSaveEditEntry(pag.id)}
                                 className="flex-1 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                               >
                                 Salvar
                               </button>
                               <button 
                                 onClick={() => setEditingEntryId(null)}
                                 className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
                               >
                                 Sair
                               </button>
                             </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">
                                  #{idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-foreground truncate">{pag.description || 'Pagamento via ERP'}</p>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEntryId(pag.id);
                                          setEditingEntryAmount(pag.amount.toString());
                                          setEditingEntryDescription(pag.description || '');
                                        }}
                                        className="h-9 px-3 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center gap-1.5 transition-all border border-amber-500/20 text-[10px] font-black uppercase tracking-tighter pointer-events-auto cursor-pointer relative z-30"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 pointer-events-none" /> EDITAR
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteEntry(pag.id);
                                        }}
                                        className={`h-9 px-3 rounded-xl flex items-center gap-1.5 transition-all border text-[10px] font-black uppercase tracking-tighter pointer-events-auto cursor-pointer relative z-30 ${
                                          deletingEntryId === pag.id 
                                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                                        }`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                                        {deletingEntryId === pag.id ? 'TEM CERTEZA?' : 'EXCLUIR'}
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(pag.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-emerald-500 tabular-nums">{formatCurrency(pag.amount)}</p>
                                {pag.transactionId && (
                                  <p className="text-[8px] font-black text-primary uppercase tracking-tighter opacity-70">NSU: {pag.transactionId}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Comprovantes associados ao lançamento */}
                            {(pag.receiptUrl || (pag.receiptUrls && pag.receiptUrls.length > 0)) && (
                              <div className="flex gap-1 overflow-x-auto pb-1 mt-1 border-t border-border/5 pt-2">
                                {(pag.receiptUrls || (pag.receiptUrl ? [pag.receiptUrl] : [])).map((url, uidx) => (
                                  <button 
                                    key={uidx}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPreviewUrl(cleanR2Url(url)); }} 
                                    className="h-7 w-7 rounded-lg bg-primary/5 text-primary/60 hover:bg-primary hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer pointer-events-auto relative z-50 border border-primary/10"
                                    title={`Ver Arquivo #${uidx + 1}`}
                                  >
                                    {url.startsWith('data:application/pdf') || url.toLowerCase().includes('.pdf') ? <FileText className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Registrar Pagamento */}
                {saldoDevedor > 0 && selectedOrder.status !== 'rejeitado_financeiro' && (
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 relative z-20 pointer-events-auto">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Registrar Pagamento Parcial
                    </p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={novoPagValor}
                        onChange={e => setNovoPagValor(e.target.value)}
                        placeholder="Valor do Pagamento (R$)"
                        className="input-modern bg-white dark:bg-slate-900 border-border/60 py-2.5 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-primary/20 transition-all pointer-events-auto relative z-30"
                      />
                      <input
                        type="text"
                        value={novoPagDescricao}
                        onChange={e => setNovoPagDescricao(e.target.value)}
                        placeholder="Origem / Descrição do Recebimento"
                        className="input-modern bg-white dark:bg-slate-900 border-border/60 py-2.5 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-primary/20 transition-all pointer-events-auto relative z-30"
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-primary uppercase ml-1">ID da Transação / NSU</label>
                          <input
                            type="text"
                            value={novoPagTransactionId}
                            onChange={e => setNovoPagTransactionId(e.target.value)}
                            placeholder="Número da Transação"
                            className="input-modern bg-white dark:bg-slate-900 border-border/60 py-2.5 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-primary uppercase ml-1">4 Últimos Dígitos (Cartão)</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={novoPagCardDigits}
                            onChange={e => setNovoPagCardDigits(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ex: 1234"
                            className="input-modern bg-white dark:bg-slate-900 border-border/60 py-2.5 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <ComprovanteUpload
                          values={novoPagComprovantes}
                          onChange={setNovoPagComprovantes}
                          orderId={selectedOrder.id}
                        />
                      </div>
                      <button
                        onClick={() => adicionarPagamentoParcial(selectedOrder)}
                        disabled={salvandoPag || !novoPagValor}
                        className="w-full py-3 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 relative z-30"
                      >
                        {salvandoPag ? 'Processando...' : 'Confirmar Baixa'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Botão Dar Baixa Total — aparece enquanto houver saldo devedor */}
                {saldoDevedor > 0 && selectedOrder.status !== 'rejeitado_financeiro' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3 relative z-30 pointer-events-auto">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Quitação Rápida
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                      Registra o saldo restante de <span className="font-black text-emerald-600">{formatCurrency(saldoDevedor)}</span> como recebido e finaliza o financeiro deste pedido.
                    </p>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Confirmar quitação de ${formatCurrency(saldoDevedor)} e finalizar o pedido #${selectedOrder.number}?`)) return;
                        const toastId = toast.loading('Processando baixa e finalizando pedido...');
                        try {
                          // 1. Cria lançamento financeiro pelo valor restante para compor o Total Recebido
                          const entry: FinancialEntry = {
                            id: crypto.randomUUID(),
                            type: 'receita',
                            description: `Baixa Total (Manual) - ${selectedOrder.number}`,
                            amount: saldoDevedor,
                            category: 'Baixa Manual',
                            date: new Date().toISOString().split('T')[0],
                            status: 'pago',
                            orderId: selectedOrder.id,
                            orderNumber: selectedOrder.number,
                            clientId: selectedOrder.clientId,
                            clientName: selectedOrder.clientName,
                            paymentMethod: selectedOrder.paymentMethod || 'Manual',
                            createdAt: new Date().toISOString(),
                          };
                          
                          await addFinancialEntry(entry);

                          // 2. Determina próximo status operacional
                          const newStatus = selectedOrder.status === 'aguardando_financeiro' ? 'aguardando_producao' : selectedOrder.status;
                          
                          // 3. Atualiza o status do pedido
                          await updateOrderStatus(
                            selectedOrder.id,
                            newStatus,
                            { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true },
                            'Financeiro',
                            `Quitação total de ${formatCurrency(saldoDevedor)} realizada.`
                          );

                          // 4. Sincroniza dados globais para atualizar os cards do Dashboard
                          if (loadFromSupabase) await loadFromSupabase();

                          toast.success(`Baixa de ${formatCurrency(saldoDevedor)} realizada com sucesso!`, { id: toastId });
                          setSelectedOrderId(null);
                        } catch (err: any) {
                          toast.error('Erro ao processar baixa: ' + (err?.message || 'Tente novamente'), { id: toastId });
                        }
                      }}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto relative z-30"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirmar Baixa e Finalizar
                    </button>
                  </div>
                )}

                {/* Botão Finalizar — aparece quando saldo já está zerado mas o status ainda não é 'pago' */}
                {saldoDevedor <= 0 && selectedOrder.paymentStatus !== 'pago' && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const toastId = toast.loading('Finalizando pedido...');
                      try {
                        const newStatus = selectedOrder.status === 'aguardando_financeiro' ? 'aguardando_producao' : selectedOrder.status;
                        
                        // Para pedidos de valor zero (garantia/brinde), cria um lançamento simbólico se ainda não houver nenhum
                        if (selectedOrder.total === 0 && pagamentos.length === 0) {
                          const entry: FinancialEntry = {
                            id: crypto.randomUUID(),
                            type: 'receita',
                            description: `Finalização Financeira - ${selectedOrder.number}`,
                            amount: 0,
                            category: 'Baixa Manual',
                            date: new Date().toISOString().split('T')[0],
                            status: 'pago',
                            orderId: selectedOrder.id,
                            orderNumber: selectedOrder.number,
                            clientId: selectedOrder.clientId,
                            clientName: selectedOrder.clientName,
                            createdAt: new Date().toISOString(),
                          };
                          await addFinancialEntry(entry);
                        }

                        await updateOrderStatus(
                          selectedOrder.id,
                          newStatus,
                          { paymentStatus: 'pago', statusPagamento: 'pago', financeiroAprovado: true },
                          'Financeiro',
                          'Pedido finalizado manualmente.'
                        );

                        if (loadFromSupabase) await loadFromSupabase();
                        
                        toast.success('Pedido finalizado com sucesso!', { id: toastId });
                        setSelectedOrderId(null);
                      } catch (err: any) {
                        toast.error('Erro ao finalizar: ' + (err?.message || 'Tente novamente'), { id: toastId });
                      }
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto relative z-30"
                  >
                    <CheckCircle className="w-4 h-4" /> Finalizar Pedido
                  </button>
                )}
              </div>
            </div>

            {/* Ações de Aprovação / Reprovação / Edição */}
            <div className="space-y-4">
              {selectedOrder.status === 'aguardando_financeiro' && (
                <div className="space-y-4">
                  {!showReject ? (
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        onClick={() => aprovarEEnviarProducao(selectedOrder.id)}
                        className="col-span-3 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.03] transition-all flex items-center justify-center gap-2"
                      >
                        Aprovar para Produção
                      </button>
                      <button
                        onClick={() => setShowReject(true)}
                        className="py-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="card-premium p-6 bg-rose-500/5 border-rose-500/20 space-y-4 animate-scale-in relative z-[50]">
                      <div className="flex items-center gap-2 text-rose-500">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Rejeitar Pedido</h4>
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Descreva o motivo do indeferimento financeiro..."
                        rows={4}
                        className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none p-4 text-xs font-semibold resize-none transition-all placeholder:text-muted-foreground/60 relative z-[60] pointer-events-auto"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejeitarPedido(selectedOrder.id)}
                          disabled={!rejectReason.trim()}
                          className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-rose-600 transition-all active:scale-95 relative z-[70] pointer-events-auto"
                        >
                          Confirmar Rejeição
                        </button>
                        <button
                          onClick={() => { setShowReject(false); setRejectReason(''); }}
                          className="px-4 py-3 rounded-xl bg-muted text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all active:scale-95 relative z-[70] pointer-events-auto"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Edição e Cancelamento de Envio */}
              <div className="grid grid-cols-1 gap-3">
                {['aguardando_financeiro', 'rejeitado_financeiro'].includes(selectedOrder.status) && (
                  <button
                    onClick={handleOpenEdit}
                    className="w-full py-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Editar Valores do Pedido
                  </button>
                )}

                {['aguardando_producao', 'em_producao', 'aprovado_financeiro'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => cancelarEnvioProducao(selectedOrder.id)}
                    className="w-full py-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Cancelar Envio (Voltar p/ Aprovação)
                  </button>
                )}
              </div>
            </div>
            
            {/* Histórico e Outros */}
            <div className="card-premium p-6 space-y-4">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rastreabilidade</h3>
              <div className="space-y-4">
                <div className="relative pl-4 border-l-2 border-border/20 space-y-6">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                    <p className="text-[10px] font-black text-foreground uppercase">Criação do Orçamento</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-border border-2 border-background" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Última Atualização</p>
                    <p className="text-[10px] text-muted-foreground opacity-50">{new Date(selectedOrder.updatedAt).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
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

        {/* Modal: Ajuste Rápido de Saldo/Recebido */}
        {showQuickAdjust && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
            <div className="card-premium w-full max-w-sm p-8 space-y-6 animate-scale-in pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
                  Ajustar {showQuickAdjust === 'recebido' ? 'Valor Recebido' : 'Saldo Devedor'}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {showQuickAdjust === 'recebido' 
                    ? 'Informe o novo total que foi recebido para este pedido.' 
                    : 'Informe quanto o cliente ainda deve pagar.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Novo Valor (R$)</label>
                  <input
                    type="text"
                    autoFocus
                    value={adjustValue}
                    onChange={e => setAdjustValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdjust()}
                    placeholder="0,00"
                    className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-xl font-black tabular-nums outline-none pointer-events-auto"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQuickAdjust(); }}
                    className="flex-1 h-12 rounded-xl bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-[600]"
                  >
                    Confirmar Ajuste
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowQuickAdjust(null); }}
                    className="px-6 h-12 rounded-xl bg-muted text-muted-foreground font-black text-[11px] uppercase tracking-widest hover:bg-muted/80 transition-all cursor-pointer pointer-events-auto relative z-[600]"
                  >
                    Voltar
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-center text-muted-foreground italic leading-tight">
                * O sistema gerará um lançamento financeiro automático para igualar os valores informados.
              </p>
            </div>
          </div>
        )}

        {/* Modal: Edição Rápida de Valores */}
        {showEditModal && selectedOrder && (
          <div 
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto overflow-y-auto"
            onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}
          >
            <div 
              className="card-premium w-full max-w-2xl mt-4 mb-12 flex flex-col overflow-hidden animate-scale-in relative pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border/20 flex items-center justify-between pointer-events-auto">
                <div className="pointer-events-auto">
                  <h3 className="text-lg font-black text-foreground">Ajustar Valores do Pedido</h3>
                  <p className="text-xs text-muted-foreground">#{selectedOrder.number} • {selectedOrder.clientName}</p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }} 
                  className="p-3 hover:bg-muted rounded-full transition-all cursor-pointer pointer-events-auto relative z-50 group"
                  title="Fechar"
                >
                  <XCircle className="w-7 h-7 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Produtos e Preços</p>
                  <div className="space-y-3">
                    {tempItems.map((item, idx) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/40 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2">
                          <p className="text-sm font-bold truncate">{item.product}</p>
                          <p className="text-[10px] text-muted-foreground italic truncate">{item.description}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-muted-foreground uppercase">Quantidade</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            autoFocus={idx === 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              const numVal = val === '' ? 0 : parseInt(val);
                              setTempItems(prev => prev.map((it, i) => 
                                i === idx ? { ...it, quantity: numVal, total: numVal * it.unitPrice } : it
                              ));
                            }}
                            className="input-modern py-1.5 px-3 text-xs font-bold pointer-events-auto relative z-[160]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-muted-foreground uppercase">Preço Unit. (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.unitPrice}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              // Permite apenas números e um ponto/vírgula
                              let val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                              // Evita múltiplos pontos
                              const parts = val.split('.');
                              if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                              
                              const numVal = val === '' ? 0 : parseFloat(val);
                              setTempItems(prev => prev.map((it, i) => 
                                i === idx ? { ...it, unitPrice: isNaN(numVal) ? 0 : numVal, total: it.quantity * (isNaN(numVal) ? 0 : numVal) } : it
                              ));
                            }}
                            className="input-modern py-1.5 px-3 text-xs font-bold pointer-events-auto relative z-[160]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Tributos e Adicionais</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-muted-foreground uppercase">Impostos / taxas (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tempTaxes}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          let val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                          const parts = val.split('.');
                          if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                          const numVal = val === '' ? 0 : parseFloat(val);
                          setTempTaxes(isNaN(numVal) ? 0 : numVal);
                        }}
                        className="input-modern py-2.5 px-4 text-sm font-bold pointer-events-auto relative z-[160]"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Novo Total Previsto</p>
                      <p className="text-2xl font-black text-primary">
                        {formatCurrency(tempItems.reduce((acc, i) => acc + i.total, 0) + tempTaxes)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border/20 bg-slate-50 dark:bg-slate-900/50 flex gap-3 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); saveQuickEdit(); }}
                  className="flex-1 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer pointer-events-auto relative z-50"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}
                  className="px-8 py-4 rounded-2xl bg-muted text-muted-foreground font-black text-xs uppercase tracking-[0.2em] hover:bg-muted/80 transition-all cursor-pointer pointer-events-auto relative z-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de Confirmação de Exclusão de Comprovante */}
        {deletingReceipt && (
          <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto cursor-default"
            onClick={() => setDeletingReceipt(null)}
          >
            <div 
              className="card-premium max-w-md w-full p-8 space-y-6 text-center border-rose-500/30 shadow-[0_0_100px_rgba(0,0,0,0.9)] pointer-events-auto relative z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-20 w-20 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner border border-rose-500/20">
                <AlertTriangle className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Excluir Comprovante?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Você está prestes a remover o arquivo <span className="font-black text-foreground">"{deletingReceipt.title}"</span>. 
                  Esta ação é irreversível e o documento deixará de constar no sistema.
                </p>
              </div>

              {/* Miniatura Real do Comprovante */}
              <div className="p-4 rounded-[2.5rem] bg-muted/30 border border-border/40 flex items-center gap-5 text-left transition-all hover:bg-muted/50">
                <div className="h-24 w-24 rounded-3xl bg-background flex items-center justify-center text-muted-foreground overflow-hidden shrink-0 border border-border/60 shadow-2xl relative group/thumb">
                   {deletingReceipt.url.toLowerCase().includes('.pdf') ? (
                     <FileText className="w-12 h-12 opacity-30" />
                   ) : (
                     <img 
                       src={cleanR2Url(deletingReceipt.url)} 
                       alt="Documento" 
                       className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" 
                       onError={(e) => {
                         (e.target as any).src = 'https://via.placeholder.com/150?text=Indispon%C3%ADvel';
                       }}
                     />
                   )}
                </div>
                <div className="min-w-0 flex-1">
                   <p className="text-xs font-black text-foreground uppercase truncate tracking-widest">{deletingReceipt.title}</p>
                   <div className="flex flex-wrap gap-2 mt-2">
                     <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-[9px] font-black text-rose-500 uppercase border border-rose-500/20">
                       {deletingReceipt.category}
                     </span>
                   </div>
                   <p className="text-[10px] text-muted-foreground mt-3 font-medium opacity-60 leading-tight">Verifique se este é o anexo duplicado antes de prosseguir.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {confirmStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmStep(2); 
                      }}
                      className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-[1000000]"
                    >
                      Sim, Excluir
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDeletingReceipt(null); 
                        setConfirmStep(1);
                      }}
                      className="w-full py-4 rounded-2xl bg-muted text-muted-foreground font-black text-[11px] uppercase tracking-[0.2em] hover:bg-muted/80 active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-[1000000]"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 fill-mode-both duration-200">
                    <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-600">
                       <p className="text-sm font-black uppercase tracking-tighter">⚠️ ATENÇÃO: VOCÊ TEM CERTEZA?</p>
                       <p className="text-[10px] font-bold mt-1">O arquivo será removido permanentemente e não poderá ser recuperado.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDeleteReceipt(); 
                          setConfirmStep(1);
                        }}
                        className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/40 hover:bg-rose-700 active:scale-90 transition-all cursor-pointer pointer-events-auto relative z-[1000000]"
                      >
                        CONFIRMAR EXCLUSÃO
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setConfirmStep(1); 
                        }}
                        className="flex-1 py-4 rounded-2xl bg-muted text-muted-foreground font-black text-[11px] uppercase tracking-[0.2em] hover:bg-muted/80 active:scale-95 transition-all cursor-pointer pointer-events-auto relative z-[1000000]"
                      >
                        VOLTAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <RealtimeNotificationHandler />
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -m-12 h-64 w-64 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -m-12 h-64 w-64 rounded-full bg-blue-500/20 blur-[100px]" />
        
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Financeiro</h1>
            </div>
            <p className="text-slate-400 font-medium max-w-md">Controle completo do fluxo de caixa, aprovacões e recebíveis em tempo real.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                generateFinanceiroDashboardPDF({
                  totalPending: grandTotalPending,
                  totalReceived: totalRecebido,
                  totalAproval: aguardandoFinanceiro,
                  orders: filteredOrders.map(o => ({
                    number: o.number,
                    client: o.clientName,
                    seller: o.sellerName,
                    status: o.status,
                    total: o.total,
                    pending: getSaldoDevedor(o.id, o.total, o.paymentStatus, o.number)
                  }))
                });
                toast.success('Relatório Financeiro gerado com sucesso!');
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl transition-all shadow-xl shadow-emerald-500/30 text-xs font-black flex items-center gap-2 border border-emerald-400"
            >
              <Download className="w-4 h-4" />
              Baixar Relatório
            </button>

            <button
              onClick={syncData}
              disabled={isRefreshing}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all ${isRefreshing ? 'bg-white/10 text-white/50' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-xl'} text-xs font-bold`}
            >
              <Radio className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
              {isRefreshing ? 'Sincronizando...' : `Live: ${lastUpdate.toLocaleTimeString('pt-BR')}`}
            </button>
            
            <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />
            
            <div className="flex -space-x-3">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                   <Users2 className="w-5 h-5 text-slate-500" />
                </div>
              ))}
              <div className="h-10 w-10 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black">
                +12
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => setShowAguardandoAprovacao(true)} className="group cursor-pointer">
          <div className="card-premium h-full border-amber-500/20 hover:border-amber-500/40">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Aguardando Aprovação</p>
                <p className="text-4xl font-black text-foreground tabular-nums">{aguardandoFinanceiro}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-bold w-fit">
                  <Clock className="w-3 h-3" /> Pendente
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <Clock className="w-7 h-7" />
              </div>
            </div>
            {notificationCount > 0 && (
              <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-lg shadow-red-500/40">
                {notificationCount}
              </div>
            )}
          </div>
        </div>

        <div onClick={() => setShowAReceber(true)} className="group cursor-pointer">
          <div className="card-premium h-full border-emerald-500/20 hover:border-emerald-500/40">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Total a Receber</p>
                <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter">{formatCurrency(grandTotalPending).replace('R$', '')}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold w-fit">
                  <TrendingUp className="w-3 h-3" /> +12% esse mês
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        <div onClick={() => setShowRecebido(true)} className="group cursor-pointer">
          <div className="card-premium h-full border-blue-500/20 hover:border-blue-500/40">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/80">Total Recebido</p>
                <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter">{formatCurrency(totalRecebido).replace('R$', '')}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold w-fit">
                   <CheckCircle className="w-3 h-3" /> Saldo Confirmado
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <TrendingUp className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        <div onClick={() => setShowAguardandoProducao(true)} className="group cursor-pointer">
          <div className="card-premium h-full border-purple-500/20 hover:border-purple-500/40">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500/80">Aguard. Produção</p>
                <p className="text-4xl font-black text-foreground tabular-nums">{aguardandoLiberacao}</p>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-500 text-[10px] font-bold w-fit">
                  <Send className="w-3 h-3" /> Prontos p/ Liberar
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                <Send className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-categories grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Consignados', value: totalConsignadoOwed, icon: Star, color: 'amber', action: () => setShowConsignados(true), hasNew: newReceiptsInConsigned > 0, count: newReceiptsInConsigned },
          { label: 'Instalações', value: totalInstallationsOwed, icon: Radio, color: 'orange', action: () => setShowInstallations(true) },
          { label: 'Retiradas', value: totalRetiradasOwed, icon: Inbox, color: 'rose', action: () => setShowRetiradas(true) },
          { label: 'Carenagem', value: totalCarenagemOwed, icon: Package, color: 'indigo', action: () => setShowCarenagem(true) },
        ].map((item: any, i) => (
          <button
            key={i}
            onClick={item.action}
            className={`flex items-center gap-4 p-4 rounded-3xl border border-border/50 bg-card hover:bg-${item.color}-500/[0.03] hover:border-${item.color}-500/30 transition-all duration-300 group text-left relative ${item.hasNew ? 'animate-bounce-subtle' : ''}`}
          >
            <div className={`h-10 w-10 rounded-xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500 group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-foreground">{formatCurrency(item.value)}</p>
                {item.hasNew && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black animate-pulse">
                     {item.count} NOVO(S)
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal de Consignados */}
      {showConsignados && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-foreground text-lg">Clientes Consignados</h2>
              <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">{consignadosOrders.length}</span>
            </div>
            <button onClick={() => setShowConsignados(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-6">
            {consignedByClient.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de cliente consignado
              </div>
            ) : (
              <>
                {consignedByClient.map(group => (
                  <div key={group.clientName} className="space-y-3">
                    {/* Header do Cliente - Suavizado */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <Users2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">{group.clientName}</h3>
                          <p className="text-[10px] font-medium text-muted-foreground">{group.orders.length} pedido(s) ativo(s)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-amber-600/80 uppercase tracking-widest">Saldo Total</p>
                        <p className="text-lg font-black text-foreground">{formatCurrency(group.totalOwed)}</p>
                      </div>
                    </div>

                    {/* Lista de Pedidos do Cliente */}
                    <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-amber-500/10">
                      {group.orders.map(order => {
                        const saldo = getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
                        return (
                          <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-foreground text-sm">{order.number}</p>
                                {order.receiptUrls && order.receiptUrls.length > (order.comprovantesVistos || 0) && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black animate-pulse">💰 NOVO COMPROVANTE</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Criado em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                  PAGO: {formatCurrency(order.total - saldo)}
                                </p>
                                {saldo > 0 && order.paymentStatus !== 'pago' && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-destructive" />
                                    <span className="text-[10px] font-bold text-destructive uppercase">
                                      {calcularDiasAtraso(order.createdAt)}d
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                              <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 && order.paymentStatus !== 'pago' ? 'text-amber-500' : 'text-success'}`}>
                                SALDO: {formatCurrency(order.paymentStatus === 'pago' ? 0 : saldo)}
                              </p>
                              <div className="flex items-center justify-end gap-2">
                                <StatusBadge status={order.status} />
                                <button
                                  onClick={() => { setSelectedOrderId(order.id); setShowConsignados(false); }}
                                  className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors"
                                  title="Ver Detalhes / Receber Pagamento"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="mt-6 p-6 rounded-[2rem] bg-amber-500/5 border-2 border-dashed border-amber-500/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-amber-600/60">Total Geral Consignado</span>
                    <span className="text-xs font-bold text-muted-foreground">Soma de todos os saldos pendentes</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-500">{formatCurrency(totalConsignadoOwed)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Instalações */}
      {showInstallations && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-producao" />
              <h2 className="font-bold text-foreground text-lg">Controle de Instalações</h2>
              <span className="px-2 py-1 rounded-full bg-producao/20 text-producao text-xs font-bold">{installationOrders.length}</span>
            </div>
            <button onClick={() => setShowInstallations(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {installationOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de instalação registrado
              </div>
            ) : (
              <>
                {installationOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-producao/5 border border-producao/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • Agendado para: {order.installationDate ? format(new Date(order.installationDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Não definido'} às {order.installationTime || '—'}
                        </p>
                        <p className="text-[10px] text-producao font-bold mt-1 uppercase tracking-wider">
                          Status: {order.installationPaymentType === 'pago' ? '✓ PAGO' : '💰 PAGAR NA HORA'}
                        </p>
                        {saldo > 0 && order.paymentStatus !== 'pago' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-destructive" />
                            <span className="text-[10px] font-bold text-destructive uppercase">
                              Pendente há {calcularDiasAtraso(order.createdAt)} dias
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 && order.paymentStatus !== 'pago' ? 'text-destructive' : 'text-success'}`}>
                          SALDO: {formatCurrency(order.paymentStatus === 'pago' ? 0 : saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrderId(order.id); setShowInstallations(false); }}
                            className="w-7 h-7 rounded-lg bg-producao text-white flex items-center justify-center hover:bg-producao-dark transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-producao/10 border border-producao/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-producao">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Instalações:</span>
                  </div>
                  <span className="text-lg font-extrabold text-producao">{formatCurrency(totalInstallationsOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRetiradas && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-foreground text-lg">Controle de Retiradas</h2>
              <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">{retiradaOrders.length}</span>
            </div>
            <button onClick={() => setShowRetiradas(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {retiradaOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de retirada registrado
              </div>
            ) : (
              <>
                {retiradaOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-amber-500/5 border border-amber-500/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • Pedido em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">
                          Status Pagam.: {order.paymentStatus === 'pago' ? '✓ PAGO' : '💰 COBRAR NO LOCAL'}
                        </p>
                        {saldo > 0 && order.paymentStatus !== 'pago' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-destructive" />
                            <span className="text-[10px] font-bold text-destructive uppercase">
                              Pendente há {calcularDiasAtraso(order.createdAt)} dias
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 && order.paymentStatus !== 'pago' ? 'text-destructive' : 'text-success'}`}>
                          SALDO: {formatCurrency(order.paymentStatus === 'pago' ? 0 : saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrderId(order.id); setShowRetiradas(false); }}
                            className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:opacity-90 transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-amber-500">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Retiradas:</span>
                  </div>
                  <span className="text-lg font-extrabold text-amber-500">{formatCurrency(totalRetiradasOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhamento do Recebido */}
      {showRecebido && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h2 className="font-bold text-foreground text-lg">Detalhamento Financeiro — Recebido</h2>
              <span className="px-2 py-1 rounded-full bg-success/20 text-success text-xs font-bold">{financialEntries.filter(e => e.type === 'receita' && e.status === 'pago').length} Lançamento(s)</span>
            </div>
            <button onClick={() => setShowRecebido(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Método</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {financialEntries
                  .filter(e => e.type === 'receita' && e.status === 'pago')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(entry => (
                    <tr key={entry.id}>
                      <td className="text-xs">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="font-bold text-primary">{entry.orderNumber || '—'}</td>
                      <td className="text-xs">{entry.clientName}</td>
                      <td className="text-[10px] text-muted-foreground">{entry.description}</td>
                      <td className="text-[10px]">{entry.paymentMethod || '—'}</td>
                      <td className="text-right font-bold text-success">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={5} className="text-right font-bold uppercase text-[10px]">Total Acumulado</td>
                  <td className="text-right font-black text-success text-lg">{formatCurrency(totalRecebido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Aguardando Aprovação */}
      {showAguardandoAprovacao && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <h2 className="font-bold text-foreground text-lg">Pedidos Aguardando Aprovação</h2>
              <span className="px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold">{orders.filter(o => o.status === 'aguardando_financeiro').length}</span>
            </div>
            <button onClick={() => setShowAguardandoAprovacao(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status === 'aguardando_financeiro').length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido aguardando aprovação
              </div>
            ) : (
              orders.filter(o => o.status === 'aguardando_financeiro').map(order => (
                <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-warning/5 border border-warning/20">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-sm">{order.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <StatusBadge status={order.status} />
                      <button
                        onClick={() => { setSelectedOrderId(order.id); setShowAguardandoAprovacao(false); }}
                        className="w-7 h-7 rounded-lg bg-warning text-white flex items-center justify-center hover:bg-warning/80 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de A Receber */}
      {showAReceber && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-warning" />
              <h2 className="font-bold text-foreground text-lg">Pedidos A Receber</h2>
              <span className="px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold">{orders.filter(o => getSaldoDevedor(o.id, o.total) > 0).length}</span>
            </div>
            <button onClick={() => setShowAReceber(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => getSaldoDevedor(o.id, o.total) > 0).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido a receber
              </div>
            ) : (
              orders.filter(o => getSaldoDevedor(o.id, o.total) > 0).map(order => {
                const saldo = getSaldoDevedor(order.id, order.total);
                const pago = order.total - saldo;
                return (
                  <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-warning/5 border border-warning/20">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-bold text-foreground text-sm">{order.number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      {order.isSite && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider shadow-md shadow-blue-500/20 animate-pulse w-fit mt-1.5">
                          🌐 VENDA DO SITE
                        </div>
                      )}
                      {pago > 0 && (
                        <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-wider">
                          PAGO: {formatCurrency(pago)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                      <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 && order.paymentStatus !== 'pago' ? 'text-warning' : 'text-success'}`}>
                        SALDO: {formatCurrency(order.paymentStatus === 'pago' ? 0 : saldo)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status={order.status} />
                        <button
                          onClick={() => { setSelectedOrderId(order.id); setShowAReceber(false); }}
                          className="w-7 h-7 rounded-lg bg-warning text-white flex items-center justify-center hover:bg-warning/80 transition-colors"
                          title="Ver Detalhes / Receber Pagamento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Aguardando Produção */}
      {showAguardandoProducao && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-info" />
              <h2 className="font-bold text-foreground text-lg">Pedidos Aguardando Produção</h2>
              <span className="px-2 py-1 rounded-full bg-info/20 text-info text-xs font-bold">{orders.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_producao').length}</span>
            </div>
            <button onClick={() => setShowAguardandoProducao(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {orders.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_producao').length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido aguardando produção
              </div>
            ) : (
              orders.filter(o => o.status === 'aprovado_financeiro' || o.status === 'aguardando_producao').map(order => (
                <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-info/5 border border-info/20">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-sm">{order.number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <StatusBadge status={order.status} />
                      <button
                        onClick={() => { setSelectedOrderId(order.id); setShowAguardandoProducao(false); }}
                        className="w-7 h-7 rounded-lg bg-info text-white flex items-center justify-center hover:bg-info/80 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Carenagem */}
      {showCarenagem && (
        <div className="card-section p-6 space-y-5 animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground text-lg">Produtos de Carenagem</h2>
              <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">{carenagemOrders.length}</span>
            </div>
            <button onClick={() => setShowCarenagem(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>

          <div className="space-y-3">
            {carenagemOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum pedido de carenagem registrado
              </div>
            ) : (
              <>
                {carenagemOrders.map(order => {
                  const saldo = getSaldoDevedor(order.id, order.total);
                  return (
                    <div key={order.id} className="card-section p-4 flex items-center justify-between flex-wrap gap-3 bg-primary/5 border border-primary/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.clientName} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {order.isSite && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider shadow-md shadow-blue-500/20 animate-pulse w-fit mt-1.5">
                            🌐 VENDA DO SITE
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">{formatCurrency(order.total)}</p>
                        <p className={`text-[10px] font-extrabold mb-1 ${saldo > 0 && order.paymentStatus !== 'pago' ? 'text-destructive' : 'text-success'}`}>
                          SALDO: {formatCurrency(order.paymentStatus === 'pago' ? 0 : saldo)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <StatusBadge status={order.status} />
                          <button
                            onClick={() => { setSelectedOrderId(order.id); setShowCarenagem(false); }}
                            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-colors"
                            title="Ver Detalhes / Receber Pagamento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-primary">Total em Aberto</span>
                    <span className="font-semibold text-foreground">Saldo Carenagem:</span>
                  </div>
                  <span className="text-lg font-extrabold text-primary">{formatCurrency(totalCarenagemOwed)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!showConsignados && !showInstallations && !showRetiradas && !showRecebido && !showAguardandoAprovacao && !showAReceber && !showAguardandoProducao && !showCarenagem && (
        <div className="space-y-6">
          <div className="flex items-center p-1.5 bg-card border border-border/40 rounded-2xl w-fit group shadow-sm transition-all hover:shadow-md">
            {[
              { id: 'pedidos', label: 'Pedidos', icon: BarChart3 },
              { id: 'vendedores', label: 'Vendedores', icon: Users2 },
              { id: 'carenagem', label: 'Carenagem', icon: Package },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-transparent text-muted-foreground hover:bg-muted/50'}`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Controle por Vendedor */}
          {activeTab === 'vendedores' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card-section p-6 glass-premium">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Análise por Vendedor</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Faturamento e volume por período</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 p-1.5 bg-muted/30 rounded-2xl border border-border/20">
                    {([
                      { value: 'todos', label: 'Histórico' },
                      { value: 'hoje', label: 'Hoje' },
                      { value: '7dias', label: '7 Dias' },
                      { value: '30dias', label: '30 Dias' },
                    ] as { value: PeriodFilter; label: string }[]).map(p => (
                      <button
                        key={p.value}
                        onClick={() => setSellerPeriod(p.value)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sellerPeriod === p.value ? 'bg-white dark:bg-slate-800 text-primary shadow-lg shadow-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {sellerStats.length === 0 ? (
                <div className="card-section p-20 text-center glass-premium border-dashed">
                  <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users2 className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-foreground font-black text-lg">Sem registros no período</p>
                  <p className="text-sm text-muted-foreground mt-1">Não foram encontradas vendas para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {sellerStats.map(seller => (
                    <div key={seller.sellerId} className="card-section overflow-hidden glass-premium group hover:border-primary/30 transition-all duration-500">
                      <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border-b border-border/20 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-sm font-black text-white shadow-xl shadow-primary/20">
                              {seller.sellerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-lg" />
                          </div>
                          <div>
                            <h3 className="font-black text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">{seller.sellerName}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                {seller.qtdPedidos} Pedidos Realizados
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Faturamento Bruto</p>
                            <p className="text-2xl font-black text-emerald-500 tabular-nums tracking-tighter">{formatCurrency(seller.totalVendas)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Saldo Devedor</p>
                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${seller.totalDivida > 0 ? 'text-rose-500' : 'text-emerald-500/50'}`}>
                              {formatCurrency(seller.totalDivida)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="modern-table">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                              <th className="py-4 pl-6">PRODUTO / COMPOSIÇÃO</th>
                              <th className="text-center py-4">VOL. VENDIDO</th>
                              <th className="text-right py-4 pr-6">SUBTOTAL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                            {seller.items.sort((a, b) => b.quantity - a.quantity).map((item, idx) => (
                              <tr key={idx} className="hover:bg-primary/[0.01] transition-colors">
                                <td className="py-4 pl-6">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center">
                                      <Package className="w-4 h-4 text-muted-foreground/60" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-foreground">{item.product}</span>
                                      {item.sensorType && (
                                        <span className={`text-[8px] font-black mt-1 px-1.5 py-0.5 rounded-full inline-block w-fit ${item.sensorType === 'com_sensor' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-400/10 text-slate-500 border border-slate-400/20'}`}>
                                          {item.sensorType === 'com_sensor' ? '✓ COM SENSOR' : '⚪ SEM SENSOR'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center py-4">
                                  <span className="inline-flex items-center justify-center h-8 px-3 rounded-xl bg-primary/5 text-primary font-black text-xs border border-primary/10">
                                    {item.quantity} unidades
                                  </span>
                                </td>
                                <td className="text-right py-4 pr-6 font-black text-foreground tabular-nums text-sm">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/60 font-black text-[10px] uppercase tracking-widest">
                              <td className="py-5 pl-6 text-muted-foreground">Consolidado do Vendedor</td>
                              <td className="text-center py-5 text-foreground">{seller.items.reduce((s, i) => s + i.quantity, 0)} ITENS</td>
                              <td className="text-right py-5 pr-6 text-emerald-500 text-base">{formatCurrency(seller.totalVendas)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}

                  <div className="card-section p-8 glass-premium bg-gradient-to-br from-primary to-primary-foreground text-white border-none shadow-2xl shadow-primary/20">
                    <div className="flex items-center justify-between flex-wrap gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -m-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                      
                      <div className="relative">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Performance Global do Time</p>
                        <div className="flex items-end gap-3">
                          <p className="text-5xl font-black tracking-tighter leading-none">
                            {formatCurrency(sellerStats.reduce((s, v) => s + v.totalVendas, 0))}
                          </p>
                          <span className="text-sm font-black mb-1 opacity-80">{sellerStats.length} Vendedores Ativos</span>
                        </div>
                      </div>
                      
                      <div className="relative flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Volume de Pedidos</p>
                          <p className="text-3xl font-black leading-none">{sellerStats.reduce((s, v) => s + v.qtdPedidos, 0)}</p>
                        </div>
                        <div className="h-12 w-[1px] bg-white/20" />
                        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
                          <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Pedidos */}
          {activeTab === 'pedidos' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card-section p-6 space-y-6 glass-premium">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[300px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Buscar por número do pedido ou nome do cliente..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="input-modern pl-11 py-3.5 bg-background shadow-inner border-border/40 focus:border-primary/50 transition-all rounded-2xl"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(f => !f)}
                    className={`btn-modern px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${showFilters ? 'bg-primary text-white shadow-primary/30 border-primary' : 'bg-muted/50 text-muted-foreground hover:bg-muted border-border/40'}`}
                  >
                    <Filter className="w-4 h-4" /> Filtros Avançados
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/50 border border-border/40 animate-scale-in">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status do Fluxo</label>
                      <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value as PaymentFilter); setCurrentPage(1); }}
                        className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                      >
                        <option value="todos">Todos os Estados</option>
                        <option value="pago">Quitados / Pagos</option>
                        <option value="pendente">Aguardando Pagamento</option>
                        <option value="vencido">Pagamentos Atrasados</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Período de Referência</label>
                      <select
                        value={periodFilter}
                        onChange={e => { setPeriodFilter(e.target.value as PeriodFilter); setCurrentPage(1); }}
                        className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                      >
                        <option value="todos">Todo o histórico</option>
                        <option value="hoje">Hoje (24h)</option>
                        <option value="7dias">Últimos 7 dias</option>
                        <option value="30dias">Últimos 30 dias</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Método de Entrada</label>
                      <select
                        value={paymentMethodFilter}
                        onChange={e => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
                        className="input-modern py-2.5 bg-background border-border/40 hover:border-primary/30 focus:border-primary/50 text-xs font-bold"
                      >
                        <option value="todos">Qualquer canal</option>
                        <option value="Pix">Pix Instantâneo</option>
                        <option value="Boleto">Boleto Bancário</option>
                        <option value="Cartão">Cartão Direto</option>
                        <option value="Transferência">TED / DOC</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-section glass-premium overflow-hidden border-none shadow-2xl">
                <div className="p-6 border-b border-border/20 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary animate-pulse" />
                    Monitoramento em Tempo Real
                  </h3>
                  <span className="text-[10px] font-black text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    {filteredOrders.filter(o => !isOrderCarenagem(o)).length} REGISTROS ENCONTRADOS
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="modern-table">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <th className="cursor-pointer select-none py-5" onClick={() => handleSort('number')}>
                          <div className="flex items-center gap-1">PEDIDO {sortBy === 'number' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                        </th>
                        <th className="cursor-pointer select-none text-left py-5" onClick={() => handleSort('clientName')}>
                          <div className="flex items-center gap-1">CLIENTE {sortBy === 'clientName' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                        </th>
                        <th className="hidden md:table-cell text-left py-5">LOGÍSTICA / VENDEDOR</th>
                        <th className="cursor-pointer select-none text-right py-5 text-primary" onClick={() => handleSort('total')}>
                          <div className="flex items-center justify-end gap-1">VALOR TOTAL {sortBy === 'total' && (sortDir === 'asc' ? '↑' : '↓')}</div>
                        </th>
                        <th className="py-5">ESTÁGIO</th>
                        <th className="text-right py-5 pr-8">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {paginatedOrders.filter(o => !isOrderCarenagem(o)).map(order => {
                        const isConsigned = order.isConsigned ?? (clients.find(c => c.id === order.clientId)?.consignado || clients.find(c => c.name === order.clientName)?.consignado);
                        return (
                          <tr key={order.id} className={`group hover:bg-primary/[0.02] transition-all duration-300 ${order.isSite ? 'bg-blue-50/20 shadow-lg shadow-blue-500/5' : ''}`}>
                            <td className="font-black text-foreground py-6 select-text">
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                                <span className="select-all cursor-text">#{order.number}</span>
                              </div>
                            </td>
                            <td className="text-foreground py-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors select-all cursor-text">{order.clientName}</span>
                                <div className="flex items-center gap-1 ml-0.5 mt-1.5 flex-wrap select-text">
                                  {order.isSite && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider shadow-md shadow-blue-500/20 animate-pulse w-fit">
                                      🌐 VENDA DO SITE
                                    </div>
                                  )}
                                  {(order.orderType === 'instalacao' || order.orderType === 'manutencao') && order.installationDate && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black border border-primary/20 flex items-center gap-1">
                                      📅 {new Date(order.installationDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  {isConsigned && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black border border-amber-500/20 shadow-sm">⭐ CONSIGNADO</span>
                                  )}
                                  {order.requiresInvoice && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[8px] font-black shadow-lg shadow-primary/20 animate-pulse">📄 NF SOLICITADA</span>
                                  )}
                                  {order.requiresShippingNote && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black shadow-lg shadow-amber-500/20">📦 NOTA ENVIO</span>
                                  )}
                                  {order.isWarranty && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black shadow-lg shadow-rose-500/20 animate-pulse">🛡️ GARANTIA</span>
                                  )}
                                  {order.receiptUrls && order.receiptUrls.length > (order.comprovantesVistos || 0) && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black shadow-lg shadow-emerald-500/20 animate-bounce">💰 NOVO COMPROVANTE</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="hidden md:table-cell py-6">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Users2 className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-[11px] font-bold text-foreground/80">{order.sellerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Send className="w-3 h-3 text-muted-foreground/50" />
                                  <span className="text-[10px] font-medium text-muted-foreground">{order.paymentMethod || 'Método não especificado'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="text-right font-black text-foreground py-6 tabular-nums tracking-tighter text-base">{formatCurrency(order.total)}</td>
                            <td className="py-6"><StatusBadge status={order.status} /></td>
                            <td className="text-right py-6 pr-8">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => setSelectedOrderId(order.id)}
                                  className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-border/40 text-primary shadow-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {order.status === 'aguardando_financeiro' && (
                                  <button
                                    onClick={() => aprovarEEnviarProducao(order.id)}
                                    className="h-10 w-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                    title="Aprovar Agora"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-border/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Página {currentPage} de {totalPages} • Total {filteredOrders.length} registros
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-10 px-4 rounded-xl bg-background border border-border/40 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-muted transition-all"
                      >
                        <ChevronLeft className="w-3 h-3" /> ANTERIOR
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-10 px-4 rounded-xl bg-background border border-border/40 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-muted transition-all"
                      >
                        PRÓXIMO <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Carenagem */}
          {activeTab === 'carenagem' && (
            <div className="space-y-6 animate-fade-in pb-12">
              <div className="card-premium p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 -m-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
                
                <div className="relative flex items-center gap-4 mb-10">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/20">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Fluxo de Carenagem</h2>
                    <p className="text-sm font-medium text-muted-foreground">Processamento acelerado: Financeiro → Produto Liberado</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-border/40 shadow-inner">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Pedidos em Fluxo</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-foreground leading-none">{carenagemOrders.length}</p>
                      <span className="text-xs text-muted-foreground font-bold mb-1">Unidades</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 shadow-xl shadow-primary/[0.02]">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Total Aguardando Recebimento</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-primary leading-none tracking-tighter">{formatCurrency(totalCarenagemOwed).replace('R$', 'R$ ')}</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-foreground/5 border border-foreground/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Regra de Negócio</p>
                      <p className="text-xs font-black text-foreground">Bypass de Produção Ativo</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Fila de Processamento
                    </h3>
                  </div>
                  
                  {carenagemOrders.length === 0 ? (
                    <div className="p-20 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-dashed border-border/60">
                      <div className="h-20 w-20 rounded-full bg-background mx-auto flex items-center justify-center mb-4 shadow-inner">
                        <Inbox className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-base font-black text-foreground">Tudo limpo por aqui!</p>
                      <p className="text-sm text-muted-foreground mt-1">Nenhum pedido de carenagem pendente no momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {carenagemOrders.map(order => {
                        const saldo = getSaldoDevedor(order.id, order.total, order.paymentStatus, order.number);
                        return (
                          <div key={order.id} className="group p-5 rounded-[2rem] bg-white dark:bg-slate-800/40 border border-border/40 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/[0.05] transition-all duration-500">
                            <div className="flex items-center justify-between flex-wrap gap-6">
                              <div className="flex items-center gap-5">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl ${saldo > 0 ? 'bg-amber-500 shadow-amber-500/20 text-white' : 'bg-emerald-500 shadow-emerald-500/20 text-white'}`}>
                                  #{order.number.slice(-3)}
                                  {order.receiptUrls && order.receiptUrls.length > (order.comprovantesVistos || 0) && (
                                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[8px] font-black shadow-lg shadow-emerald-500/20 animate-bounce whitespace-nowrap z-10">💰 NOVO</div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-black text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">{order.clientName}</h4>
                                  <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                                    <span className="h-1 w-1 rounded-full bg-border" />
                                    <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> {order.sellerName}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-10">
                                <div className="text-right shrink-0">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status Financeiro</p>
                                  <p className={`text-sm font-black ${saldo > 0 ? 'text-amber-500' : 'text-emerald-500'} flex items-center justify-end gap-1.5`}>
                                    {saldo > 0 ? (
                                      <>
                                        {formatCurrency(saldo)}
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                      </>
                                    ) : 'QUITADO ✓'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <StatusBadge status={order.status} />
                                  <div className="h-10 w-[1px] bg-border/20 mx-2 hidden sm:block" />
                                  
                                  <button
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  
                                  {order.status === 'aguardando_financeiro' && (
                                    <>
                                      <button
                                        onClick={() => handleAprovarCarenagem(order.id)}
                                        className="h-12 w-12 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                        title="Aprovar e Liberar"
                                      >
                                        <CheckCircle className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => { setSelectedOrderId(order.id); setShowReject(true); }}
                                        className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                                      >
                                        <XCircle className="w-5 h-5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

export default FinanceiroDashboard;
