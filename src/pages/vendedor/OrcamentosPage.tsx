// Versão Modernizada - 12/03/2026
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { cleanR2Url } from '@/lib/storageServiceR2';
import { StatusBadge, formatCurrency, formatDate } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { FileText, Plus, Send, Eye, ArrowLeft, Search, X, Trash2, History, MessageCircle, Edit2, Check, Download, Link2, DollarSign, CheckCircle, Users, Package, Truck, CheckCircle2, XCircle, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Zap, Info } from 'lucide-react';
import type { Order, QuoteItem } from '@/types/erp';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { InstallationCalendar } from '@/components/shared/InstallationCalendar';
import { checkInstallationConflict, saveInstallation, deleteInstallationByOrder, InstallationAppointment } from '@/lib/installationServiceSupabase';
import { cancelRedeemReward } from '@/lib/rewardServiceSupabase';
import { fetchMaxOrderNumberGlobal } from '@/lib/orderServiceSupabase';

// Função local para gerar próximo número de ordem
const getNextOrderNumber = (existingOrders: Order[]): number => {
  if (existingOrders.length === 0) return 1;
  const numbers = existingOrders
    .map(o => parseInt(o.number.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  return Math.max(...numbers, 0) + 1;
};
// Helper para parse de valores monetários (suporta vírgula brasileira)
const parsePrice = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = String(val).replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

// Helper para formatar input de moeda enquanto digita (máscara)
const formatMoeda = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  if (isNaN(cents)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

// Status que bloqueiam a edição do orçamento
// Fluxo: Vendedor → Financeiro → Produção (sem etapa de Gestor)
const STATUS_BLOQUEIAM_EDICAO = ['aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
  'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'];

const SearchableSelect = React.memo(({
  value,
  options,
  onChange,
  placeholder = "Selecionar...",
  className = "",
  icon: Icon
}: {
  value: string;
  options: { id: string; label: string; sublabel?: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => options.filter(o =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.sublabel && o.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [options, searchTerm]);

  return (
    <div className={`relative ${className} ${isOpen ? 'z-[100]' : 'z-0'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 rounded-xl bg-white/50 border border-white/40 flex items-center justify-between text-sm font-semibold hover:bg-white/70 transition-all focus:ring-4 focus:ring-primary/10 overflow-hidden"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
          <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-white/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-200 min-w-[300px]">
          <div className="p-3 border-b border-border/40 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border-none text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-[10px] font-black uppercase italic">Nenhum resultado</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full p-3 rounded-xl text-left transition-all flex flex-col gap-0.5 group ${value === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-foreground'
                    }`}
                >
                  <span className="text-xs font-bold truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className={`text-[9px] font-medium uppercase tracking-wider ${value === opt.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {opt.sublabel}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const ModernDatePicker = React.memo(({
  value,
  onChange,
  placeholder = "Selecionar data..."
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const handleDateClick = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  return (
    <div className={`relative ${isOpen ? 'z-[160]' : 'z-0'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-12 px-4 rounded-xl bg-white/50 border border-white/40 flex items-center justify-between text-sm font-bold hover:bg-white/70 transition-all focus:ring-4 focus:ring-primary/10 overflow-hidden"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value ? format(parseISO(value), "dd 'de' MMMM, yyyy", { locale: ptBR }) : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-white/40 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[200] animate-in fade-in zoom-in-95 duration-200 min-w-[300px]">
          <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-muted-foreground/60">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                const isSelected = value && isSameDay(day, parseISO(value));
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square rounded-lg text-xs font-bold transition-all flex items-center justify-center relative
                      ${!isCurrentMonth ? 'text-muted-foreground/20' : 'text-foreground hover:bg-primary/10'}
                      ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10' : ''}
                      ${isTodayDate && !isSelected ? 'text-primary' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {isTodayDate && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 border-t border-border/40 bg-muted/10 flex justify-between">
            <button
              type="button"
              onClick={() => handleDateClick(new Date())}
              className="text-[10px] font-black uppercase text-primary hover:underline px-2"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-[10px] font-black uppercase text-destructive hover:underline px-2"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const OrcamentosPage: React.FC = () => {
  const { orders, addOrder, updateOrderStatus, editOrderFull, clients, products, deleteOrder, financialEntries, loadOrderDetails, monthlyClosings } = useERP();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const detailRef = useRef<HTMLDivElement>(null);

  // Se navegado desde a ficha do cliente, abre o form já com cliente pré-selecionado
  const preSelectedClientId: string = (location.state as any)?.clientId ?? '';
  const preSelectedReward: any = (location.state as any)?.reward ?? null;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(() => !!preSelectedClientId);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [comprovantesAttached, setComprovantesAttached] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [sendingToFinance, setSendingToFinance] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeReward, setActiveReward] = useState<{ id: string; type: string; quantity: number } | null>(null);
  const [viewCycle, setViewCycle] = useState<'atual' | 'historico'>('atual');
  // ✅ Isolamento e Fechamento Mensal
  const myOrders = useMemo(() => {
    const unfilteredList = (orders || []).filter(o =>
      user?.role !== 'vendedor' || o.sellerId === user?.id
    );

    if (user?.role !== 'vendedor') return unfilteredList;

    // Pega o último fechamento deste vendedor para definir o ciclo
    const closings = (monthlyClosings || []).filter(c => c.sellerId === user?.id);
    const lastClosingDate = closings.length > 0 
      ? new Date(closings.sort((a, b) => new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime())[0].closingDate)
      : null;

    if (viewCycle === 'historico') {
      return unfilteredList.filter(o => {
        const isQuote = ['rascunho', 'enviado', 'aprovado_cliente'].includes(o.status);
        if (isQuote) return false; 
        return lastClosingDate && new Date(o.createdAt) <= lastClosingDate;
      });
    }

    return unfilteredList.filter(o => {
      const isQuote = ['rascunho', 'enviado', 'aprovado_cliente'].includes(o.status);
      if (isQuote) return true;
      return !lastClosingDate || new Date(o.createdAt) > lastClosingDate;
    });
  }, [orders, user, monthlyClosings, viewCycle]);

  // ✅ TODOS OS VENDEDORES VÊM TODOS OS CLIENTES (compartilhados)
  // Isolamento de ORDERS já garante que cada vendedor só edita seus próprios
  const myClients = clients;

  // Form state for new/edit order
  const [newClientId, setNewClientId] = useState(preSelectedClientId);
  const [newItems, setNewItems] = useState<{ product: string; description: string; quantity: number; unitPrice: string | number; sensorType?: 'com_sensor' | 'sem_sensor'; isReward?: boolean; rewardId?: string; installationDate?: string; installationTime?: string; showCalendar?: boolean }[]>(
    [{ product: '', description: '', quantity: 1, unitPrice: '', installationDate: '', installationTime: '', showCalendar: false }]
  );
  const [newNotes, setNewNotes] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newOrderType, setNewOrderType] = useState<'entrega' | 'instalacao' | 'manutencao' | 'retirada'>('entrega');
  const [newInstallationTime, setNewInstallationTime] = useState('');
  const [newInstallationPaymentType, setNewInstallationPaymentType] = useState<'pago' | 'pagar_na_hora'>('pago');
  const [newCarrier, setNewCarrier] = useState('');
  const [newRequiresInvoice, setNewRequiresInvoice] = useState(false);
  const [newRequiresShippingNote, setNewRequiresShippingNote] = useState(false);

  // Abre pedido via URL (?view=ID)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewId = params.get('view');
    if (viewId) {
      const order = orders.find(o => o.id === viewId);
      if (order) {
        setSelectedOrder(order);
        setComprovantesAttached(order.receiptUrls || []);
      }
    }
  }, [location.search, orders]);

  // Se vier um clientId novo pelo estado, atualiza
  useEffect(() => {
    if (preSelectedClientId) {
      setNewClientId(preSelectedClientId);
      setShowCreate(true);
    }
  }, [preSelectedClientId]);

  // Se vier um prêmio pelo estado, inicializa o item premiado
  useEffect(() => {
    if (preSelectedReward && !editingOrder && products.length > 0) {
      const rewardId = preSelectedReward.id;
      const type = preSelectedReward.type;
      const quantity = preSelectedReward.quantity || 1;
      
      // Armazena no estado local para persistir após limpar location.state
      setActiveReward({ id: rewardId, type, quantity });

      let rewardProduct = '';
      let rewardDescription = 'ITEM PREMIADO';

      if (type === 'tier_1') {
        const prod = products.find(p => p.name.toUpperCase().includes('PLAQUINHA') && p.name.toUpperCase().includes('NYLON'));
        rewardProduct = prod ? prod.name : '';
        rewardDescription = 'RESGATE DE PRÊMIO: 5 KITS COMPRADOS';
      } else if (type === 'tier_2') {
        rewardDescription = 'RESGATE DE PRÊMIO: 7 KITS (VALOR CHEIO)';
      } else if (type === 'tier_3') {
        rewardDescription = 'RESGATE DE PRÊMIO: 10 KITS (VALOR PROMO)';
      }

      // Cria a lista de itens baseada na quantidade solicitada
      const rewardItems = Array.from({ length: quantity }, () => ({
        product: rewardProduct,
        description: rewardDescription,
        quantity: 1,
        unitPrice: 0,
        isReward: true,
        rewardId: rewardId
      }));

      setNewItems(rewardItems);
      setShowCreate(true);

      const helpMsg = type === 'tier_1'
        ? `Você está resgatando ${quantity} prêmio(s) (5 kits cada). Selecione o item.`
        : `Você está resgatando ${quantity} prêmio(s) de Meta de Kits. Selecione o modelo.`;

      toast.success('Modo de resgate múltiplo!', {
        description: helpMsg,
        duration: 8000
      });

      // Limpa o estado da navegação para evitar que o formulário reabra após resetForm()
      navigate(location.pathname, { 
        replace: true, 
        state: { 
          ...location.state, 
          reward: null 
        } 
      });
    }
  }, [preSelectedReward, products, editingOrder, navigate, location.pathname, location.state]);

  const filtered = useMemo(() => myOrders.filter(o =>
    String(o.number).toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase())
  ), [myOrders, search]);

  const summary = useMemo(() => {
    let vendidos = 0;
    let rejeitados = 0;
    
    filtered.forEach(order => {
      const isRejected = order.status === 'rejeitado_financeiro';
      const isQuote = ['rascunho', 'enviado', 'aprovado_cliente'].includes(order.status);
      
      order.items.forEach(item => {
        const isFree = item.isReward || Number(item.unitPrice) === 0 || Number(item.total) === 0;
        if (isFree) return; // Skip rewards

        const prodName = item.product.toUpperCase();
        if (prodName.includes('KIT') || prodName.includes('ESTRIBO')) {
           if (isRejected) rejeitados += item.quantity;
           else if (!isQuote) vendidos += item.quantity;
        }
      });
    });
    
    return { vendidos, rejeitados };
  }, [filtered]);

  // Envia para o financeiro — apenas via botão explícito
  const enviarFinanceiro = async (orderId: string) => {
    try {
      setSendingToFinance(true);
      const receipts = comprovantesAttached.length > 0 ? comprovantesAttached : (selectedOrder?.receiptUrls || []);
      
      const isAdvanced = ['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(selectedOrder?.status || '');
      const newStatus = isAdvanced ? selectedOrder!.status : 'aguardando_financeiro';

      await updateOrderStatus(
        orderId, newStatus,
        receipts.length > 0 ? { receiptUrls: receipts } : undefined,
        user?.name || 'Vendedor',
        isAdvanced ? 'Novos comprovantes anexados pelo vendedor' : (receipts.length > 0 ? 'Enviado para aprovação financeira com comprovante(s)' : 'Enviado para aprovação financeira')
      );
      console.log('[OrcamentosPage] ✅ Orçamento enviado para financeiro');
      setSelectedOrder(null);
      setComprovantesAttached([]);
      setSuccessMessage('Pedido enviado com sucesso para o financeiro!');
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 2500);
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ Erro ao enviar para financeiro:', err?.message ?? err);
      alert('❌ Erro ao enviar: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSendingToFinance(false);
    }
  };

  // Status que permitem excluir o orçamento (não enviados ou rejeitados pelo financeiro)
  const podeExcluir = (status: string) =>
    ['rascunho', 'enviado', 'aprovado_cliente', 'rejeitado_financeiro'].includes(status);

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Tem certeza que deseja excluir o orçamento ${orderNumber}? Esta ação não pode ser desfeita.`)) return;
    try {
      setDeletingOrderId(orderId);
      await deleteOrder(orderId);
      await deleteInstallationByOrder(orderId); // Limpa agendamento se existir
      setSelectedOrder(null);
      console.log('[OrcamentosPage] ✅ Orçamento excluído:', orderNumber);
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ Erro ao excluir orçamento:', err?.message ?? err);
      alert('❌ Erro ao excluir: ' + (err?.message || 'Tente novamente'));
    } finally {
      setDeletingOrderId(null);
    }
  };

  const addItem = () => setNewItems(prev => [...prev, { product: '', description: '', quantity: 1, unitPrice: '', installationDate: '', installationTime: '', showCalendar: false }]);
  const removeItem = (i: number) => setNewItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    setNewItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const totalGeral = useMemo(() => newItems.reduce((s, item) => {
    const price = parsePrice(item.unitPrice);
    return s + (item.quantity * price);
  }, 0), [newItems]);

  // Abre o formulário de edição para um orçamento existente
  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setNewClientId(order.clientId);
    setNewItems(order.items.map(i => ({
      product: i.product,
      description: i.description || '',
      quantity: i.quantity,
      unitPrice: formatMoeda(String((i.unitPrice || 0) * 100)),
      sensorType: i.sensorType,
      installationDate: i.installationDate || '',
      installationTime: i.installationTime || '',
      showCalendar: false,
    })));
    setNewNotes(order.notes || '');
    setNewObservation(order.observation || '');
    setNewDeliveryDate(order.deliveryDate || '');
    setNewOrderType(order.orderType || 'entrega');
    setNewInstallationTime(order.installationTime || '');
    setNewInstallationPaymentType(order.installationPaymentType || 'pago');
    setNewCarrier(order.carrier || '');
    setNewRequiresInvoice(order.requiresInvoice || false);
    setNewRequiresShippingNote(order.requiresShippingNote || false);
    setFormError('');
  };

  const resetForm = (isSuccess = false) => {
    setEditingOrder(null);
    setShowCreate(false);
    setNewClientId('');
    setNewItems([{ product: '', description: '', quantity: 1, unitPrice: '', installationDate: '', installationTime: '', showCalendar: false }]);
    setNewNotes('');
    setNewObservation('');
    setNewDeliveryDate('');
    setNewOrderType('entrega');
    setNewInstallationTime('');
    setNewInstallationPaymentType('pago');
    setNewCarrier('');
    setNewRequiresInvoice(false);
    setNewRequiresShippingNote(false);
    setFormError('');
    if (activeReward && isSuccess !== true) {
      cancelRedeemReward(activeReward.id, activeReward.quantity).then(success => {
        if (success) console.log(`[OrcamentosPage] 🔄 Resgate de ${activeReward.quantity} prêmio(s) cancelado e estornado.`);
      });
    }
    setActiveReward(null);
  };

  const handleCopyTracking = (orderId: string) => {
    const url = `${window.location.origin}/rastreio/${orderId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de rastreio copiado!', {
      description: 'Envie para o cliente acompanhar o pedido.'
    });
  };

  const handleCreateOrder = async () => {
    setFormError('');

    // ────────────────────────────
    // VALIDAÇÕES
    // ────────────────────────────
    const client = clients.find(c => c.id === newClientId);
    if (!client) {
      setFormError('⚠️ Por favor, selecione um cliente.');
      return;
    }

    if (newItems.some(i => !i.product)) {
      setFormError('⚠️ Todos os itens devem ter um produto selecionado.');
      return;
    }

    if (newItems.some(i => !i.quantity || i.quantity <= 0)) {
      setFormError('⚠️ Todos os itens devem ter quantidade maior que 0.');
      return;
    }

    if (newItems.some(i => {
      const price = parsePrice(i.unitPrice);
      return isNaN(price) || price < 0;
    })) {
      setFormError('⚠️ Todos os itens devem ter preço unitário válido (0 ou maior).');
      return;
    }

    if (user?.role === 'vendedor' && newItems.some(i => {
      const price = parsePrice(i.unitPrice);
      return price === 0 && !i.isReward;
    })) {
      setFormError('⚠️ Vendedores não podem criar itens com valor R$ 0,00, exceto se forem de Premiação.');
      return;
    }

    const subtotal = totalGeral;
    if (subtotal < 0) {
      setFormError('⚠️ O valor total do orçamento deve ser maior ou igual a R$ 0,00.');
      return;
    }

    const now = new Date().toISOString();

    // Validação extra para instalação/manutenção
    if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
      // Se houver agendamento por item, validamos os itens
      const itemsWithSchedule = newItems.filter(i => i.installationDate && i.installationTime);
      
      if (itemsWithSchedule.length === 0 && (!newDeliveryDate || !newInstallationTime)) {
        setFormError(`⚠️ Informe a data e o horário da ${newOrderType === 'instalacao' ? 'instalação' : 'manutenção'}. Você pode agendar cada item individualmente.`);
        return;
      }

      // Verifica conflitos para o agendamento global (se houver)
      if (newDeliveryDate && newInstallationTime) {
        const hasConflict = await checkInstallationConflict(newDeliveryDate, newInstallationTime);
        if (hasConflict && !editingOrder) {
          setFormError('⚠️ O horário global escolhido já está ocupado. Escolha outro.');
          return;
        }
      }

      // Verifica conflitos para cada item agendado
      for (const item of itemsWithSchedule) {
        const hasConflict = await checkInstallationConflict(item.installationDate!, item.installationTime!);
        if (hasConflict && !editingOrder) {
          setFormError(`⚠️ O horário para o item "${item.product}" (${item.installationTime}) já está ocupado.`);
          return;
        }
      }
    }

    // ────────────────────────────
    // MODO EDIÇÃO
    // ────────────────────────────
    if (editingOrder) {
      try {
        setSavingOrder(true);
        const now = new Date().toISOString();
        const updatedOrder: Order = {
          ...editingOrder,
          clientId: client.id,
          clientName: client.name,
          items: newItems.map((item, i) => {
            const price = parsePrice(item.unitPrice);
            return {
              id: editingOrder.items[i]?.id || `ni${i}`,
              product: item.product,
              description: item.description,
              quantity: item.quantity,
              unitPrice: price,
              discount: editingOrder.items[i]?.discount || 0,
              discountType: editingOrder.items[i]?.discountType || 'percent',
              total: item.quantity * price,
              sensorType: item.sensorType,
              isReward: (item as any).isReward,
              rewardId: (item as any).rewardId,
              installationDate: item.installationDate,
              installationTime: item.installationTime,
            };
          }),
          subtotal,
          taxes: 0,
          total: subtotal,
          notes: newNotes,
          observation: newObservation,
          deliveryDate: newDeliveryDate || undefined,
          orderType: newOrderType,
          installationPaymentType: (newOrderType === 'instalacao' || newOrderType === 'manutencao' || newOrderType === 'retirada') ? newInstallationPaymentType : undefined,
          carrier: newOrderType === 'entrega' ? newCarrier : undefined,
          isConsigned: client.consignado,
          isSite: client.isSite || false,
          requiresInvoice: newRequiresInvoice,
          requiresShippingNote: newRequiresShippingNote,
          updatedAt: now,
        };

        console.log('[OrcamentosPage] 📝 Editando orçamento:', updatedOrder.number);
        await editOrderFull(updatedOrder);

        // Se mudou para instalação/manutenção ou alterou dados, atualiza agenda
        if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
          await deleteInstallationByOrder(updatedOrder.id);
          
          // Se houver agendamento global, salva ele
          if (newDeliveryDate && newInstallationTime) {
            await saveInstallation({
              order_id: updatedOrder.id,
              seller_id: user?.id || '1',
              client_name: client.name,
              date: newDeliveryDate,
              time: newInstallationTime,
              payment_type: newInstallationPaymentType,
              type: newOrderType
            });
          }

          // Salva agendamentos individuais por item
          for (const item of newItems) {
            if (item.installationDate && item.installationTime) {
              await saveInstallation({
                order_id: updatedOrder.id,
                seller_id: user?.id || '1',
                client_name: client.name,
                product_name: item.product,
                date: item.installationDate,
                time: item.installationTime,
                payment_type: newInstallationPaymentType,
                type: newOrderType
              });
            }
          }
        } else if ((editingOrder.orderType === 'instalacao' || editingOrder.orderType === 'manutencao') && newOrderType === 'entrega') {
          await deleteInstallationByOrder(updatedOrder.id);
        }

        setFormError('');
        resetForm(true);
        setSuccessMessage('Orçamento atualizado com sucesso!');
        setShowSuccessAnim(true);
        setTimeout(() => setShowSuccessAnim(false), 2500);
      } catch (err: any) {
        console.error('[OrcamentosPage] ❌ Erro ao editar orçamento:', err?.message ?? err);
        const errMsg = err?.message ?? String(err);
        if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique') || errMsg.includes('409')) {
          setFormError('❌ Conflito: Este horário de instalação já foi ocupado ou o número do pedido já existe.');
        } else {
          setFormError(`❌ Erro ao editar orçamento: ${errMsg || 'Tente novamente'}`);
        }
      } finally {
        setSavingOrder(false);
      }
      return;
    }

    // ────────────────────────────
    // MODO CRIAÇÃO (com retry)
    // ────────────────────────────
    setSavingOrder(true);
    const createOrderWithRetry = async (maxAttempts = 3) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[OrcamentosPage] 🔄 TENTATIVA ${attempt}/${maxAttempts}: Gerando número do pedido global...`);
          // 🔥 BUG FIX: Busca o maior número global do banco, não apenas o do estado local (que é filtrado por vendedor)
          const globalMaxNumber = await fetchMaxOrderNumberGlobal();
          const nextNumber = globalMaxNumber + 1;
          console.log(`[OrcamentosPage] ✅ Próximo número global: ${nextNumber}`);

          const now = new Date().toISOString();
          const order: Order = {
            id: crypto.randomUUID(),
            number: `PED-${String(nextNumber).padStart(3, '0')}`,
            clientId: client.id,
            clientName: client.name,
            sellerId: user?.id || '1',
            sellerName: user?.name || 'Vendedor',
            items: newItems.map((item, i) => {
              const price = parsePrice(item.unitPrice);
              return {
                id: `ni${i}`,
                product: item.product,
                description: item.description,
                quantity: item.quantity,
                unitPrice: price,
                discount: 0,
                discountType: 'percent' as const,
                total: item.quantity * price,
                sensorType: item.sensorType || (item.product.toUpperCase().includes('KIT') ? 'com_sensor' : undefined),
                isReward: (item as any).isReward,
                rewardId: (item as any).rewardId,
                installationDate: item.installationDate,
                installationTime: item.installationTime,
              };
            }),
            subtotal,
            taxes: 0,
            total: subtotal,
            status: 'rascunho',
            paymentStatus: 'pendente',
            notes: newNotes,
            observation: newObservation,
            deliveryDate: newDeliveryDate || undefined,
            orderType: newOrderType,
            isConsigned: client.consignado,
            isSite: client.isSite || false,
            requiresInvoice: newRequiresInvoice,
            requiresShippingNote: newRequiresShippingNote,
            createdAt: now,
            updatedAt: now,
            statusHistory: [{
              status: 'rascunho',
              timestamp: now,
              user: user?.name || 'Vendedor',
              note: 'Orçamento criado'
            }],
          };

          if (newOrderType === 'instalacao' || newOrderType === 'manutencao' || newOrderType === 'retirada') {
            order.installationDate = newDeliveryDate || undefined;
            order.installationTime = newInstallationTime || undefined;
            order.installationPaymentType = newInstallationPaymentType;
          }
          if (newOrderType === 'entrega') {
            order.carrier = newCarrier;
          }

          await addOrder(order);

          if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
            // Salva agendamento global se houver
            if (newDeliveryDate && newInstallationTime) {
              await saveInstallation({
                order_id: order.id,
                seller_id: user?.id || '1',
                client_name: client.name,
                date: newDeliveryDate,
                time: newInstallationTime,
                payment_type: newInstallationPaymentType,
                type: newOrderType
              });
            }

            // Salva agendamentos individuais por item
            for (const item of newItems) {
              if (item.installationDate && item.installationTime) {
                await saveInstallation({
                  order_id: order.id,
                  seller_id: user?.id || '1',
                  client_name: client.name,
                  product_name: item.product,
                  date: item.installationDate,
                  time: item.installationTime,
                  payment_type: newInstallationPaymentType,
                  type: newOrderType
                });
              }
            }
          }

          setFormError('');
          resetForm(true);
          setSuccessMessage('Orçamento criado com sucesso!');
          setShowSuccessAnim(true);
          setTimeout(() => setShowSuccessAnim(false), 2500);
          console.log(`[OrcamentosPage] ✨ SUCESSO! Orçamento ${order.number} criado.`);
          return;
        } catch (err: any) {
          const errMsg = err?.message ?? String(err);
          console.error(`[OrcamentosPage] ❌ Tentativa ${attempt} falhou:`, errMsg);

          const isDuplicate = errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique');
          const shouldRetry = attempt < maxAttempts && (
            isDuplicate ||
            errMsg.toLowerCase().includes('timeout') ||
            errMsg.toLowerCase().includes('network')
          );

          if (shouldRetry) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw err;
          }
        }
      }
    };

    try {
      await createOrderWithRetry();
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ ERRO CRÍTICO:', err?.message ?? err);
      const errMsg = err?.message ?? String(err);
      let userMessage = 'Erro ao criar orçamento. Tente novamente.';

      if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique') || errMsg.includes('409')) {
        userMessage = '❌ Erro: Conflito de dados. O número do pedido ou o horário já existe.';
      } else if (errMsg.toLowerCase().includes('permission')) {
        userMessage = '❌ Erro de permissão. Verifique se você está logado.';
      } else if (errMsg.toLowerCase().includes('foreign key')) {
        userMessage = '❌ Erro de integridade: O pedido não pôde ser vinculado à instalação.';
      }

      setFormError(userMessage);
    } finally {
      setSavingOrder(false);
    }
  };

  const openWhatsApp = (phone: string) =>
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');

  // Função para baixar PDF do orçamento - Profissional e bem formatado
  const downloadPDF = async (order: Order) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // ═══ HEADER ═══
      pdf.setFontSize(24);
      pdf.setTextColor(0, 102, 204); // Azul
      pdf.text('ORÇAMENTO', 15, yPosition);

      yPosition += 12;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Data: ${formatDate(order.createdAt)}`, 15, yPosition);
      pdf.text(`Validade: 30 dias`, 90, yPosition);
      pdf.text(`Número: ${order.number}`, 150, yPosition);

      yPosition += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ INFORMAÇÕES DO CLIENTE ═══
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 51, 102);
      pdf.text('CLIENTE', 15, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${order.clientName}`, 15, yPosition);

      const client = clients.find(c => c.id === order.clientId);
      if (client) {
        yPosition += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`CPF/CNPJ: ${client.cpfCnpj || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Telefone: ${client.phone || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Email: ${client.email || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Endereço: ${client.address} - ${client.city}/${client.state} - ${client.cep}`, 15, yPosition);
      }

      yPosition += 12;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ INFORMAÇÕES DO VENDEDOR ═══
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 51, 102);
      pdf.text('VENDEDOR RESPONSÁVEL', 15, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${order.sellerName}`, 15, yPosition);

      if (order.orderType === 'entrega' && order.carrier) {
        pdf.setFontSize(11);
        pdf.setTextColor(0, 51, 102);
        pdf.text('TRANSPORTADORA', 120, yPosition - 6);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(order.carrier, 120, yPosition);
      }

      yPosition += 12;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ TABELA DE PRODUTOS ═══
      yPosition += 10;

      // Headers da tabela
      pdf.setFillColor(0, 102, 204);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.rect(15, yPosition - 5, 180, 6, 'F');
      pdf.text('PRODUTO', 18, yPosition);
      pdf.text('QTDE', 120, yPosition);
      pdf.text('VLR UNIT.', 145, yPosition);
      pdf.text('SUBTOTAL', 175, yPosition);

      yPosition += 8;
      pdf.setTextColor(0, 0, 0);

      // Linhas de produtos
      order.items.forEach((item, idx) => {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 15;

          // Repetir headers em nova página
          pdf.setFillColor(0, 102, 204);
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.rect(15, yPosition - 5, 180, 6, 'F');
          pdf.text('PRODUTO', 18, yPosition);
          pdf.text('QTDE', 120, yPosition);
          pdf.text('VLR UNIT.', 145, yPosition);
          pdf.text('SUBTOTAL', 175, yPosition);

          yPosition += 8;
          pdf.setTextColor(0, 0, 0);
        }

        // Fundo alternado para melhor legibilidade
        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(15, yPosition - 4, 180, 6, 'F');
        }

        pdf.setFontSize(9);
        // Produto com sensor destacado
        let productName = item.product;
        if (item.product.toUpperCase().includes('KIT') && item.sensorType) {
          productName += ` (${item.sensorType === 'com_sensor' ? 'COM SENSOR' : 'SEM SENSOR'})`;
        }

        // Truncar texto longo
        const lines = pdf.splitTextToSize(productName, 95);
        lines.forEach((line, i) => {
          pdf.text(line, 18, yPosition + (i * 3));
        });

        pdf.text(item.quantity.toString(), 122, yPosition);
        pdf.text(`R$ ${item.unitPrice.toFixed(2)}`, 147, yPosition);
        pdf.text(`R$ ${item.total.toFixed(2)}`, 172, yPosition);

        yPosition += 7;
      });

      // ═══ LINHAS DE TOTAIS ═══
      yPosition += 3;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('SUBTOTAL:', 140, yPosition);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`R$ ${order.subtotal.toFixed(2)}`, 172, yPosition);

      yPosition += 6;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 102, 204);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL:', 140, yPosition);
      pdf.setFontSize(14);
      pdf.text(`R$ ${order.total.toFixed(2)}`, 165, yPosition);

      // ═══ OBSERVAÇÕES ═══
      if (order.observation || order.notes) {
        yPosition += 12;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(15, yPosition, 195, yPosition);

        yPosition += 6;
        pdf.setFontSize(10);
        pdf.setTextColor(0, 51, 102);
        pdf.setFont(undefined, 'bold');
        pdf.text('OBSERVAÇÕES:', 15, yPosition);

        yPosition += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');

        const combinedObs = [
          order.observation ? `Geral: ${order.observation}` : null,
          order.notes ? `Notas: ${order.notes}` : null
        ].filter(Boolean).join('\n\n');

        const obsLines = pdf.splitTextToSize(combinedObs, 180);
        obsLines.forEach((line: string, i: number) => {
          pdf.text(line, 15, yPosition + (i * 4));
        });
      }

      // ═══ RODAPÉ ═══
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Este orçamento é válido por 30 dias. Para confirmar seu pedido, favor retornar assinado ou via email.', 15, pageHeight - 10);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 6);

      pdf.save(`Orcamento_${order.number}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };
  // ── Formulário de criação/edição ────────────────────────────
  if (showCreate || editingOrder) {
    const isEdit = !!editingOrder;
    return (
      <div className="space-y-8 animate-scale-in pb-20 max-w-[1400px] mx-auto">
        {/* Header Elegante */}
        <div className="flex items-center justify-between flex-wrap gap-6 px-4 py-6 rounded-[2.5rem] bg-gradient-to-r from-primary/5 via-white/40 to-transparent border border-white/40 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white shadow-2xl shadow-primary/30 -rotate-3 transition-transform hover:rotate-0">
               {isEdit ? <Edit2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                {isEdit ? `Editar Orçamento` : 'Novo Orçamento'}
              </h1>
              <p className="text-sm font-bold text-muted-foreground/80 tracking-wide uppercase">
                {isEdit ? `Ajustando detalhes do ${editingOrder?.number}` : 'Crie orçamentos premium em poucos segundos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => resetForm()}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 shadow-none text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            <X className="w-4 h-4" /> Cancelar Edição
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            {/* Seção Cliente e Info */}
            <div className="glass-card p-10 rounded-[3rem] space-y-10 border-white/60 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full -mr-64 -mt-64 blur-[100px] transition-colors duration-1000 group-hover:bg-primary/10" />
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-1.5 ml-1">
                    <Users className="w-3.5 h-3.5" /> Cliente do Orçamento
                  </label>
                  <SearchableSelect
                    value={newClientId}
                    onChange={val => {
                      setNewClientId(val);
                      if (!editingOrder) {
                        const client = myClients.find(c => c.id === val);
                        if (client?.notes && !newObservation) {
                          setNewObservation(client.notes);
                          toast.info(`📋 Observações do cliente importadas.`);
                        }
                      }
                    }}
                    placeholder="Selecione um cliente para prosseguir..."
                    icon={Users}
                    options={myClients.map(c => ({
                      id: c.id,
                      label: c.name,
                      sublabel: c.consignado ? '⭐ Cliente Consignado' : undefined
                    }))}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 mb-1.5 ml-1">
                    <History className="w-3.5 h-3.5" /> Notas Internas
                  </label>
                  <textarea
                    value={newObservation}
                    onChange={e => setNewObservation(e.target.value)}
                    placeholder="Observações que aparecerão para o financeiro e produção..."
                    className="input-modern min-h-[56px] py-4 bg-white/70 border-white/60 focus:bg-white resize-none shadow-sm focus:shadow-md transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                <div 
                  onClick={() => setNewRequiresInvoice(!newRequiresInvoice)}
                  className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 group/card ${newRequiresInvoice ? 'bg-primary/10 border-primary ring-8 ring-primary/5 shadow-2xl shadow-primary/10' : 'bg-muted/30 border-dashed border-border/60 hover:border-primary/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-700 ${newRequiresInvoice ? 'bg-primary rotate-0 scale-110 shadow-primary/40' : 'bg-muted-foreground/30 scale-100 rotate-6 opacity-60 group-hover/card:rotate-0'}`}>
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className={`text-base font-black uppercase tracking-tight transition-colors ${newRequiresInvoice ? 'text-primary' : 'text-foreground'}`}>Nota Fiscal (NF)</h3>
                        <p className="text-[11px] text-muted-foreground font-bold italic tracking-wide mt-0.5">Fluxo financeiro oficial</p>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${newRequiresInvoice ? 'bg-primary text-white' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                       {newRequiresInvoice ? <Check className="w-6 h-6 animate-scale-in" /> : <Plus className="w-6 h-6" />}
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setNewRequiresShippingNote(!newRequiresShippingNote)}
                  className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 group/card ${newRequiresShippingNote ? 'bg-amber-500/10 border-amber-500 ring-8 ring-amber-500/5 shadow-2xl shadow-amber-500/10' : 'bg-muted/30 border-dashed border-border/60 hover:border-amber-500/40 hover:bg-white/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-700 ${newRequiresShippingNote ? 'bg-amber-500 rotate-0 scale-110 shadow-amber-500/40' : 'bg-muted-foreground/30 scale-100 rotate-6 opacity-60 group-hover/card:rotate-0'}`}>
                        <Truck className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className={`text-base font-black uppercase tracking-tight transition-colors ${newRequiresShippingNote ? 'text-amber-600' : 'text-foreground'}`}>Nota de Envio</h3>
                        <p className="text-[11px] text-muted-foreground font-bold italic tracking-wide mt-0.5">Acompanhamento simples</p>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${newRequiresShippingNote ? 'bg-amber-500 text-white' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                       {newRequiresShippingNote ? <Check className="w-6 h-6 animate-scale-in" /> : <Plus className="w-6 h-6" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-foreground flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary"><Package className="w-6 h-6" /></div>
                  Carrinho de Itens
                </h2>
                <button
                  onClick={addItem}
                  className="btn-modern bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> Adicionar Produto
                </button>
              </div>

              <div className="space-y-6">
                {newItems.map((item, i) => (
                  <div key={i} className={`glass-card p-8 rounded-[2.5rem] border-white/60 shadow-xl relative animate-in fade-in slide-in-from-bottom-6 duration-700 hover:shadow-2xl transition-all ${item.isReward ? '!bg-blue-50/90 dark:!bg-blue-900/10 border-blue-500/40 ring-4 ring-blue-500/5 shadow-blue-500/10' : ''}`}>
                    {item.isReward && (
                      <div className="absolute -top-3 left-8 px-5 py-2 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/30 z-10 animate-pulse">
                        🏆 Item de Premiação
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      <div className="md:col-span-12 lg:col-span-6 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Produto / Serviço</label>
                        <SearchableSelect
                          value={item.product}
                          onChange={val => {
                            const selectedProduct = products.find(p => p.name === val);
                            const newItem = { ...item, product: val };
                            if (selectedProduct) {
                              newItem.description = selectedProduct.description;
                              if (val.toUpperCase().includes('KIT')) {
                                newItem.sensorType = 'com_sensor';
                              } else {
                                delete newItem.sensorType;
                              }
                            }
                            const updated = [...newItems];
                            updated[i] = newItem;
                            setNewItems(updated);
                          }}
                          placeholder="Digite ou selecione o produto..."
                          icon={Package}
                          options={products
                            .filter(p => p.category !== 'Carenagem' || user?.email === 'higorfeerreira9@gmail.com')
                            .filter(p => {
                               if (!item.isReward) return true;
                               const isKit = p.name.toUpperCase().includes('KIT') || p.name.toUpperCase().includes('SPRINTER');
                               if (activeReward?.type === 'tier_1') return !isKit;
                               if (activeReward?.type === 'tier_2' || activeReward?.type === 'tier_3') return isKit;
                               return true;
                            })
                            .map(p => ({
                              id: p.name,
                              label: p.name,
                              sublabel: p.name.toUpperCase().includes('KIT') ? '🏷️ KIT COMPLETO' : p.category
                            }))
                          }
                        />
                      </div>

                      <div className="md:col-span-12 lg:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-center block">Qtd</label>
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          disabled={item.isReward}
                          onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                          className={`input-modern text-center text-lg font-black h-14 bg-white/50 border-white/40 shadow-inner ${item.isReward ? 'bg-muted/50 cursor-not-allowed opacity-60' : ''}`}
                        />
                      </div>

                      <div className="md:col-span-12 lg:col-span-4 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preço Unitário</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={item.unitPrice}
                            disabled={item.isReward}
                            onChange={e => updateItem(i, 'unitPrice', formatMoeda(e.target.value))}
                            className={`input-modern pl-12 text-base font-black h-14 bg-white/50 border-white/40 shadow-inner ${item.isReward ? 'bg-muted/50 cursor-not-allowed opacity-60' : 'text-primary'}`}
                          />
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                          
                          <div className="absolute top-1/2 -translate-y-1/2 right-4 text-right">
                             <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Subtotal</p>
                             <p className="text-sm font-black text-foreground leading-none">{formatCurrency(parsePrice(item.unitPrice) * item.quantity)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-border/10">
                      <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-2 w-full">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic opacity-60">Especificações Técnicas / Observações do Item</label>
                          <input
                            placeholder="Ex: Cor personalizada, voltagem especial, detalhes de montagem..."
                            value={item.description}
                            onChange={e => updateItem(i, 'description', e.target.value)}
                            className="input-modern py-3 text-xs h-12 bg-white/70 border-white/60 shadow-sm"
                          />
                        </div>

                        <div className="flex items-center gap-4 self-stretch md:self-end">
                          {item.product.toUpperCase().includes('KIT') ? (
                            <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-primary ml-1">Kit Sensor</label>
                              <div className="flex gap-2 p-1.5 bg-black/5 rounded-2xl border border-black/5">
                                <button
                                  type="button"
                                  onClick={() => updateItem(i, 'sensorType', 'com_sensor')}
                                  className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${item.sensorType === 'com_sensor'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-white/40 text-muted-foreground hover:bg-white'
                                    }`}
                                >
                                  {item.sensorType === 'com_sensor' && <CheckCircle2 className="w-3 h-3 animate-scale-in" />} COM SENSOR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateItem(i, 'sensorType', 'sem_sensor')}
                                  className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 ${item.sensorType === 'sem_sensor'
                                    ? 'bg-slate-500 text-white shadow-lg'
                                    : 'bg-white/40 text-muted-foreground hover:bg-white'
                                    }`}
                                >
                                  {item.sensorType === 'sem_sensor' && <CheckCircle2 className="w-3 h-3 animate-scale-in" />} SEM SENSOR
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {newItems.length > 1 && (
                            <button
                              onClick={() => removeItem(i)}
                              className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all flex items-center justify-center border border-destructive/10 shadow-lg shadow-destructive/5 self-end mb-1"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Agendamento Individual de Item - COMPACTO E RETRÁTIL */}
                      {(newOrderType === 'instalacao' || newOrderType === 'manutencao') && item.product && (
                        <div className="mt-6 p-4 rounded-[2rem] bg-slate-50 border border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center justify-between px-2">
                             <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${item.installationDate ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-primary/10 text-primary'}`}>
                                 <CalendarIcon className="w-5 h-5" />
                               </div>
                               <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                                   Agendamento - Produto {i + 1}
                                 </p>
                                 <p className="text-[11px] font-bold text-muted-foreground">
                                   {item.installationDate 
                                     ? `${formatDate(item.installationDate)} às ${item.installationTime}`
                                     : 'Horário não definido'}
                                 </p>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                               {item.installationDate && (
                                 <button 
                                   onClick={() => { updateItem(i, 'installationDate', ''); updateItem(i, 'installationTime', ''); }}
                                   className="h-9 px-4 rounded-xl text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/20"
                                 >
                                   Limpar
                                 </button>
                               )}
                               <button 
                                 onClick={() => updateItem(i, 'showCalendar', !item.showCalendar)}
                                 className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase transition-all border ${item.showCalendar ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary border-primary/20 hover:bg-primary/5'}`}
                               >
                                 {item.showCalendar ? 'Fechar Agenda' : item.installationDate ? 'Alterar Horário' : 'Selecionar Horário'}
                               </button>
                             </div>
                          </div>

                          {item.showCalendar && (
                            <div className="pt-2 animate-in slide-in-from-top-4 duration-300">
                              <InstallationCalendar
                                compact
                                selectedDate={item.installationDate}
                                selectedTime={item.installationTime}
                                excludeAppointments={newItems
                                  .filter((_, idx) => idx !== i)
                                  .map(it => ({ 
                                    date: it.installationDate || '', 
                                    time: it.installationTime || '' 
                                  }))
                                  .filter(it => it.date && it.time)
                                }
                                onSelect={(date, time) => {
                                  updateItem(i, 'installationDate', date);
                                  updateItem(i, 'installationTime', time);
                                  updateItem(i, 'showCalendar', false); // Fecha após selecionar
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 sticky top-24">
            <div className="glass-card p-8 rounded-[3rem] border-white/60 shadow-2xl space-y-10 group overflow-hidden">
               <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />

              <div className="space-y-6 relative">
                <label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 ml-1">
                  <Truck className="w-4 h-4" /> Modalidade de Logística
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {(['entrega', 'instalacao', 'manutencao', 'retirada'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewOrderType(t)}
                      className={`relative overflow-hidden py-5 px-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-500 flex flex-col items-center gap-3 ${newOrderType === t
                        ? 'bg-primary border-primary text-white shadow-2xl shadow-primary/30 scale-[1.03] ring-8 ring-primary/10'
                        : 'bg-white/50 border-white/80 text-muted-foreground hover:bg-white hover:border-primary/40'
                        }`}
                    >
                      <span className={`text-3xl transition-transform duration-500 ${newOrderType === t ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                        {t === 'entrega' ? '🚚' : t === 'instalacao' ? '🔧' : t === 'manutencao' ? '🛠️' : '📦'}
                      </span>
                      <span className="relative z-10">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative space-y-8">
                {newOrderType === 'entrega' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Previsão para Entrega</label>
                      <ModernDatePicker
                        value={newDeliveryDate}
                        onChange={setNewDeliveryDate}
                        placeholder="Clique para selecionar a data..."
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Transportador / Responsável</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['JADLOG', 'LALAMOVE', 'KLEYTON', 'MOTOBOY', 'OUTRO'].map(c => {
                          const isPredefined = ['JADLOG', 'LALAMOVE', 'KLEYTON', 'MOTOBOY'].includes(newCarrier);
                          const isActive = c === 'OUTRO' ? !isPredefined && newCarrier !== '' : newCarrier === c;

                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCarrier(c === 'OUTRO' ? '' : c)}
                              className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${isActive
                                ? 'bg-primary/10 border-primary text-primary shadow-xl shadow-primary/5'
                                : 'bg-white/60 border-white/80 text-muted-foreground hover:border-primary/20'
                                }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                      {(!['JADLOG', 'LALAMOVE', 'KLEYTON', 'MOTOBOY'].includes(newCarrier) || newCarrier === '') && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                          <input
                            type="text"
                            placeholder="Nome da Transportadora Especial..."
                            value={newCarrier === 'OUTRO' ? '' : newCarrier}
                            onChange={e => setNewCarrier(e.target.value.toUpperCase())}
                            className="input-modern bg-white/90 border-primary/20 shadow-lg h-14 focus:border-primary transition-all font-black text-xs px-6 rounded-2xl"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {newOrderType === 'retirada' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Data Marcada para Retirada</label>
                      <ModernDatePicker
                        value={newDeliveryDate}
                        onChange={setNewDeliveryDate}
                        placeholder="Quando o cliente vem buscar?"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Condição de Pagamento</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['pago', 'pagar_na_hora'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewInstallationPaymentType(p)}
                            className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newInstallationPaymentType === p
                              ? 'bg-success border-success text-white shadow-2xl shadow-success/20 scale-[1.03]'
                              : 'bg-white/60 border-white/80 text-muted-foreground'
                              }`}
                          >
                            {p === 'pago' ? '💳 Já Pago' : '🤝 Pagar na Retirada'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(newOrderType === 'instalacao' || newOrderType === 'manutencao') && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
                    <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/20 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Info className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Agendamento Multi-Item</p>
                          <p className="text-[11px] font-bold text-muted-foreground leading-tight">Defina os horários individualmente em cada item do carrinho acima.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {newItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/60">
                            <span className="text-[10px] font-black text-foreground uppercase truncate max-w-[120px]">
                              {idx + 1}. {item.product || 'Produto não selecionado'}
                            </span>
                            {item.installationDate ? (
                              <span className="px-2 py-1 rounded-lg bg-success/10 text-success text-[9px] font-black">
                                {formatDate(item.installationDate)}
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[9px] font-black italic">
                                PENDENTE
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['pago', 'pagar_na_hora'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewInstallationPaymentType(p)}
                          className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${newInstallationPaymentType === p
                            ? 'bg-success border-success text-white shadow-2xl shadow-success/20'
                            : 'bg-white/60 border-white/80 text-muted-foreground'
                            }`}
                        >
                          {p === 'pago' ? '💳 Já Pago' : '🤝 Pagar na Hora'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-10 border-t border-border/10 space-y-8 relative">
                <div className="flex justify-between items-center bg-gradient-to-br from-white/40 to-white/10 p-6 rounded-[2rem] border border-white/60 shadow-inner">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Total Acumulado</p>
                    <p className="text-4xl font-black text-foreground drop-shadow-sm">{formatCurrency(totalGeral)}</p>
                  </div>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                    <DollarSign className="w-8 h-8" />
                  </div>
                </div>

                {formError && (
                  <div className="p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/20 text-destructive text-[10px] font-black uppercase text-center animate-bounce shadow-xl">
                    ⚠️ {formError}
                  </div>
                )}

                <button
                  onClick={handleCreateOrder}
                  disabled={savingOrder}
                  className="group relative w-full h-20 rounded-3xl bg-primary text-white font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <span className="relative flex items-center justify-center gap-4">
                    {savingOrder ? (
                       <Zap className="w-6 h-6 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                    {savingOrder ? 'Processando Pedido...' : isEdit ? 'Salvar Alterações' : 'Finalizar e Gerar Orçamento'}
                  </span>
                </button>
                
                {!isEdit && (
                  <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                    Ao criar o orçamento, você poderá gerar o PDF e enviar ao cliente
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Detalhe do orçamento selecionado ────────────────────────
  if (selectedOrder) {
    const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(selectedOrder.status);
    const podeGerenciarComprovantes = [
      'rascunho', 'enviado', 'aprovado_cliente', 'rejeitado_financeiro', 'aguardando_financeiro',
      'aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
    ].includes(selectedOrder.status);

    return (
      <>
        <div 
          ref={detailRef} 
          className={`card-section p-6 space-y-5 animate-scale-in relative z-0 ${
            selectedOrder.isSite ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/10' : 
            selectedOrder.isConsigned ? 'border-2 border-amber-500 shadow-lg shadow-amber-500/10' : 
            ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-foreground text-lg">{selectedOrder.number}</h2>
              {clients.find(c => c.id === selectedOrder.clientId)?.consignado && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                  ⭐ Consignado
                </span>
              )}
              {selectedOrder.isSite && (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 animate-pulse">
                   🌐 VENDA DO SITE
                 </span>
               )}
            </div>
            <div className="flex items-center gap-2">
              {/* Botão Copiar Link de Rastreio */}
              <button
                onClick={() => handleCopyTracking(selectedOrder.id)}
                className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-1.5 hover:bg-primary/20"
                title="Copiar link de rastreio para o cliente"
              >
                <Link2 className="w-3.5 h-3.5" /> Rastreio
              </button>
              {/* Botão Download PDF */}
              <button
                onClick={() => downloadPDF(selectedOrder)}
                className="btn-modern bg-blue-500/10 text-blue-500 shadow-none text-xs px-3 py-1.5 hover:bg-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              {/* Botão Editar — bloqueado se status avançado */}
              {podeEditar ? (
                <button
                  onClick={() => { openEdit(selectedOrder); setSelectedOrder(null); }}
                  className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-1.5 hover:bg-primary/20"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                  🔒 Edição bloqueada
                </span>
              )}
              {/* Botão Excluir — apenas para rascunho ou rejeitado */}
              {podeExcluir(selectedOrder.status) && (
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.number)}
                  disabled={deletingOrderId === selectedOrder.id}
                  className="btn-modern bg-destructive/10 text-destructive shadow-none text-xs px-3 py-1.5 hover:bg-destructive/20 disabled:opacity-50"
                  title="Excluir orçamento"
                >
                  {deletingOrderId === selectedOrder.id
                    ? <span className="animate-spin">⚙️</span>
                    : <><Trash2 className="w-3.5 h-3.5" /> Excluir</>}
                </button>
              )}
              <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
            </div>
          </div>

          {/* Pipeline visual */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso do Pedido</p>
            <OrderPipeline order={selectedOrder} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Cliente</span><span className="font-semibold text-foreground">{selectedOrder.clientName}</span></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Status</span><StatusBadge status={selectedOrder.status} /></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Data</span><span className="text-foreground font-medium">{formatDate(selectedOrder.createdAt)}</span></div>
            <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Total</span><span className="font-extrabold text-foreground text-lg">{formatCurrency(selectedOrder.total)}</span></div>
            
            {/* Exibe Data de Entrega ou Agendamento se houver */}
            {(selectedOrder.deliveryDate || selectedOrder.installationDate) && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 col-span-2 md:col-span-1 animate-in fade-in slide-in-from-top-1">
                <span className="text-xs text-primary font-bold block mb-1 uppercase tracking-tight">
                  📅 {selectedOrder.orderType === 'entrega' ? 'Data da Entrega' : 'Data do Agendamento'}
                </span>
                <span className="font-black text-primary text-base">
                  {formatDate(selectedOrder.deliveryDate || selectedOrder.installationDate)}
                  {selectedOrder.installationTime && ` às ${selectedOrder.installationTime}`}
                </span>
              </div>
            )}
            {/* Meio de Entrega */}
            <div className="p-3 rounded-xl bg-muted/30">
              <span className="text-xs text-muted-foreground block mb-1">Meio de Entrega</span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground uppercase tracking-tight">
                  {selectedOrder.orderType === 'retirada' ? '📦 Retirada'
                    : selectedOrder.orderType === 'instalacao' ? '🔧 Instalação'
                      : selectedOrder.orderType === 'manutencao' ? '🛠️ Manutenção'
                        : selectedOrder.carrier ? `🚚 Entrega via ${selectedOrder.carrier.toUpperCase()}` : '🚚 Entrega padrão'}
                </span>
                {selectedOrder.orderType === 'instalacao' && selectedOrder.installationTime && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 mt-0.5 animate-in fade-in slide-in-from-left-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Horário: {selectedOrder.installationTime}
                  </span>
                )}
              </div>
              {(selectedOrder.orderType === 'retirada' || selectedOrder.orderType === 'instalacao' || selectedOrder.orderType === 'manutencao') && (
                <span className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${selectedOrder.installationPaymentType === 'pago'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-700 border-amber-500/40'
                  }`}>
                  {selectedOrder.installationPaymentType === 'pago' ? '✅ Já pago' : `⚠️ Pagar na ${selectedOrder.orderType === 'retirada' ? 'Retirada' : 'Instalação'}`}
                </span>
              )}
            </div>
            {/* Notas / Documentos */}
            <div className="flex flex-col gap-2">
              <div className={`p-3 rounded-xl ${selectedOrder.requiresInvoice ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                <span className="text-xs text-muted-foreground block mb-1">Nota Fiscal</span>
                <span className={`font-semibold ${selectedOrder.requiresInvoice ? 'text-primary' : 'text-foreground'}`}>
                  {selectedOrder.requiresInvoice ? '⚠️ Com Nota Fiscal' : 'Sem Nota Fiscal'}
                </span>
              </div>
              {selectedOrder.requiresShippingNote && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-xs text-amber-600 block mb-1">Nota de Envio</span>
                  <span className="font-semibold text-amber-600">
                    📦 Nota de Envio Solicitada
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alerta de Rejeição */}
          {selectedOrder.status === 'rejeitado_financeiro' && selectedOrder.rejectionReason && (
            <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 space-y-2 animate-pulse">
              <p className="text-[10px] font-black uppercase tracking-wider text-destructive flex items-center gap-1.5">
                ❌ Pedido Rejeitado pelo Financeiro
              </p>
              <p className="text-sm text-destructive font-semibold">{selectedOrder.rejectionReason}</p>
              <p className="text-[10px] text-muted-foreground">Corrija as pendencias e reenvie o pedido.</p>
            </div>
          )}

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="modern-table">
              <thead><tr><th>Produto</th><th>Descrição</th><th className="text-right">Qtd</th><th className="text-right hidden sm:table-cell">Unit.</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {selectedOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {item.product}
                          {item.product.toUpperCase().includes('KIT') && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${(!item.sensorType || item.sensorType === 'com_sensor') ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'} border border-primary/30`}>
                              {(!item.sensorType || item.sensorType === 'com_sensor') ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                            </span>
                          )}
                        </span>
                        {(item.installationDate || item.installationTime) && (
                          <span className="text-[10px] font-black text-primary mt-1 flex items-center gap-1">
                            📅 Agendado para: {formatDate(item.installationDate)} {item.installationTime ? `às ${item.installationTime}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                    <td className="text-right text-foreground">{item.quantity}</td>
                    <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-border/40">
            <div className="text-xl font-extrabold text-foreground">Total: {formatCurrency(selectedOrder.total)}</div>
          </div>

          {/* Observações */}
          {(selectedOrder.observation || selectedOrder.notes) && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              {selectedOrder.observation && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação Geral</p>
                  <p className="text-sm text-foreground">{selectedOrder.observation}</p>
                </div>
              )}
              {selectedOrder.notes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📝 Notas Adicionais</p>
                  <p className="text-sm text-foreground italic">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Central de Comprovantes */}
          {(() => {
            const orderPayments = financialEntries?.filter(e => e.orderId === selectedOrder.id && e.type === 'receita') || [];
            const allVouchers: { url: string; title: string; category: string; date?: string }[] = [];
            const seenUrls = new Set<string>();

            if (selectedOrder.receiptUrl) {
              allVouchers.push({ url: selectedOrder.receiptUrl, title: 'Comprovante Principal', category: 'Venda' });
              seenUrls.add(selectedOrder.receiptUrl);
            }
            if (selectedOrder.receiptUrls && selectedOrder.receiptUrls.length > 0) {
              selectedOrder.receiptUrls.forEach((url, i) => {
                if (!seenUrls.has(url)) {
                  allVouchers.push({ url, title: `Anexo Pedido #${i + 1}`, category: 'Venda' });
                  seenUrls.add(url);
                }
              });
            }

            orderPayments.forEach(p => {
              if (p.receiptUrl && !seenUrls.has(p.receiptUrl)) {
                allVouchers.push({ url: p.receiptUrl, title: p.description || 'Comprovante', category: 'Recebimento', date: p.date });
                seenUrls.add(p.receiptUrl);
              }
              if (p.receiptUrls && p.receiptUrls.length > 0) {
                p.receiptUrls.forEach((url, i) => {
                  if (!seenUrls.has(url)) {
                    allVouchers.push({ url, title: `${p.description || 'Pagamento'} (${i + 1})`, category: 'Recebimento', date: p.date });
                    seenUrls.add(url);
                  }
                });
              }
            });

            if (allVouchers.length === 0) return null;

            return (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Comprovantes e Anexos ({allVouchers.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allVouchers.map((rec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(cleanR2Url(rec.url)); }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-border/60 hover:border-primary/40 transition-all text-left group cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        {rec.url.toLowerCase().includes('.pdf') ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-foreground truncate uppercase">{rec.title}</p>
                        <p className="text-[8px] text-muted-foreground font-medium uppercase truncate">
                          {rec.category}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Histórico de status */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Histórico de Movimentações
            </p>
            <OrderHistory order={selectedOrder} />
          </div>

          {/* Central de Comprovantes */}
          {podeGerenciarComprovantes && (() => {
            const client = clients.find(c => c.id === selectedOrder.clientId);
            const clienteConsignado = !!client?.consignado;
            const isInstalacao = selectedOrder.orderType === 'instalacao';
            const isManutencao = selectedOrder.orderType === 'manutencao';
            const isRetirada = selectedOrder.orderType === 'retirada';
            const isOnlyReward = selectedOrder.items.every(item => item.isReward === true);
            const isWaiting = selectedOrder.status === 'aguardando_financeiro';
            const isAdvanced = ['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(selectedOrder.status);
            const temComprovante = (comprovantesAttached.length > 0) || (selectedOrder.receiptUrls && selectedOrder.receiptUrls.length > 0);

            // Regras: 
            // 1. Consignado pode enviar sem (vendedor anexa depois)
            // 2. Serviços (Instalação/Manutenção/Retirada) podem enviar sem
            // 3. SE FOR APENAS PRÊMIO, pode enviar sem.
            // 4. Caso tenha produto normal + prêmio, precisa de comprovante (exceto se for consignado).
            const podeEnviar = (clienteConsignado || isInstalacao || isManutencao || isRetirada || isOnlyReward) ? true : temComprovante;

            return (
              <>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <ComprovanteUpload
                    values={comprovantesAttached.length > 0 ? comprovantesAttached : (selectedOrder.receiptUrls || [])}
                    onChange={setComprovantesAttached}
                    label={(clienteConsignado || isOnlyReward)
                      ? `Comprovantes de Pagamento (opcional para ${isOnlyReward ? 'resgate de prêmio' : 'clientes consignados'})`
                      : "Comprovantes de Pagamento (obrigatório para enviar ao Financeiro)"}
                  />
                  {isOnlyReward && !temComprovante && (
                    <p className="text-[10px] text-success mt-2 flex items-center gap-1">
                      🎁 Pedido exclusivo de Premiação — envio sem comprovante liberado.
                    </p>
                  )}
                  {clienteConsignado && !isOnlyReward && !temComprovante && (
                    <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                      ⭐ Cliente consignado — pode enviar sem comprovante. O financeiro registrará os pagamentos parciais.
                    </p>
                  )}
                  {isInstalacao && !temComprovante && (
                    <p className="text-[10px] text-producao mt-2 flex items-center gap-1">
                      🔧 Pedido de Instalação — pode enviar sem comprovante (especialmente se for "Pagar na hora").
                    </p>
                  )}
                  {isManutencao && !temComprovante && (
                    <p className="text-[10px] text-indigo-500 mt-2 flex items-center gap-1">
                      🛠️ Pedido de Manutenção — pode enviar sem comprovante (especialmente se for "Pagar na hora").
                    </p>
                  )}
                  {isRetirada && !temComprovante && (
                    <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                      📦 Pedido de Retirada — pode enviar sem comprovante (especialmente se for "Cobrar no Local").
                    </p>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">
                  {clients.find(c => c.id === selectedOrder.clientId)?.phone && (
                    <button
                      onClick={() => openWhatsApp(clients.find(c => c.id === selectedOrder.clientId)!.phone)}
                      className="btn-modern bg-success/10 text-success hover:bg-success/20 shadow-none text-xs"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp Cliente
                    </button>
                  )}
                  <button
                    onClick={() => enviarFinanceiro(selectedOrder.id)}
                    disabled={(!podeEnviar && !isWaiting && !isAdvanced) || sendingToFinance}
                    className="btn-modern bg-gradient-to-r from-vendedor to-vendedor/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    <Send className="w-4 h-4" /> {sendingToFinance ? '⏳ Enviando...' : isWaiting || isAdvanced ? '🔄 Atualizar Comprovantes' : '🟢 Enviar para Financeiro'}
                  </button>
                </div>
                {!clienteConsignado && !isInstalacao && !isManutencao && !isRetirada && !isOnlyReward && !temComprovante && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    ⚠️ Anexe o comprovante de pagamento para habilitar o envio ao financeiro
                  </p>
                )}
              </>
            );
          })()}

        </div>

        {/* Modal de Visualização (Detail View) */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-[10000] flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
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
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all font-inter"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}
                  className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8" onClick={e => e.stopPropagation()}>
              {previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={previewUrl} title="Documento" className="w-full max-w-5xl h-full rounded-2xl bg-white border-none shadow-2xl" />
              ) : (
                <img src={cleanR2Url(previewUrl)} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              )}
            </div>
          </div>
        )}

        {/* Overlay de Sucesso com Animação */}
        {showSuccessAnim && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/40 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-border/40 flex flex-col items-center text-center gap-6 animate-check-popup">
              <div className="checkmark-circle">
                <svg className="w-full h-full" viewBox="0 0 52 52">
                  <path
                    className="checkmark-check fill-none stroke-success stroke-[4]"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-wider mb-2">Sucesso!</h3>
                <p className="text-muted-foreground font-medium">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Lista de orçamentos ─────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4 px-2">
        <div className="space-y-1">
          <h1 className="page-header text-3xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white shadow-xl shadow-primary/20 -rotate-3 transition-transform hover:rotate-0">
              <Plus className="w-6 h-6" />
            </div>
            Meus Orçamentos
          </h1>
          <p className="page-subtitle font-medium">Controle total sobre suas vendas e negociações</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/50 group"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" /> Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-1">
        <div className="glass-card p-6 rounded-3xl border-white/40 shadow-xl space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total {viewCycle === 'atual' ? 'em Aberto' : 'do Histórico'}</p>
          <p className="text-2xl font-black text-foreground">{formatCurrency(filtered.reduce((s, o) => s + o.total, 0))}</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border-white/40 shadow-xl space-y-1 border-l-4 border-l-primary">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pedidos no {viewCycle === 'atual' ? 'Ciclo' : 'Histórico'}</p>
          <p className="text-2xl font-black text-foreground">{filtered.length}</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border-white/40 shadow-xl space-y-1 border-l-4 border-l-success">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens Vendidos</p>
          <p className="text-2xl font-black text-foreground">{summary.vendidos}</p>
        </div>
        <div className="glass-card p-6 rounded-3xl border-white/40 shadow-xl space-y-1 border-l-4 border-l-destructive">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens Rejeitados</p>
          <p className="text-2xl font-black text-foreground">{summary.rejeitados}</p>
        </div>
      </div>

      {/* Seletor de Ciclo (Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-2xl w-fit border border-border/20 mx-1">
        <button
          onClick={() => setViewCycle('atual')}
          className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            viewCycle === 'atual' 
              ? 'bg-white text-primary shadow-lg ring-1 ring-black/5' 
              : 'text-muted-foreground hover:bg-white/50'
          }`}
        >
          📅 Ciclo Atual
        </button>
        <button
          onClick={() => setViewCycle('historico')}
          className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${
            viewCycle === 'historico' 
              ? 'bg-white text-vendedor shadow-lg ring-1 ring-black/5' 
              : 'text-muted-foreground hover:bg-white/50'
          }`}
        >
          📂 Histórico / Fechados
        </button>
      </div>

      <div className="relative group px-1">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder={`Buscar em ${viewCycle === 'atual' ? 'Ciclo Atual' : 'Histórico'}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-modern pl-14 h-16 rounded-[1.5rem] bg-white/40 border-white/40 focus:bg-white shadow-lg focus:shadow-primary/10 text-base font-medium"
        />
      </div>

      <div className="glass-card rounded-[2rem] border-white/40 shadow-2xl overflow-hidden animate-in fade-in duration-700">
        <div className="overflow-x-auto">
          <table className="modern-table border-separate border-spacing-y-3">
            <thead>
              <tr className="bg-transparent border-none">
                <th className="px-8 py-5"># Pedido</th>
                <th className="px-8 py-5">📝 Cliente</th>
                <th className="hidden md:table-cell text-right px-8 py-5">💰 Valor</th>
                <th className="hidden lg:table-cell px-8 py-5">🏁 Progresso</th>
                <th className="px-8 py-5">🏷️ Status</th>
                <th className="text-right px-8 py-5">⚡ Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((order, idx) => {
                const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(order.status);
                return (
                  <tr 
                    key={order.id} 
                    className={`group transition-all duration-300 stagger-items hover:-translate-y-0.5 ${
                      order.isSite ? 'bg-blue-50/30 shadow-xl shadow-blue-500/10' : 
                      order.isConsigned ? 'ring-2 ring-amber-500 bg-amber-50/20 shadow-md shadow-amber-500/10' : 
                      'bg-white/50 hover:bg-white border border-border/40'
                    } relative rounded-2xl overflow-hidden`} 
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <td className="px-8 py-6 font-black text-foreground tracking-tight text-base italic first:rounded-l-2xl">
                      <div className="flex flex-col">
                        <span>{order.number}</span>
                        {viewCycle === 'historico' && (
                          <span className="text-[8px] font-black text-vendedor uppercase bg-vendedor/10 px-1.5 py-0.5 rounded w-fit mt-1 border border-vendedor/20">
                            Ciclo Anterior
                          </span>
                        )}
                        {order.notes?.includes('PEDIDO DE GARANTIA REFERENTE AO') && (
                          <span className="block text-[8px] text-primary opacity-70 font-bold uppercase mt-0.5">
                            {order.notes.split('\n')[0].replace('PEDIDO DE GARANTIA REFERENTE AO ', '(Referente ao ') + ')'}
                          </span>
                        )}
                        {order.isSite && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider shadow-md shadow-blue-500/20 animate-pulse w-fit mt-1">
                            🌐 VENDA DO SITE
                          </div>
                        )}
                        {order.isConsigned && (
                          <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded w-fit mt-1 border border-amber-500/20 flex items-center gap-1">
                             ⭐ Consignado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-foreground">
                      <button
                        onClick={() => navigate('/vendedor/clientes', { state: { search: order.clientName } })}
                        className="hover:text-primary transition-all text-left font-bold border-b border-transparent hover:border-primary pb-0.5"
                        title="Ver ficha do cliente"
                      >
                        {order.clientName}
                      </button>
                    </td>
                    <td className="text-right px-8 py-6 font-extrabold text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                    <td className="hidden lg:table-cell px-8 py-6"><OrderPipeline order={order} compact /></td>
                    <td className="px-8 py-6"><StatusBadge status={order.status} /></td>
                    <td className="text-right px-8 py-6 last:rounded-r-2xl">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={async () => { 
                            const full = await loadOrderDetails(order.id);
                            if (full) {
                              setSelectedOrder(full); 
                              setComprovantesAttached(full.receiptUrls || []); 
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white inline-flex items-center justify-center transition-all shadow-sm hover:shadow-primary/20 group/btn"
                          title="Detalhes"
                        >
                          <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                        </button>
                        {podeEditar && (
                          <button
                            onClick={async () => {
                              const full = await loadOrderDetails(order.id);
                              if (full) openEdit(full);
                            }}
                            className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary inline-flex items-center justify-center transition-all group/btn"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                          </button>
                        )}
                        {(order.status === 'rascunho' || order.status === 'enviado' || order.status === 'aprovado_cliente') && (
                          <button
                            onClick={async () => { 
                              const full = await loadOrderDetails(order.id);
                              if (full) {
                                setSelectedOrder(full); 
                                setComprovantesAttached(full.receiptUrls || []); 
                              }
                            }}
                            className="w-10 h-10 rounded-xl bg-vendedor/10 text-vendedor hover:bg-vendedor hover:text-white inline-flex items-center justify-center transition-all group/btn"
                            title="Enviar ao Financeiro"
                          >
                            <Send className="w-4 h-4 transition-transform group-hover/btn:rotate-12" />
                          </button>
                        )}
                        {podeExcluir(order.status) && (
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.number)}
                            disabled={deletingOrderId === order.id}
                            className="w-10 h-10 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white inline-flex items-center justify-center transition-all group/btn shadow-sm disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingOrderId === order.id
                              ? <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                              : <Trash2 className="w-4 h-4 transition-transform group-hover/btn:scale-110" />}
                          </button>
                        )}
                        {clients.find(c => c.id === order.clientId)?.phone && (
                          <button
                            onClick={() => openWhatsApp(clients.find(c => c.id === order.clientId)!.phone)}
                            className="w-10 h-10 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white inline-flex items-center justify-center transition-all group/btn"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
                        <Search className="w-10 h-10 opacity-20" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-xs">Nenhum orçamento encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Visualização Global */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Visualização do Arquivo</h2>
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
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe src={previewUrl} title="Documento" className="w-full max-w-5xl h-full rounded-2xl bg-white border-none" />
            ) : (
              <img src={previewUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {/* Overlay de Sucesso com Animação */}
      {showSuccessAnim && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/40 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-border/40 flex flex-col items-center text-center gap-6 animate-check-popup">
            <div className="checkmark-circle">
              <svg className="w-full h-full" viewBox="0 0 52 52">
                <path
                  className="checkmark-check fill-none stroke-success stroke-[4]"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-wider mb-2">Sucesso!</h3>
              <p className="text-muted-foreground font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentosPage;
