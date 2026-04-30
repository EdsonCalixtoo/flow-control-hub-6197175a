import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, formatDate as fmtDate, formatCurrency } from '@/components/shared/StatusBadge';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { RealtimeNotificationHandler } from '@/components/shared/RealtimeNotificationHandler';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import OrderChat from '@/components/shared/OrderChat';
import { Play, CheckCircle, Printer, Package, ArrowLeft, Search, ScanLine, X, Eye, Truck, Wrench, Calendar, Clock, AlertTriangle, CalendarClock, Send, Camera, StopCircle, History as HistoryIcon, RefreshCw, Filter, ShieldAlert, DollarSign, Activity, Zap, ChevronDown, Share2, ShieldCheck, User, BadgeCheck, Users2, Info, FileText } from 'lucide-react';
import BarcodeComponent from 'react-barcode';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ModernCalendar from '@/components/shared/ModernCalendar';
import type { ProductionStatus } from '@/types/erp';
import { cleanR2Url } from '@/lib/storageServiceR2';

const ModernSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; icon?: string }[];
  icon: React.ElementType;
  title: string;
}> = ({ value, onChange, options, icon: Icon, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className={`flex-1 min-w-[200px] flex items-center gap-3 bg-card/60 backdrop-blur-md p-2 rounded-[1.5rem] border border-border/60 shadow-sm transition-all hover:shadow-md group relative ${isOpen ? 'z-50' : 'z-20'}`} 
      ref={containerRef}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">{title}</p>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-[10px] font-black text-foreground uppercase tracking-widest outline-none"
        >
          <span className="truncate flex items-center gap-2">
            {selected.icon && <span>{selected.icon}</span>}
            {selected.label}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1.5 py-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  value === opt.value ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/50'
                }`}
              >
                {opt.icon && <span>{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const REMETENTE = {
  name: 'Grupo Automozia',
  address: 'R. Dr. Élton César, 910',
  neighborhood: 'Chácaras Campos dos Amarais',
  city: 'Campinas',
  state: 'SP',
  cep: '13082-025',
};

const PRODUCTION_STATUS_OPTS: { value: ProductionStatus; label: string; cls: string }[] = [
  { value: 'em_producao', label: 'Em Produção', cls: 'bg-producao/10 text-producao border-producao/30' },
  { value: 'agendado', label: 'Agendado', cls: 'bg-primary/10 text-primary border-primary/30' },
  { value: 'atrasado', label: 'Atrasado', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 'finalizado', label: 'Finalizado', cls: 'bg-success/10 text-success border-success/30' },
];

const PedidosProducaoPage: React.FC = () => {
  const { orders, clients, barcodeScans, updateOrderStatus, addBarcodeScan, updateOrder, editWarranty, addDelayReport, loadFromSupabase, loading, warranties, updateWarrantyStatus, loadOrderDetails, loadOrderByNumber } = useERP();
  const { user } = useAuth();
  const isCarenagem = user?.role === 'producao_carenagem';
  const mainColor = isCarenagem ? 'indigo-600' : 'producao';
  const MainIcon = isCarenagem ? Truck : Package;
  const mainGradient = isCarenagem ? 'from-indigo-600 to-indigo-600/60' : 'from-producao to-producao/60';
  const mainShadow = isCarenagem ? 'shadow-indigo-600/20' : 'shadow-producao/20';
  const [searchParams] = useSearchParams();
  const tipoFiltro = searchParams.get('tipo') || '';
  const viewParam = searchParams.get('view');

  const scannedOrderIds = useMemo(() => 
    new Set(barcodeScans.filter(s => s.success).map(s => s.orderId)),
    [barcodeScans]
  );

  const [guia, setGuia] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(searchParams.get('scan') === 'true');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewOrderId, setViewOrderId] = useState<string | null>(viewParam);
  const [delayReason, setDelayReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualLate, setManualLate] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
  const [carrierFilter, setCarrierFilter] = useState<string>('todos');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('todos');
  const [scannedOrderForVolumes, setScannedOrderForVolumes] = useState<any>(null);
  const [scannedOrderForAction, setScannedOrderForAction] = useState<any>(null);
  const [actionType, setActionType] = useState<'iniciar' | 'finalizar' | null>(null);
  const [showUnifyDialog, setShowUnifyDialog] = useState(false);
  const [unifyChildren, setUnifyChildren] = useState<string[]>([]);
  const [childInput, setChildInput] = useState('');
  const [parentInput, setParentInput] = useState('');
  const [isUnifying, setIsUnifying] = useState(false);
  const [lastParentNumber, setLastParentNumber] = useState('');

  const revertStatus = async (orderId: string, currentStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      toast.error('Pedido não encontrado localmente.');
      return;
    }

    let previousStatus = '';
    if (currentStatus === 'em_producao') previousStatus = 'aguardando_producao';
    else if (currentStatus === 'producao_finalizada' || currentStatus === 'produto_liberado') previousStatus = 'em_producao';
    else if (currentStatus === 'retirado_entregador') previousStatus = 'produto_liberado';

    if (!previousStatus) {
      toast.error('Não é possível reverter este status automaticamente.');
      return;
    }

    if (!window.confirm(`Deseja realmente RETORNAR o pedido ${order.number} para ${previousStatus}?`)) return;

    try {
      await updateOrderStatus(
        orderId,
        previousStatus as any,
        {
          releasedAt: null,
          releasedBy: null,
          volumes: 1
        },
        user?.name || 'Sistema',
        `Status revertido manualmente (Estorno de escaneamento por ${user?.name || 'usuário'})`
      );
      toast.success(`Pedido ${order.number} revertido para ${previousStatus}`);
      loadFromSupabase();
    } catch (err) {
      toast.error('Erro ao reverter status.');
    }
  };

  // ⚡ OTIMIZAÇÃO: Carrega os detalhes completos (itens, fotos) ao abrir o detalhe
  useEffect(() => {
    if (viewOrderId) {
      loadOrderDetails(viewOrderId);
    }
  }, [viewOrderId, loadOrderDetails]);

  useEffect(() => {
    if (guia) {
      loadOrderDetails(guia);
    }
  }, [guia, loadOrderDetails]);
  
  // Sincroniza abas com o tipo de filtro vindo da URL
  useEffect(() => {
    if (tipoFiltro === 'atrasado') setStatusFilter('atrasado');
    else if (tipoFiltro === 'historico') setStatusFilter('historico');
    else if (tipoFiltro === 'garantias') setStatusFilter('garantias');
    else setStatusFilter('todos'); 
    
    // Sincroniza visão de calendário e detalhe do pedido via URL
    setShowCalendar(searchParams.get('view') === 'calendar');
    const newViewOrderId = searchParams.get('view');
    if (newViewOrderId && newViewOrderId !== 'calendar') {
      setViewOrderId(newViewOrderId);
    }
  }, [tipoFiltro, searchParams]);
  const [volumesInput, setVolumesInput] = useState('1');
  const [showVolumesDialog, setShowVolumesDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(searchParams.get('view') === 'calendar');
  const barcodeRef = useRef<HTMLDivElement>(null);

  const calendarProductionOrders = useMemo(() => orders.filter(o => {
    const hasDate = o.isCronograma || o.scheduledDate || (tipoFiltro === 'instalacao' && o.installationDate);
    const matchType = tipoFiltro === 'instalacao' ? o.orderType === 'instalacao' : o.orderType !== 'instalacao';
    const matchStatus = ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'planejamento'].includes(o.status);
    return hasDate && matchType && matchStatus;
  }), [orders, tipoFiltro]);

  // Monitora em tempo real qualquer mudança nos pedidos de produção
  useRealtimeOrders((event) => {
    if (event.type === 'UPDATE' && event.previousStatus !== 'aguardando_producao' && event.order.status === 'aguardando_producao') {
      setNotificationCount(prev => prev + 1);
      console.log('[PedidosProducaoPage] 🔔 NOVO PEDIDO PARA PRODUÇÃO - Tempo Real');
    }
    // Sempre recarrega a lista quando qualquer pedido muda
    if (event.type === 'INSERT' || event.type === 'UPDATE') {
      setTimeout(() => loadFromSupabase(), 100);
    }
  });

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [barcodeDetectorAvailable, setBarcodeDetectorAvailable] = useState(false);
  const [barcodeScanMode, setBarcodeScanMode] = useState<'camera' | 'usb'>('usb');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getLocalDateString = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper: atrasado = data passada OU marcado manualmente OU productionStatus === 'atrasado'
  const isLate = (order: typeof orders[0]) => {
    const todayStr = getLocalDateString();

    const deliveryDate = order.deliveryDate || '';
    const installationDate = order.installationDate || '';

    const datePassed = (deliveryDate && deliveryDate < todayStr) || (installationDate && installationDate < todayStr);

    return order.productionStatus === 'atrasado' ||
      manualLate.has(order.id) ||
      (datePassed && !['producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(order.status));
  };

  const isScheduled = (order: typeof orders[0]) =>
    order.productionStatus === 'agendado' || !!order.scheduledDate || (order.orderType === 'instalacao' && !!order.installationDate);

  const PAGE_TITLES: Record<string, string> = {
    entrega: 'Pedidos — Entrega',
    instalacao: 'Pedidos — Instalação',
    retirada: 'Pedidos — Retirada',
    manutencao: 'Pedidos — Manutenção',
    historico: 'Histórico de Produção',
    garantias: 'Pedidos — Garantias',
    atrasado: 'Pedidos — Atrasados',
    '': 'Todos os Pedidos',
  };

  const formatDate = (d?: string) => fmtDate(d);

  const printEtiqueta = async (order: typeof orders[0]) => {
    console.log('[Etiqueta] 🏷️ Preparando impressão para pedido:', order.number);
    console.log('[Etiqueta] 🆔 Tentando encontrar cliente ID:', order.clientId);

    // Fallback: Tenta encontrar por ID ou por Nome de forma ultra robusta
    const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    let client = clients.find(c => c.id === order.clientId);
    
    // Se não encontrou no estado local (limitado a 500), tenta buscar no banco pelo ID
    if (!client && order.clientId) {
      console.log('[Etiqueta] 🔍 Cliente não está no estado local. Buscando no banco...');
      try {
        const { getClientById } = await import('@/lib/clientServiceSupabase');
        client = await getClientById(order.clientId);
      } catch (e) {
        console.warn('[Etiqueta] ⚠️ Erro ao buscar cliente no banco:', e);
      }
    }

    if (!client) {
      console.warn('[Etiqueta] ⚠️ Cliente não encontrado por ID. Tentando busca robusta por nome:', order.clientName);
      const nameRef = normalize(order.clientName || "");
      // Busca por nome exato
      client = clients.find(c => normalize(c.name) === nameRef);
      
      // Se não encontrou exato, tenta busca parcial (Fuzzy) no estado local
      if (!client) {
        client = clients.find(c => normalize(c.name).includes(nameRef) || nameRef.includes(normalize(c.name)));
        if (client) console.log('[Etiqueta] 🔍 Cliente localizado via busca parcial local:', client.name);
      }

      // Se ainda não encontrou, tenta busca remota por nome
      if (!client) {
        console.log('[Etiqueta] 🌐 Tentando busca remota por nome:', order.clientName);
        try {
          const { searchClientsByName } = await import('@/lib/clientServiceSupabase');
          const results = await searchClientsByName(order.clientName);
          if (results.length > 0) {
            client = results[0];
            console.log('[Etiqueta] ✅ Cliente localizado via busca remota por nome:', client.name);
          }
        } catch (e) {
          console.warn('[Etiqueta] ⚠️ Erro na busca remota por nome:', e);
        }
      }
    }

    // 💡 ESTRATÉGIA DE RECUPERAÇÃO DE ENDEREÇO (Para pedidos tipo 10219)
    let finalAddress = client?.address || '';
    let finalBairro = client?.bairro || '';
    let finalCity = client?.city || '';
    let finalState = client?.state || '';
    let finalCep = client?.cep || '';

    // Se o endereço está vazio ou parece inválido, tenta extrair da observação ou notas do pedido
    // Evitamos usar a observação se ela parecer apenas uma lista de itens (contendo ',' e sem palavras de endereço)
    if (!finalAddress || finalAddress.length < 5) {
      console.log('[Etiqueta] 🕵️ Endereço vazio ou curto. Tentando extrair da observação do pedido...');
      const source = (order.observation || '') + ' ' + (order.notes || '');
      
      const hasAddressKeywords = /rua|av|avenida|travessa|alameda|praça|estrada|rodovia|nº|num|numero/i.test(source);
      const hasItemKeywords = /cracha|camiseta|banner|kit|unid|un\.|qtd/i.test(source);
      
      // Busca CEP (00000-000 ou 00000000)
      const cepMatch = source.match(/\d{5}-?\d{3}/);
      if (cepMatch) finalCep = cepMatch[0];

      // Só usamos a observação como endereço se ela parecer ter um endereço E não for apenas uma lista de produtos
      if (source.length > 15 && (hasAddressKeywords || !hasItemKeywords)) {
        if (order.observation && order.observation.length > 10) {
          finalAddress = order.observation;
          console.log('[Etiqueta] ✅ Usando observação como endereço de fallback');
        } else if (order.notes && order.notes.length > 10) {
          finalAddress = order.notes;
          console.log('[Etiqueta] ✅ Usando notas como endereço de fallback');
        }
      } else {
        console.warn('[Etiqueta] ⚠️ Observação ignorada por parecer lista de itens ou insuficiente.');
      }
    }

    if (client) {
      console.log('[Etiqueta] ✅ Cliente encontrado:', client.name, 'Endereço:', finalAddress);
    } else {
      console.error('[Etiqueta] ❌ Cliente não localizado (Total na base:', clients.length, ')');
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const barcodeCanvas = document.createElement('canvas');
    // @ts-ignore
    const jsBarcodeMod = await import('jsbarcode');
    const JsBarcode = (jsBarcodeMod as any).default || jsBarcodeMod;
    JsBarcode(barcodeCanvas, order.number, {
      format: 'CODE128', width: 2, height: 60, displayValue: true,
      fontSize: 16, margin: 4, font: 'Arial',
    });
    const barcodeDataUrl = barcodeCanvas.toDataURL('image/png');
    document.body.removeChild(tempDiv);

    let logoDataUrl = '';
    try {
      const response = await fetch('/Automatiza-logo-rgb-01.jpg');
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) { console.warn('Logo não encontrado.'); }

      const printWindow = window.open('', '_blank', 'width=420,height=600');
      if (!printWindow) { alert('Permita pop-ups para imprimir a etiqueta.'); return; }

const addrFontSize = finalAddress.length > 120 ? '7.5pt' : (finalAddress.length > 80 ? '8.5pt' : '10pt');

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Etiqueta - ${order.number}</title>
<style>
@page { size: 100mm 150mm; margin: 0; }
@media print {
  * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100mm; height: 150mm; font-family: 'Arial', 'Courier New', monospace; color: #000; background: #fff; overflow: hidden; }
.etiqueta { width: 100mm; height: 150mm; padding: 4mm; display: flex; flex-direction: column; justify-content: space-between; }
.header { text-align: center; padding-bottom: 2mm; border-bottom: 1.2mm solid #000; margin-bottom: 2mm; display: flex; align-items: center; justify-content: center; gap: 2mm; }
.header-logo { max-height: 16mm; max-width: 45mm; object-fit: contain; }
.header-info { text-align: left; }
.header-title { font-size: 8pt; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #000; margin-bottom: 0.2mm; }
.header-pedido { font-size: 18pt; font-weight: 900; font-family: 'Courier New', monospace; color: #000; letter-spacing: 2px; line-height: 1; }
.section { margin-bottom: 2mm; }
.section-label { font-size: 7.5pt; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #000; margin-bottom: 1mm; border-bottom: 0.5mm solid #000; width: fit-content; }
.remetente { padding: 2mm 2.5mm; border: 0.8mm solid #000; border-radius: 0.5mm; background: #fff; }
.remetente .name { font-size: 9pt; font-weight: 900; color: #000; margin-bottom: 0.3mm; letter-spacing: 0.3px; }
.remetente .address { font-size: 7.5pt; color: #000; line-height: 1.3; font-weight: 700; }
.destinatario { flex: 1; padding: 4mm; border: 1.5mm solid #000; border-radius: 1mm; background: #fff; display: flex; flex-direction: column; justify-content: center; min-height: 40mm; }
.destinatario .name { font-size: 15pt; font-weight: 900; color: #000; margin-bottom: 2mm; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.1; }
.destinatario .address { font-size: ${addrFontSize}; color: #000; line-height: 1.3; font-weight: 800; word-break: break-word; }
.destinatario .cpf { font-size: 9pt; color: #000; margin-top: 2mm; font-weight: 800; font-family: 'Courier New', monospace; }
.destinatario .phone { font-size: 9pt; color: #000; margin-top: 1mm; font-weight: 800; }
.barcode-section { text-align: center; padding-top: 2mm; border-top: 1mm dashed #000; margin-top: 1mm; }
.barcode-section .barcode-label { font-size: 8pt; font-weight: 900; color: #000; margin-bottom: 1.5mm; letter-spacing: 2px; font-family: 'Courier New', monospace; }
.barcode-section img { max-width: 85mm; height: auto; }
.footer { text-align: center; font-size: 6pt; color: #000; margin-top: 1mm; font-weight: 700; border-top: 0.3mm solid #ccc; padding-top: 1mm; }
</style></head><body>
<div class="etiqueta">
  <div class="header">
    ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
    <div class="header-info">
      <div class="header-title">Etiqueta de Envio ${order.orderType === 'entrega' && (order as any).carrier ? `• ${(order as any).carrier}` : ''}</div>
      <div class="header-pedido">${order.number}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Remetente</div>
    <div class="remetente">
      <div class="name">${REMETENTE.name}</div>
      <div class="address">${REMETENTE.address}<br>${REMETENTE.neighborhood}<br>${REMETENTE.city} - ${REMETENTE.state} CEP: ${REMETENTE.cep}</div>
    </div>
  </div>
  <div class="section" style="flex:1;display:flex;flex-direction:column;">
    <div class="section-label">Destinatário</div>
    <div class="destinatario">
      <div class="name">${order.clientName}</div>
      <div class="address">
        ${finalAddress || '<span style="color:red">ENDEREÇO NÃO LOCALIZADO</span>'}
        ${finalBairro ? `<br>Bairro: ${finalBairro}` : ''}
        ${(finalCity || finalState) ? `<br>${finalCity} - ${finalState} CEP: ${finalCep}` : (finalCep ? `<br>CEP: ${finalCep}` : '')}
      </div>
      ${client?.cpfCnpj ? `<div class="cpf">CPF/CNPJ: ${client.cpfCnpj}</div>` : ''}
      ${client?.phone ? `<div class="phone">Telefone: ${client.phone}</div>` : ''}
    </div>
  </div>
  <div class="barcode-section">
    <div class="barcode-label">PEDIDO: ${order.number}</div>
    <img src="${barcodeDataUrl}" alt="Código de barras" />
  </div>
  <div class="footer">Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(window.close, 1000); }, 500); };</script>
</body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    };

  const allOrders = orders.filter(o => {
    const isPlanning = o.status === 'planejamento';
    const baseStatus = ['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status);
    
    if (statusFilter === 'planejamento') return isPlanning;
    if (!baseStatus) return false;

    // Filtro por Cargo (Produção vs Produção Carenagem)
    const hasCarenagem = o.items.some(item => 
      item.product.toLowerCase().includes('carenagem') || 
      item.product.toLowerCase().includes('side skirt') ||
      item.description?.toLowerCase().includes('carenagem') ||
      item.description?.toLowerCase().includes('side skirt')
    );

    if (user?.role === 'producao_carenagem') {
      if (!hasCarenagem) return false;
    } else if (user?.role === 'producao') {
      if (hasCarenagem) return false;
    }

    const isActuallyScanned = scannedOrderIds.has(o.id);
    const filterToUse = tipoFiltro === 'historico' ? 'historico' : statusFilter;

    // Pedido é considerado "Concluído" para a produção se já foi Finalizado, Liberado para entrega ou Retirado
    // 'producao_finalizada' agora é considerado concluído para desaparecer da lista de trabalho da fábrica
    const isCompleted = ['producao_finalizada', 'produto_liberado', 'retirado_entregador'].includes(o.status) || isActuallyScanned;

    // No histórico, mostramos tudo que está concluído
    if (filterToUse === 'historico') return isCompleted;
    
    // Na lista ativa (trabalho), desaparece o que já está concluído
    if (isCompleted) return false;
    
    return true;
  });

  const tipoFiltered = allOrders.filter(o => {
    if (tipoFiltro === 'entrega') return o.orderType === 'entrega';
    if (tipoFiltro === 'instalacao') return o.orderType === 'instalacao';
    if (tipoFiltro === 'retirada') return o.orderType === 'retirada';
    if (tipoFiltro === 'manutencao') return o.orderType === 'manutencao';
    
    // Se não houver tipo específico, mostra tudo (exceto o que statusFilter filtrar)
    return true;
  });

  const filteredOrders = tipoFiltered.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || 
                       o.clientName.toLowerCase().includes(search.toLowerCase()) ||
                       o.sellerName.toLowerCase().includes(search.toLowerCase());
    
    // Filtro de Transportadora
    const matchCarrier = carrierFilter === 'todos' || 
                        (carrierFilter === 'sem_definir' && !o.carrier) ||
                        (o.carrier && o.carrier.trim().toUpperCase() === carrierFilter.trim().toUpperCase());
    
    // Filtro de Tipo de Pedido (específico para história/todos)
    const matchTypeFilter = orderTypeFilter === 'todos' || o.orderType === orderTypeFilter;

    if (statusFilter === 'atrasado') return matchSearch && isLate(o) && matchCarrier && matchTypeFilter;
    if (statusFilter === 'historico') return matchSearch && matchCarrier && matchTypeFilter;
    if (statusFilter === 'garantias') return matchSearch && matchCarrier;
    
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    
    // Se estivermos na aba de Previsão/Planejamento e houver uma data selecionada no calendário
    const matchDateForPlanning = (statusFilter === 'planejamento' && selectedDate) 
      ? (o.scheduledDate === selectedDate || o.deliveryDate === selectedDate || o.installationDate === selectedDate)
      : true;

    return matchSearch && matchStatus && matchCarrier && matchDateForPlanning && matchTypeFilter;
  });

  const groupedOrders = useMemo(() => {
    const groups: Record<string, typeof filteredOrders> = {};
    filteredOrders.forEach(order => {
      const client = order.clientName || 'Cliente não identificado';
      if (!groups[client]) groups[client] = [];
      groups[client].push(order);
    });
    return groups;
  }, [filteredOrders]);

  const iniciarProducao = (orderId: string) => {
    const startedBy = user?.name || 'Equipe Producao';
    updateOrderStatus(orderId, 'em_producao', {
      productionStartedAt: new Date().toISOString(),
      productionStatus: 'em_producao',
      productionStartedBy: startedBy,
    }, startedBy, 'Producao iniciada');
  };

  const finalizarProducao = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 🔥 NOVO: Verificar se todos os itens foram finalizados individualmente antes de fechar o pedido
    const allFinished = order.items.every(it => it.status === 'finalizado');
    if (!allFinished) {
      const confirmMsg = "⚠️ ATENÇÃO: Existem itens neste pedido que não foram marcados como finalizados individualmente.\n\nDeseja finalizar a produção do pedido completo mesmo assim?";
      if (!window.confirm(confirmMsg)) return;
    }

    const qrCode = `${window.location.origin}/qr/${orderId}`;
    const finishedBy = user?.name || 'Equipe Producao';
    const now = new Date().toISOString();

    const isFieldWork = order.orderType === 'instalacao' || order.orderType === 'manutencao';
    const nextStatus = isFieldWork ? 'produto_liberado' : 'producao_finalizada';

    updateOrderStatus(orderId, nextStatus, {
      productionFinishedAt: now,
      productionStatus: 'finalizado',
      productionFinishedBy: finishedBy,
      releasedAt: isFieldWork ? now : undefined,
      releasedBy: isFieldWork ? finishedBy : undefined,
    }, finishedBy, isFieldWork ? 'Produção finalizada e liberada para o campo' : 'Producao finalizada');

    if (!isFieldWork) {
      toast.success('Produção finalizada! Escaneie o código de barras agora para enviar aos entregadores.', {
        duration: 5000,
        icon: '🚀'
      });
    }

    setGuia(orderId);
  };

  const handleAgendar = (orderId: string) => {
    if (!scheduleDate) return;
    updateOrder(orderId, {
      scheduledDate: scheduleDate,
      productionStatus: 'agendado',
    });
    setShowScheduleModal(false);
    setScheduleDate('');
  };

  const syncData = async () => {
    setIsRefreshing(true);
    try {
      if (loadFromSupabase) await loadFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const processCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    const scannedBy = user?.name || 'Equipe Produção';
    const now = new Date().toISOString();

    // 💡 Busca inteligente: tenta o código exato e se falhar tenta ignorar '.' e '-' 
    // (Útil para teclados configurados errado ou variações no cadastro)
    let order = orders.find(o => o.number.toUpperCase() === code);

    if (!order) {
      const cleanCode = code.replace(/[-.]/g, '');
      order = orders.find(o => 
        o.number.toUpperCase().replace(/[-.]/g, '') === cleanCode
      );
      if (order) {
        console.log(`[Scanner] 💡 Pedido ${order.number} localizado via busca flexível (Código lido: ${code})`);
      }
    }

    // 🕵️ Busca ultra-flexível: se o código lido tem letras (como D-2745) mas no sistema pode estar apenas como número (2745)
    if (!order && /[A-Z]/.test(code)) {
      const digitsOnly = code.replace(/\D/g, '');
      if (digitsOnly) {
        order = orders.find(o => o.number.replace(/\D/g, '') === digitsOnly);
        if (order) {
          console.log(`[Scanner] 🕵️ Coincidência numérica encontrada: ${order.number} para leitura ${code}`);
        }
      }
    }

    // 🚀 NOVO: Se ainda não encontrou localmente, tenta buscar diretamente no banco (fallback para pedidos muito antigos)
    if (!order) {
      setScanResult({ success: true, message: `🔍 Buscando no banco de dados (Modo Inteligente): ${code}...` });
      console.log(`[Scanner] 🔍 Pedido não encontrado localmente. Tentando busca remota (Fallback Inteligente)...`);
      const remoteOrder = await loadOrderByNumber(code);
      if (remoteOrder) {
        order = remoteOrder;
        console.log(`[Scanner] ✅ Pedido ${order.number} localizado via busca remota!`);
      }
    }

    if (order) {
      console.log(`[Scanner] 🦾 Pedido encontrado: ${order.number} | Status: ${order.status}`);

      // Verificar se há scans RECENTES deste pedido nos últimos 60 segundos (aumentado para facilitar uso)
      const recentScans = barcodeScans.filter(scan => {
        if (scan.orderId !== order.id || !scan.success) return false;
        const scanTime = new Date(scan.scannedAt).getTime();
        const elapsed = Date.now() - scanTime;
        return elapsed < 60000; // 60 segundos
      });

      if (order.status === 'producao_finalizada') {
        if (recentScans.length === 0) {
          // PRIMEIRO SCAN - Liberar direto com 1 volume
          try {
            await updateOrderStatus(
              order.id,
              'produto_liberado',
              {
                releasedAt: now,
                releasedBy: scannedBy,
                volumes: 1,
              },
              scannedBy,
              'Produto liberado com 1 volume (escaneamento único)'
            );

            await addBarcodeScan({
              orderId: order.id,
              orderNumber: order.number,
              scannedBy,
              success: true,
              note: 'Produto liberado automaticamente com 1 volume',
            });

            setScanResult({
              success: true,
              message: `✅ Pedido ${order.number} liberado automaticamente com 1 volume! Vai para entregadores.`,
              orderNumber: order.number,
            });

            setTimeout(() => loadFromSupabase(), 300);
          } catch (err: any) {
            console.error('[Scanner] Erro ao liberar:', err);
            setScanResult({ success: false, message: `❌ Erro ao liberar: ${err.message}` });
          }
        } else {
          // SEGUNDO+ SCAN - Abrir dialog para perguntar quantos volumes
          console.log(`[Scanner] 🔄 Scan duplicado detectado! Scans recentes: ${recentScans.length}`);
          setScannedOrderForVolumes(order);
          setVolumesInput('1');
          setShowVolumesDialog(true);
          setScanResult({
            success: true,
            message: `🔄 Pedido ${order.number} escaneado novamente! Insira a quantidade exata de volumes.`,
            orderNumber: order.number
          });
        }
      } else if (order.status === 'produto_liberado') {
        // Se já está liberado, mas foi escaneado recentemente, permite abrir o dialog de volumes de novo
        if (recentScans.length > 0) {
          console.log(`[Scanner] 🔄 Releitura rápida de pedido liberado. Abrindo dialog de volumes.`);
          setScannedOrderForVolumes(order);
          setVolumesInput(order.volumes?.toString() || '1');
          setShowVolumesDialog(true);
          setScanResult({
            success: true,
            message: `🔄 Pedido ${order.number} escaneado novamente! Você pode ajustar a quantidade de volumes.`,
            orderNumber: order.number
          });
        } else {
          await addBarcodeScan({
            orderId: order.id,
            orderNumber: order.number,
            scannedBy,
            success: true,
            note: 'Releitura — produto já estava liberado',
          });
          setScanResult({ success: true, message: `ℹ️ Pedido ${order.number} já foi liberado anteriormente.`, orderNumber: order.number });
        }
      } else if (order.status === 'retirado_entregador') {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: true,
          note: 'Releitura — produto já foi retirado pelo entregador',
        });
        setScanResult({ success: true, message: `ℹ️ Pedido ${order.number} já foi retirado pelo entregador.`, orderNumber: order.number });
      } else if (['aguardando_gestor', 'aprovado_gestor'].includes(order.status)) {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Pedido aguardando aprovação do Gestor. Status: ${order.status}`,
        });
        setScanResult({
          success: false,
          message: `❌ Pedido ${order.number} está AGUARDANDO GESTOR. O gestor precisa aprovar a garantia/orçamento antes da produção iniciar.`
        });
      } else if (['rascunho', 'enviado', 'aprovado_cliente', 'aguardando_financeiro'].includes(order.status)) {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Pedido não liberado. Status: ${order.status}`,
        });
        setScanResult({
          success: false,
          message: `❌ Pedido ${order.number} ainda NÃO foi aprovado pelo financeiro. Status: ${order.status}. Fale com o financeiro para liberar.`
        });
      } else if (order.status === 'aprovado_financeiro' || order.status === 'aguardando_producao') {
        // Ação: INICIAR PRODUÇÃO VIA SCANNER
        setScannedOrderForAction(order);
        setActionType('iniciar');
        setScanResult({
          success: true,
          message: `🎬 Pedido ${order.number} localizado! Deseja INICIAR a produção agora?`,
          orderNumber: order.number
        });
      } else if (order.status === 'em_producao') {
        // Ação: FINALIZAR PRODUÇÃO VIA SCANNER
        setScannedOrderForAction(order);
        setActionType('finalizar');
        setScanResult({
          success: true,
          message: `🏁 Pedido ${order.number} em produção. Deseja FINALIZAR e gerar a guia agora?`,
          orderNumber: order.number
        });
      } else if (!['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada'].includes(order.status)) {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Status inválido para escaneamento: ${order.status}`,
        });
        setScanResult({
          success: false,
          message: `❌ Pedido ${order.number} está com status "${order.status}". Não é possível escanear nesta etapa.`
        });
      } else {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Fuga de lógica no scanner: ${order.status}`,
        });
        setScanResult({ success: false, message: `⚠️ Pedido ${order.number} com status ${order.status}. Use os botões manuais no dashboard se necessário.` });
      }
    } else {
      console.warn(`[Scanner] ❌ Código pesquisado não encontrado: ${code}`);
      setScanResult({ success: false, message: `❌ Código "${code}" não encontrado. Verifique se o número do pedido no sistema é exatamente este (ex: D-2745 ou apenas 2745).` });
    }
    setScanInput('');
  }, [orders, barcodeScans, addBarcodeScan, updateOrderStatus, user, loadFromSupabase, loadOrderByNumber]);

  const handleUnify = async () => {
    if (unifyChildren.length === 0 || !parentInput.trim()) return;
    setIsUnifying(true);
    try {
      // Busca o pedido "pai"
      let parentOrder = orders.find(o => o.number.toUpperCase() === parentInput.trim().toUpperCase());
      if (!parentOrder) {
        parentOrder = await loadOrderByNumber(parentInput.trim());
      }

      if (!parentOrder) {
        toast.error('Pedido de destino (Caixa) não encontrado.');
        setIsUnifying(false);
        return;
      }

      let successCount = 0;
      for (const childNum of unifyChildren) {
        const currentOrder = orders.find(o => o.number === childNum) || await loadOrderByNumber(childNum);
        
        if (currentOrder && currentOrder.id !== parentOrder.id) {
          if (currentOrder.isWarranty) {
            await editWarranty(currentOrder.id, {
              orderId: parentOrder.id,
              orderNumber: parentOrder.number
            });
            await updateOrder(currentOrder.id, {
              parentOrderId: parentOrder.id,
              parentOrderNumber: parentOrder.number
            }).catch(() => {});
          } else {
            await updateOrder(currentOrder.id, {
              parentOrderId: parentOrder.id,
              parentOrderNumber: parentOrder.number
            });
          }
          successCount++;
        }
      }

      toast.success(`${successCount} pedido(s) unificado(s) com ${parentOrder.number}!`);
      setLastParentNumber(parentOrder.number);
      setShowUnifyDialog(false);
      setUnifyChildren([]);
      setChildInput('');
      setParentInput('');
      setScanResult(null);
    } catch (err: any) {
      toast.error('Erro ao unificar: ' + err.message);
    } finally {
      setIsUnifying(false);
    }
  };

  const handleConfirmVolumes = useCallback(async () => {
    if (!scannedOrderForVolumes) return;

    const volumes = parseInt(volumesInput) || 1;
    if (volumes < 1) {
      setScanResult({ success: false, message: '❌ A quantidade de volumes deve ser no mínimo 1.' });
      return;
    }

    const scannedBy = user?.name || 'Equipe Produção';
    const now = new Date().toISOString();

    try {
      // Liberar pedido com volumes definidos
      await updateOrderStatus(
        scannedOrderForVolumes.id,
        'produto_liberado',
        {
          releasedAt: now,
          releasedBy: scannedBy,
          volumes: volumes,
        },
        scannedBy,
        `Produto liberado com ${volumes} volume(s) via scanner`
      );

      await addBarcodeScan({
        orderId: scannedOrderForVolumes.id,
        orderNumber: scannedOrderForVolumes.number,
        scannedBy,
        success: true,
        note: `Produto liberado com ${volumes} volume(s) via scanner`,
      });

      setScanResult({
        success: true,
        message: `✅ Pedido ${scannedOrderForVolumes.number} liberado com ${volumes} volume(s)! Vai para entregadores.`,
        orderNumber: scannedOrderForVolumes.number,
      });

      // Fechar diálogo e limpar
      setShowVolumesDialog(false);
      setScannedOrderForVolumes(null);
      setVolumesInput('1');

      // Refresh para atualizar lista
      setTimeout(() => loadFromSupabase(), 200);
    } catch (err: any) {
      console.error('[handleConfirmVolumes] Erro:', err);
      setScanResult({ success: false, message: `❌ Erro ao liberar: ${err.message}` });
    }
  }, [scannedOrderForVolumes, volumesInput, user, updateOrderStatus, addBarcodeScan, loadFromSupabase]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Câmera não suportada neste navegador. Use Chrome, Edge ou Safari 14+. ' +
          'Alternativamente, conecte um leitor USB de código de barras ou digite manualmente.'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      streamRef.current = stream;
      // Marca como ativo ANTES de tentar o play — o useEffect vai conectar o stream ao <video>
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      let msg = 'Não foi possível acessar a câmera.';

      if (err?.name === 'NotAllowedError') {
        msg = '🔒 Permissão negada. Acesse as configurações do navegador: ' +
          'Configurações > Privacidade > Câmera > Permita este site. ' +
          'Alternativamente, use leitor USB ou Digite manualmente.';
      } else if (err?.name === 'NotFoundError') {
        msg = '📱 Nenhuma câmera encontrada. Use um leitor USB de código de barras ou digite o número do pedido manualmente.';
      } else if (err?.name === 'NotReadableError') {
        msg = '⚠️ Câmera em uso por outro aplicativo. Feche outros apps e tente novamente.';
      } else {
        msg += ' Verifique as permissões ou use leitor USB/entrada manual.';
      }
      setCameraError(msg);
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Detecta disponibilidade do BarcodeDetector na montagem
  useEffect(() => {
    const hasDetector = !!(window as any).BarcodeDetector;
    setBarcodeDetectorAvailable(hasDetector);
    // Se não houver BarcodeDetector, força modo USB
    if (!hasDetector) {
      setBarcodeScanMode('usb');
    }
  }, []);

  // Conecta o stream ao <video> assim que cameraActive=true e o ref estiver pronto no DOM
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => { });

    const BarcodeDetector = (window as any).BarcodeDetector;
    if (!BarcodeDetector) {
      setCameraError('Seu navegador não suporta detecção automática de código de barras. Use o leitor USB ou digitar manualmente.');
      return;
    }

    try {
      const detector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'ean_8'] });
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            stopCamera();
            setScanInput(code);
            processCode(code);
          }
        } catch { /* ignore detection errors */ }
      }, 300); // Mais rápido para melhor responsividade
    } catch (err) {
      setCameraError('Erro ao inicializar detecção de código de barras. Use o leitor USB ou digitar manualmente.');
      console.warn('BarcodeDetector init error:', err);
    }
  }, [cameraActive, processCode, stopCamera]);

  const handleScan = () => processCode(scanInput);

  if (showScanner) {
    const recentScans = barcodeScans.slice(0, 20);
    return (
      <div className="min-h-[80vh] flex flex-col space-y-10 animate-in fade-in zoom-in-95 duration-500 pb-20">
        {/* Header Imersivo */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-3xl border border-border/40 p-8 shadow-2xl group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-producao/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-producao flex items-center justify-center text-white shadow-2xl shadow-producao/40 transform transition-transform hover:scale-110 active:scale-95 duration-300">
                <ScanLine className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Leitura de Código de Barras</h1>
                <p className="text-sm text-muted-foreground font-semibold mt-0.5">Validação industrial via scanner USB, Câmera ou Manual</p>
              </div>
            </div>
            <button 
              onClick={() => { setShowScanner(false); setScanResult(null); stopCamera(); }} 
              className="w-12 h-12 rounded-2xl bg-card border border-border/60 text-foreground flex items-center justify-center hover:bg-destructive hover:text-white hover:border-destructive transition-all group/close shadow-lg"
            >
              <X className="w-6 h-6 transition-transform group-hover/close:rotate-90" />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full space-y-8">
          {/* Main Scanner Box */}
          <div className="glass-card relative overflow-hidden p-8 sm:p-10 border-2 border-border/40 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)]">
            <div className="text-center space-y-2 mb-10">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-pulse mb-2">
                 <Zap className="w-3 h-3 fill-current" /> Pronto para Scannear
               </div>
               <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Posicione o Código</h2>
               <p className="text-sm text-muted-foreground font-medium">Aponte o leitor ou digite o identificador do pedido</p>
            </div>

            {/* Camera Area Modernizada */}
            {barcodeDetectorAvailable && cameraActive ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="relative rounded-[2rem] overflow-hidden border-4 border-producao/50 bg-black shadow-2xl aspect-video sm:aspect-[21/9]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover opacity-90"
                    playsInline autoPlay muted
                    onCanPlay={() => { videoRef.current?.play().catch(() => { }); }}
                  />
                  
                  {/* Laser Animation */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="w-full h-[2px] bg-producao shadow-[0_0_15px_rgba(var(--producao),0.8)] absolute top-0 animate-scanner-laser" />
                    <div className="absolute inset-0 bg-gradient-to-t from-producao/5 via-transparent to-producao/5" />
                  </div>

                  {/* Focus Box */}
                  <div className="absolute inset-x-8 inset-y-6 border-2 border-white/20 rounded-[1.5rem] flex items-center justify-center pointer-events-none">
                     <div className="w-8 h-8 absolute top-0 left-0 border-t-4 border-l-4 border-producao rounded-tl-xl" />
                     <div className="w-8 h-8 absolute top-0 right-0 border-t-4 border-r-4 border-producao rounded-tr-xl" />
                     <div className="w-8 h-8 absolute bottom-0 left-0 border-b-4 border-l-4 border-producao rounded-bl-xl" />
                     <div className="w-8 h-8 absolute bottom-0 right-0 border-b-4 border-r-4 border-producao rounded-br-xl" />
                  </div>
                </div>
                <button onClick={stopCamera} className="w-full py-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-black uppercase tracking-[0.2em] hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg">
                  <StopCircle className="w-5 h-5" /> Encerrar Captura de Câmera
                </button>
              </div>
            ) : barcodeDetectorAvailable ? (
              <button 
                onClick={startCamera} 
                className="w-full relative group overflow-hidden p-8 rounded-[2rem] border-2 border-dashed border-primary/30 hover:border-primary transition-all bg-primary/[0.02]"
              >
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Ativar Câmera Integrada</p>
                  <p className="text-[10px] text-muted-foreground font-bold italic">Usar webcam ou câmera frontal do mobile</p>
                </div>
              </button>
            ) : null}

            {/* Aviso Estilizado */}
            {!barcodeDetectorAvailable && (
              <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-black text-amber-600 uppercase tracking-tight">Scanner Industrial Recomendado</p>
                    <p className="text-[11px] font-bold text-amber-600/70 leading-relaxed">
                      Conecte o leitor USB ou digite o número do pedido no campo abaixo para prosseguir.
                    </p>
                 </div>
              </div>
            )}

            {cameraError && (
              <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-destructive text-[11px] font-bold mt-4 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4" /> {cameraError}
              </div>
            )}

            {/* Input Manual Moderno */}
            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/40" />
                 <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Entrada de Dados</span>
                 <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/40" />
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1 group">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none">
                      <Zap className="w-full h-full fill-current opacity-20" />
                   </div>
                   <input
                    type="text"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                    placeholder="PED-0000"
                    className="w-full bg-muted/30 border-2 border-border/40 hover:border-primary/20 focus:border-primary pl-14 pr-6 py-5 rounded-2xl text-2xl font-black font-mono tracking-[0.2em] text-foreground placeholder:text-muted-foreground/30 focus:ring-8 focus:ring-primary/5 transition-all outline-none text-center sm:text-left"
                    autoFocus={!cameraActive || !barcodeDetectorAvailable}
                  />
                </div>
                <button 
                  onClick={handleScan} 
                  disabled={!scanInput.trim()}
                  className="px-8 bg-foreground text-background font-black uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-xl active:scale-95"
                >
                  Validar
                </button>
              </div>
            </div>
          </div>

          {/* Scan result com visual Premium */}
          {scanResult && (
            <div className={`glass-card p-10 text-center animate-in zoom-in-95 duration-500 border-2 ${
              scanResult.success ? 'border-success/30 bg-success/[0.02]' : 'border-destructive/30 bg-destructive/[0.02]'
            }`}>
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 transform transition-transform animate-bounce-subtle ${
                scanResult.success ? 'bg-success text-white shadow-2xl shadow-success/40' : 'bg-destructive text-white shadow-2xl shadow-destructive/40'
              }`}>
                {scanResult.success ? <CheckCircle className="w-12 h-12" /> : <X className="w-12 h-12" />}
              </div>
              <h3 className={`text-2xl font-black uppercase tracking-tight ${scanResult.success ? 'text-success' : 'text-destructive'}`}>
                {scanResult.success ? 'Lançamento Efetuado!' : 'Falha na Validação'}
              </h3>
              <p className="text-base font-bold text-foreground mt-2 opacity-80">{scanResult.message}</p>

              {scanResult.success && (
                <div className="mt-8 pt-6 border-t border-border/20 flex flex-col gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ações de Logística</p>
                  <button 
                    onClick={() => {
                      setParentInput(lastParentNumber);
                      setUnifyChildren([scanResult.orderNumber]);
                      setShowUnifyDialog(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg group"
                  >
                    <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Unificar com outro pedido (Mesma Caixa)
                  </button>
                  <button 
                    onClick={() => { setScanResult(null); setScanInput(''); }}
                    className="w-full py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                  >
                    Próximo Bipe
                  </button>
                </div>
              )}

              {!scanResult.success && (
                <div className="mt-8 p-6 rounded-2xl bg-destructive/5 text-left border border-destructive/10">
                  <p className="text-xs font-black uppercase tracking-widest text-destructive mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Instruções de Resolução:
                  </p>
                  <ul className="space-y-2 text-xs font-bold text-muted-foreground italic">
                    <li className="flex items-center gap-2">• Verifique se o pedido está em status compatível</li>
                    <li className="flex items-center gap-2">• Limite de caracteres ou formato incorreto</li>
                    <li className="flex items-center gap-2">• O leitor USB pode precisar de reconfiguração</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Últimas Leituras - Listagem Moderna */}
          {recentScans.length > 0 && (
            <div className="card-section p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground font-black">
                    <HistoryIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-black uppercase tracking-tight">Histórico de Fluxo Recente</h2>
                </div>
                <div className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Tempo Real</div>
              </div>

              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                {recentScans.map((scan, idx) => (
                  <div 
                    key={scan.id} 
                    className={`flex items-center justify-between gap-6 p-4 rounded-2xl border-2 transition-all group relative animate-in slide-in-from-right-4 fade-in duration-500`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Linha lateral de status */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-full ${scan.success ? 'bg-success' : 'bg-destructive'}`} />
                    
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${scan.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {scan.success ? <BadgeCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground uppercase tracking-tight leading-none mb-1.5">{scan.orderNumber}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1">
                            <User className="w-3 h-3" /> {scan.scannedBy}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {scan.success && (
                        <button 
                           onClick={() => {
                             const ord = orders.find(o => o.number === scan.orderNumber || o.number.includes(scan.orderNumber));
                             if (ord) revertStatus(ord.id, ord.status);
                             else toast.error('Pedido não localizado.');
                           }}
                           className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[9px] font-black uppercase hover:bg-destructive hover:text-white"
                        >
                          <RefreshCw className="w-3 h-3" /> Estornar
                        </button>
                      )}
                      <div className="text-right">
                        <p className="text-xs font-black text-foreground">{new Date(scan.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">{new Date(scan.scannedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal de Volumes Modernizado */}
        {showVolumesDialog && scannedOrderForVolumes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-3xl animate-in fade-in duration-500" />
            <div className="glass-card p-10 w-full max-w-md relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-producao/20 flex items-center justify-center text-producao animate-bounce-subtle">
                   <Package className="w-10 h-10" />
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Carga & Volumes</h3>
                   <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Pedido {scannedOrderForVolumes.number}</p>
                </div>

                <div className="w-full h-px bg-border/40" />

                <div className="w-full space-y-6">
                   <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setVolumesInput(Math.max(1, parseInt(volumesInput) - 1).toString())}
                        className="w-14 h-14 rounded-2xl bg-muted/50 hover:bg-producao hover:text-white transition-all text-2xl font-black shadow-lg"
                      >
                        −
                      </button>
                      <div className="relative">
                         <input
                          type="number"
                          min="1"
                          value={volumesInput}
                          onChange={e => setVolumesInput(Math.max(1, parseInt(e.target.value) || 1).toString())}
                          className="w-32 bg-transparent text-center text-6xl font-black text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus
                        />
                        <span className="absolute -bottom-4 left-0 right-0 text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">Volumes</span>
                      </div>
                      <button
                        onClick={() => setVolumesInput((parseInt(volumesInput) + 1).toString())}
                        className="w-14 h-14 rounded-2xl bg-muted/50 hover:bg-producao hover:text-white transition-all text-2xl font-black shadow-lg"
                      >
                        +
                      </button>
                   </div>

                   <button
                     onClick={() => handleConfirmVolumes()}
                     className="w-full py-5 bg-foreground text-background rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-producao hover:text-white transition-all shadow-2xl active:scale-95"
                   >
                     Confirmar Despacho
                   </button>
                   
                   <button
                    onClick={() => {
                      setShowVolumesDialog(false);
                      setScannedOrderForVolumes(null);
                      setVolumesInput('1');
                      setScanResult(null);
                    }}
                    className="w-full py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Ações Modernizado (Iniciar/Finalizar via Scanner) */}
        {scannedOrderForAction && actionType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-3xl animate-in fade-in duration-500" />
            <div className="glass-card p-10 w-full max-w-md relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-producao/20">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-2xl animate-bounce-subtle ${
                  actionType === 'iniciar' ? 'bg-producao shadow-producao/40' : 'bg-emerald-500 shadow-emerald-500/40'
                }`}>
                   {actionType === 'iniciar' ? <Play className="w-10 h-10" /> : <CheckCircle className="w-10 h-10" />}
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">
                     {actionType === 'iniciar' ? 'Iniciar Fluxo' : 'Finalizar Fluxo'}
                   </h3>
                   <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-black uppercase">{scannedOrderForAction.number}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{scannedOrderForAction.clientName}</span>
                   </div>
                </div>

                <div className="w-full h-px bg-border/40" />

                <div className="text-sm font-bold text-muted-foreground leading-relaxed">
                  {actionType === 'iniciar' 
                    ? 'Confirmar entrada do pedido na linha de produção agora?' 
                    : 'Confirmar conclusão e liberação técnica deste pedido?'}
                </div>

                <div className="w-full space-y-3">
                   <button
                    onClick={() => {
                      if (actionType === 'iniciar') {
                        iniciarProducao(scannedOrderForAction.id);
                      } else {
                        finalizarProducao(scannedOrderForAction.id);
                      }
                      setScannedOrderForAction(null);
                      setActionType(null);
                      setScanResult(null);
                      setShowScanner(false);
                      toast.success(`Pedido ${scannedOrderForAction.number} processado!`);
                    }}
                    className={`w-full py-5 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                      actionType === 'iniciar' ? 'bg-producao hover:bg-producao-dark' : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                   >
                     Confirmar Operação
                   </button>
                   
                   <button
                    onClick={() => {
                      setScannedOrderForAction(null);
                      setActionType(null);
                      setScanResult(null);
                    }}
                    className="w-full py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Unificação (SUPER MELHORADO) */}
        {showUnifyDialog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setShowUnifyDialog(false)} />
            <div className="glass-card p-8 w-full max-w-xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 shadow-2xl border-primary/20 flex flex-col max-h-[90vh]">
              <div className="flex flex-col items-center text-center space-y-4 mb-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/20 flex items-center justify-center text-primary shadow-xl animate-bounce-subtle">
                   <Share2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter italic">Central de Unificação</h3>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Vincular múltiplos pedidos a uma única caixa</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {/* 📦 SEÇÃO PEDIDO PAI (A CAIXA) */}
                <div className="p-6 rounded-3xl bg-primary/5 border-2 border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Pedido Principal (A Caixa)</label>
                    <span className="text-[9px] font-bold text-primary/60 italic">Onde tudo será colocado</span>
                  </div>
                  <input
                    type="text"
                    value={parentInput}
                    onChange={e => setParentInput(e.target.value)}
                    placeholder="Número do Pedido Pai..."
                    className="w-full bg-background border-2 border-primary/30 focus:border-primary px-6 py-4 rounded-2xl text-xl font-black text-foreground outline-none transition-all uppercase placeholder:text-muted-foreground/30"
                  />
                </div>

                {/* 📋 LISTA DE FILHOS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pedidos nesta Caixa ({unifyChildren.length})</label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={childInput}
                      onChange={e => setChildInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && childInput.trim()) {
                          if (!unifyChildren.includes(childInput.trim().toUpperCase())) {
                            setUnifyChildren([...unifyChildren, childInput.trim().toUpperCase()]);
                          }
                          setChildInput('');
                        }
                      }}
                      placeholder="Bipe ou digite outro pedido..."
                      className="flex-1 bg-muted/30 border-2 border-border/40 focus:border-primary/50 px-4 py-3 rounded-xl text-sm font-bold outline-none uppercase"
                    />
                    <button 
                      onClick={() => {
                        if (childInput.trim() && !unifyChildren.includes(childInput.trim().toUpperCase())) {
                          setUnifyChildren([...unifyChildren, childInput.trim().toUpperCase()]);
                          setChildInput('');
                        }
                      }}
                      className="px-4 bg-foreground text-background rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all"
                    >
                      ADICIONAR
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {unifyChildren.map(num => (
                      <div key={num} className="flex items-center justify-between bg-card border border-border/60 p-3 rounded-xl group animate-in slide-in-from-left-2">
                        <span className="text-xs font-black text-foreground">{num}</span>
                        <button 
                          onClick={() => setUnifyChildren(unifyChildren.filter(n => n !== num))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-600 font-bold leading-relaxed flex items-start gap-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Todos os pedidos da lista acima seguirão o status do pedido pai ({parentInput || '...'}) automaticamente.</span>
                </div>
              </div>

              <div className="pt-6 border-t border-border/20 space-y-3 mt-6">
                <button
                  onClick={handleUnify}
                  disabled={isUnifying || unifyChildren.length === 0 || !parentInput.trim()}
                  className="w-full py-5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-primary-dark transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isUnifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando Unificação...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Confirmar Unificação em Lote
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowUnifyDialog(false);
                    setUnifyChildren([]);
                    setChildInput('');
                    setParentInput('');
                  }}
                  className="w-full py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  // Guia de produção
  const guiaOrder = guia ? orders.find(o => o.id === guia) : null;
  if (guiaOrder) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="page-header">Guia de Producao</h1>
          <div className="flex gap-2">
            {guiaOrder.orderType === 'entrega' && (
              <button onClick={() => printEtiqueta(guiaOrder)} className="btn-primary">
                <Printer className="w-4 h-4" /> Imprimir Etiqueta
              </button>
            )}
            <button onClick={() => setGuia(null)} className="btn-modern bg-muted text-foreground shadow-none">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
        <div className="card-section p-8 space-y-6">
          <div className="text-center pb-6 border-b border-border/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-producao to-producao/70 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground">GUIA DE PRODUCAO</h2>
            <p className="text-lg font-bold gradient-text mt-1">{guiaOrder.number}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Cliente', value: guiaOrder.clientName },
              { label: 'Vendedor', value: guiaOrder.sellerName },
              { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
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
              <thead><tr><th>Produto</th><th>Descrição</th><th className="text-right">Qtd</th></tr></thead>
              <tbody>
                {guiaOrder.items.map(item => (
                  <tr key={item.id}>
                    <td className="text-foreground font-medium">
                      {item.product}
                      {item.sensorType && (
                        <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                          {item.sensorType === 'com_sensor' ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                    <td className="text-right text-foreground font-bold">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {guiaOrder.attachmentUrl && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Arquivo Técnico / Informativo (PDF)</p>
                  <p className="text-sm font-bold text-indigo-900">{guiaOrder.attachmentName || 'Manual'}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const win = window.open(cleanR2Url(guiaOrder.attachmentUrl!), '_blank');
                  if (win) {
                    win.focus();
                    setTimeout(() => {
                      try { win.print(); } catch (e) { toast.error("Imprima manualmente pela nova guia."); }
                    }, 1000);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-3 h-3" /> Imprimir PDF
              </button>
            </div>
          )}
          {guiaOrder.observation && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação</p>
              <p className="text-sm text-foreground">{guiaOrder.observation}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detalhe do pedido (Ficha de Trabalho)
  const viewOrder = viewOrderId ? orders.find(o => o.id === viewOrderId) : null;
  if (viewOrder) {
    const isOrderWarranty = viewOrder.isWarranty || viewOrder.notes?.toLowerCase().includes('garantia');
    const viewClientData = clients.find(c => c.id === viewOrder.clientId) || 
                           clients.find(c => c.name === viewOrder.clientName);

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
        {/* Modal de Agendamento */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
            <div className="card-section p-6 w-80 space-y-4 animate-scale-in shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Agendar Pedido</h3>
                <button onClick={() => { setShowScheduleModal(false); setScheduleDate(''); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selecione a Data</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="input-modern w-full"
                  autoFocus
                />
              </div>
              {viewOrder.scheduledDate && (
                <p className="text-xs text-muted-foreground">
                  Data atual: <span className="font-semibold">{new Date(viewOrder.scheduledDate).toLocaleDateString('pt-BR')}</span>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAgendar(viewOrder.id)}
                  disabled={!scheduleDate}
                  className="btn-primary flex-1 justify-center disabled:opacity-50"
                >
                  <CalendarClock className="w-4 h-4" /> Confirmar
                </button>
                <button onClick={() => { setShowScheduleModal(false); setScheduleDate(''); }} className="btn-modern bg-muted text-foreground shadow-none flex-1 justify-center">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Alerta de Pagamento de Altíssima Visibilidade */}
        {viewOrder.installationPaymentType && (
          <div className={`p-4 rounded-[2rem] flex items-center justify-between shadow-2xl animate-in slide-in-from-top-6 duration-700 border-b-8 ${
            viewOrder.installationPaymentType === 'pago' 
            ? 'bg-emerald-600 border-emerald-700/50 text-white shadow-emerald-500/20' 
            : 'bg-rose-500 border-rose-600/50 text-white shadow-rose-500/20 animate-pulse'
          }`}>
            <div className="flex items-center gap-4 pl-2">
               <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                  {viewOrder.installationPaymentType === 'pago' ? <CheckCircle className="w-8 h-8" /> : <DollarSign className="w-8 h-8" />}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-0.5">Status de Pagamento (Técnico)</p>
                  <p className="text-2xl font-black leading-none tracking-tighter uppercase">
                    {viewOrder.installationPaymentType === 'pago' ? 'CLIENTE JÁ PAGOU' : 'COBRAR NO LOCAL'}
                  </p>
               </div>
            </div>
            <div className="text-right pr-4 border-l border-white/20 ml-6">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5 whitespace-nowrap">Valor a Conferir</p>
               <p className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(viewOrder.total)}</p>
            </div>
          </div>
        )}

        {/* Header e Ficha Técnica */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/20 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">{viewOrder.number}</h1>
                {viewOrder.isSite && (
                   <span className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 animate-pulse flex items-center gap-2">
                     🌐 VENDA DO SITE
                   </span>
                )}
                {isOrderWarranty && (
                   <span className="px-3 py-1 rounded-full bg-destructive text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-destructive/20 animate-pulse">
                     🔥 GARANTIA CRÍTICA
                   </span>
                )}
             </div>
             <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-primary" /> {viewOrder.clientName}</span>
                <span className="opacity-30">•</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-vendedor" /> Vend: {viewOrder.sellerName}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <StatusBadge status={viewOrder.status} />
             <button 
                onClick={() => setViewOrderId(null)} 
                className="w-12 h-12 rounded-2xl bg-muted/50 text-foreground flex items-center justify-center hover:bg-muted transition-all border border-border/10 shadow-sm"
                title="Voltar"
             >
                <ArrowLeft className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* 📦 SEÇÃO DE UNIFICAÇÃO (FILHOS OU PAI) */}
        {(() => {
          const children = orders.filter(o => o.parentOrderId === viewOrder.id);
          const hasChildren = children.length > 0;
          const isChild = !!viewOrder.parentOrderId;

          if (!hasChildren && !isChild) return null;

          return (
            <div className={`p-4 rounded-[1.5rem] border-2 flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-500 ${
              hasChildren ? 'border-primary/20 bg-primary/[0.02]' : 'border-amber-500/20 bg-amber-500/[0.02]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasChildren ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600'}`}>
                   <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Logística de Unificação</h4>
                  <p className="text-sm font-black uppercase tracking-tight">
                    {hasChildren ? `Esta caixa contém ${children.length} pedido(s) unificado(s)` : `Este pedido está dentro da caixa do ${viewOrder.parentOrderNumber}`}
                  </p>
                </div>
              </div>

              {hasChildren && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setViewOrderId(child.id)}
                      className="px-3 py-1.5 rounded-xl bg-background border border-border/40 hover:border-primary transition-all flex items-center gap-2 group"
                    >
                      <span className="text-[10px] font-black text-foreground">{child.number}</span>
                      <StatusBadge status={child.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className={`p-5 rounded-3xl border-2 flex flex-col gap-3 transition-colors ${
             viewOrder.carrier?.toLowerCase() === 'jadlog' ? 'border-[#002d72]/20 bg-[#002d72]/[0.02]' : 'border-border/10 bg-muted/10'
           }`}>
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logística</span>
                 <Truck className={`w-5 h-5 ${viewOrder.carrier?.toLowerCase() === 'jadlog' ? 'text-[#002d72]' : 'text-primary'}`} />
              </div>
              <div>
                 <p className="text-xl font-black text-foreground uppercase truncate">{viewOrder.carrier || 'SEM TRANSP.'}</p>
                 <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Meio de Despacho</p>
              </div>
           </div>

           <div className={`p-5 rounded-3xl border-2 flex flex-col gap-3 ${isLate(viewOrder) ? 'border-destructive/30 bg-destructive/5' : 'border-border/10 bg-muted/10'}`}>
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Previsão</span>
                 <Calendar className={`w-5 h-5 ${isLate(viewOrder) ? 'text-destructive' : 'text-success'}`} />
              </div>
              <div>
                 <p className={`text-xl font-black uppercase ${isLate(viewOrder) ? 'text-destructive' : 'text-foreground'}`}>
                   {formatDate(viewOrder.deliveryDate)}
                 </p>
                 <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Data de Envio</p>
              </div>
           </div>

           <div className={`p-5 rounded-3xl border-2 flex flex-col gap-3 ${isScheduled(viewOrder) ? 'border-primary/30 bg-primary/5' : 'border-border/10 bg-muted/10'}`}>
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Execução</span>
                 <div className="flex gap-2">
                   <Clock className="w-5 h-5 text-amber-500" />
                 </div>
              </div>
              <div className="space-y-2">
                 {(() => {
                   const pendingItems = viewOrder.items.filter(item => item.status !== 'finalizado' && item.installationDate);
                   const uniqueDates = Array.from(new Set(pendingItems.map(item => item.installationDate!))).sort();
                   
                   if (uniqueDates.length === 0) {
                     const allFinished = viewOrder.items.every(item => item.status === 'finalizado');
                     return (
                       <p className={`text-xl font-black uppercase leading-none tracking-tighter ${allFinished ? 'text-success' : 'text-foreground'}`}>
                         {allFinished ? 'TUDO CONCLUÍDO' : 'DIRETO'}
                       </p>
                     );
                   }

                   return (
                     <div className="flex flex-wrap gap-2">
                        {uniqueDates.map(date => (
                          <div key={date} className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 animate-in fade-in zoom-in-95 duration-500">
                             <Calendar className="w-3 h-3 shrink-0" />
                             <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{fmtDate(date)}</span>
                          </div>
                        ))}
                     </div>
                   );
                 })()}
                 <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Cronograma de Instalação</p>
              </div>
           </div>
        </div>

        {/* FICHA DO CLIENTE */}
        <div className="bg-muted/10 rounded-3xl p-6 border border-border/10 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <Users2 className="w-32 h-32" />
           </div>
           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6 flex items-center gap-2">
              <div className="w-4 h-0.5 bg-primary/40" /> Ficha do Cliente
           </h4>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest block">Nome / Fantasia</span>
                 <p className="text-sm font-black text-foreground uppercase">{viewClientData?.name || viewOrder.clientName}</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest block">CNPJ / CPF</span>
                 <p className="text-sm font-bold text-foreground font-mono">{viewClientData?.cpfCnpj || '---'}</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest block">Telefone</span>
                 <p className="text-sm font-black text-foreground">{viewClientData?.phone || '---'}</p>
              </div>
              <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase text-muted-foreground/70 tracking-widest block">Cidade/UF</span>
                 <p className="text-sm font-black text-foreground uppercase">{viewClientData?.city || '---'} / {viewClientData?.state || '---'}</p>
              </div>
           </div>
        </div>

        {/* ANEXO TÉCNICO (PDF) */}
        {viewOrder.attachmentUrl && (
          <div className="p-6 mb-4 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group animate-in slide-in-from-bottom-4 duration-700">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <FileText className="w-24 h-24" />
            </div>
            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Anexo Técnico Disponível</h4>
                  <p className="text-lg font-black tracking-tight">{viewOrder.attachmentName || 'Manual de Instruções / Roteiro PDF'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href={cleanR2Url(viewOrder.attachmentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-white text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Visualizar PDF
                </a>
                <button
                  onClick={() => {
                    const win = window.open(cleanR2Url(viewOrder.attachmentUrl!), '_blank');
                    if (win) {
                      win.focus();
                      setTimeout(() => {
                        try { win.print(); } catch (e) { toast.error("Por favor, imprima manualmente pela janela aberta."); }
                      }, 1000);
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-indigo-900/30 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-900/50 transition-colors flex items-center gap-2 border border-white/20"
                >
                  <Printer className="w-4 h-4" /> Imprimir Anexo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPONENTES DE MONTAGEM */}
        <div className="glass-card overflow-hidden rounded-[2rem] border-2 border-border/40 shadow-xl">
           <div className="bg-foreground py-3 px-6 flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-background">Componentes de Montagem</h4>
              <div className="px-2 py-0.5 rounded-full bg-background/10 text-background text-[9px] font-black">{viewOrder.items.length} ITENS</div>
           </div>
           <div className="p-2 space-y-1">
              {viewOrder.items.map((item, itemIdx) => (
                <div key={item.id || itemIdx} className={`p-4 sm:p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center gap-4 transition-all border-b border-border/10 last:border-none ${item.status === 'finalizado' ? 'bg-emerald-500/[0.05]' : item.status === 'em_producao' ? 'bg-primary/[0.03]' : ''}`}>
                   <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                     <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl font-black text-primary shrink-0 border border-border/10 shadow-sm">
                        {item.quantity}<span className="text-[9px] ml-0.5 mt-2 opacity-50">x</span>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                           <h5 className="text-lg font-black text-foreground tracking-tight uppercase truncate">{item.product}</h5>
                           {item.product.toUpperCase().includes('KIT') && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 ${(!item.sensorType || item.sensorType === 'com_sensor') ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                 {(!item.sensorType || item.sensorType === 'com_sensor') ? <><Zap className="w-3 h-3 fill-current" /> COM SENSOR</> : '⚪ SEM SENSOR'}
                              </span>
                           )}
                           {item.installationDate && (
                             <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase flex items-center gap-1.5 border border-primary/20 shadow-sm">
                               <Calendar className="w-3 h-3" /> {fmtDate(item.installationDate)} às {item.installationTime}
                             </span>
                           )}
                        </div>
                        <p className="text-sm font-bold text-muted-foreground italic leading-tight line-clamp-2">{item.description || 'Nenhuma instrução adicional.'}</p>
                     </div>
                   </div>

                   {((viewOrder.orderType === 'instalacao' || viewOrder.orderType === 'manutencao') && viewOrder.items.length > 1) && (
                     <div className="flex flex-wrap gap-2 w-full lg:w-auto shrink-0 mt-2 lg:mt-0">
                     {(!item.status || item.status === 'pendente') && (
                       <button
                         onClick={async () => {
                           const newItems = [...viewOrder.items];
                           newItems[itemIdx] = { ...newItems[itemIdx], status: 'em_producao' };
                           try {
                             await updateOrder(viewOrder.id, { items: newItems });
                             toast.success(`Item "${item.product}" iniciado!`);
                           } catch (err) {
                             toast.error("Erro ao iniciar item.");
                           }
                         }}
                         className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-producao text-white text-[11px] font-black uppercase tracking-widest hover:bg-producao/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-producao/20 active:scale-95"
                       >
                         <Play className="w-4 h-4" /> Iniciar Produção
                       </button>
                     )}

                     {item.status === 'em_producao' && (
                       <button
                         onClick={async () => {
                           const newItems = [...viewOrder.items];
                           newItems[itemIdx] = { ...newItems[itemIdx], status: 'finalizado' };
                           try {
                             await updateOrder(viewOrder.id, { items: newItems });
                             toast.success(`Item "${item.product}" finalizado!`);
                           } catch (err) {
                             toast.error("Erro ao finalizar item.");
                           }
                         }}
                         className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                       >
                         <CheckCircle className="w-4 h-4" /> Finalizar Item
                       </button>
                     )}
                     
                     {item.status === 'finalizado' && (
                       <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-3 rounded-xl border border-success/20">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Concluído</span>
                          <button
                            onClick={async () => {
                              const newItems = [...viewOrder.items];
                              newItems[itemIdx] = { ...newItems[itemIdx], status: 'em_producao' };
                              try {
                                await updateOrder(viewOrder.id, { items: newItems });
                                toast.success(`Item "${item.product}" reaberto!`);
                              } catch (err) {
                                toast.error("Erro ao reabrir item.");
                              }
                            }}
                            className="ml-2 p-1 hover:bg-success/20 rounded-md transition-colors"
                            title="Refazer Item"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                       </div>
                     )}
                   </div>
                 )}
                </div>
              ))}
           </div>
        </div>

        {/* OBSERVAÇÕES */}
        {(viewOrder.observation || viewOrder.notes) && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viewOrder.observation && (
                <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> Obs. Vendedor</h5>
                   <p className="text-sm font-bold text-foreground leading-relaxed">{viewOrder.observation}</p>
                </div>
              )}
              {viewOrder.notes && (
                <div className="p-5 rounded-3xl bg-primary/5 border border-primary/20">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Notas do Pedido</h5>
                   <p className="text-sm font-bold text-foreground italic opacity-80">{viewOrder.notes}</p>
                </div>
              )}
           </div>
        )}

        {/* FOOTER AÇÕES */}
        <div className="sticky bottom-6 left-0 right-0 z-40 px-4">
           <div className="glass-card p-3 rounded-[1.5rem] border-border/20 shadow-2xl flex items-center justify-between gap-4">
              <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                viewOrder.paymentStatus === 'pago' || isOrderWarranty || viewOrder.total === 0 || viewOrder.financeiroAprovado
                ? 'bg-success/10 text-success' 
                : 'bg-warning/10 text-warning animate-pulse'
              }`}>
                 <div className={`w-2 h-2 rounded-full ${
                   viewOrder.paymentStatus === 'pago' || isOrderWarranty || viewOrder.total === 0 || viewOrder.financeiroAprovado
                   ? 'bg-success' 
                   : 'bg-warning'
                 }`} />
                 {viewOrder.paymentStatus === 'pago' || isOrderWarranty || viewOrder.total === 0 || viewOrder.financeiroAprovado
                   ? 'Liberado Saída' 
                   : 'Pagam. Pendente'
                 }
              </div>

              <div className="flex items-center gap-2">
                 {['aguardando_producao', 'aprovado_financeiro', 'aprovado_gestor'].includes(viewOrder.status) && (
                    <button onClick={() => { iniciarProducao(viewOrder.id); setViewOrderId(null); }} className="btn-primary from-producao to-producao/80 px-6 py-3 text-xs font-black uppercase rounded-xl transition-all text-white">
                       <Play className="w-4 h-4 mr-2" /> Iniciar
                    </button>
                 )}
                 {viewOrder.status === 'em_producao' && (
                    <button onClick={() => { finalizarProducao(viewOrder.id); setViewOrderId(null); }} className="btn-primary bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-3 text-xs font-black uppercase rounded-xl transition-all text-white">
                       <CheckCircle className="w-4 h-4 mr-2" /> Finalizar
                    </button>
                 )}
                 {(viewOrder.status === 'producao_finalizada' || viewOrder.status === 'produto_liberado' || viewOrder.status === 'retirado_entregador') && (
                    <div className="flex gap-2">
                       <button onClick={() => setGuia(viewOrder.id)} className="btn-primary from-primary to-primary/80 px-6 py-3 text-xs font-black uppercase rounded-xl transition-all text-white">
                          <Printer className="w-4 h-4 mr-2" /> Guia
                       </button>
                       {viewOrder.orderType === 'entrega' && (
                         <button onClick={() => printEtiqueta(viewOrder)} className="btn-modern bg-emerald-500/10 text-emerald-600 px-6 py-3 text-xs font-black hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl">
                            <Printer className="w-4 h-4 mr-2" /> Etiqueta
                         </button>
                       )}
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-10 pb-20 relative">
      {/* Decorative Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-success/5 rounded-full blur-[100px]" />
      </div>

      <RealtimeNotificationHandler />
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-card to-card/50 border border-border/40 p-8 sm:p-10 shadow-2xl shadow-primary/5 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[hsl(var(--gestor))]/5 rounded-full blur-3xl -ml-32 -mb-32 transition-transform duration-1000 group-hover:scale-110" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mainGradient} flex items-center justify-center text-white shadow-2xl ${mainShadow} transform transition-transform duration-500 hover:rotate-12`}>
                <MainIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                  <span className="gradient-text">{PAGE_TITLES[tipoFiltro] ?? 'Pedidos de Produção'}</span>
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${mainGradient} text-white shadow-sm`}>
                    Fábrica Industrial
                  </span>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    {tipoFiltro === 'entrega' ? 'Aguardando despacho' :
                      tipoFiltro === 'instalacao' ? 'Equipe de campo' :
                        tipoFiltro === 'atrasado' ? 'Pendências críticas' :
                          'Gestão da fábrica industrial'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {tipoFiltro === 'instalacao' && (
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border border-border/20 backdrop-blur-md">
                <Calendar className="w-4 h-4 text-primary ml-1" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-black focus:outline-none uppercase"
                />
              </div>
            )}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`btn-modern gap-3 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-500 ${showCalendar ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105' : 'bg-card border border-border/40 hover:border-primary/40 text-foreground shadow-lg'}`}
            >
              <CalendarClock className={`w-4 h-4 ${showCalendar ? 'animate-bounce' : ''}`} />
              {showCalendar ? 'Ocultar Calendário' : 'Ver Calendário'}
            </button>
            <button 
              onClick={() => setShowScanner(true)} 
              className={`btn-modern bg-gradient-to-r ${mainGradient} text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl ${mainShadow} hover:scale-105 active:scale-95 duration-300`}
            >
              <ScanLine className="w-4 h-4 mr-2" /> <span>Ler Código de Barras</span>
            </button>
          </div>
        </div>
      </div>

      {showCalendar && (
        <div className="card-section p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
              <CalendarClock className="w-5 h-5 text-primary" /> Calendário de Previsão & Produção
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold">Clique em um dia para filtrar os pedidos</p>
          </div>
          <ModernCalendar
            orders={calendarProductionOrders}
            onDateClick={(date) => {
              const dateStr = date.toISOString().split('T')[0];
              setSelectedDate(dateStr);
              setStatusFilter('planejamento'); // Muda para a aba de previsões ao clicar no dia
              setSearch(''); // Limpa busca para ver os do dia
              toast.info(`Mostrando pedidos para ${date.toLocaleDateString('pt-BR')}`);
            }}
            onOrderClick={(order) => {
              setViewOrderId(order.id);
            }}
            role="producao"
          />
        </div>
      )}

      {/* Modern Toolbar Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="lg:col-span-6 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Buscar por Pedido, Cliente ou Vendedor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-card/60 backdrop-blur-md border border-border/60 hover:border-primary/30 pl-14 pr-6 py-4 rounded-[1.5rem] text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-inner outline-none" 
          />
        </div>
        
        <div className="lg:col-span-6 flex items-center gap-4">
          <ModernSelect 
            title="Tipo de Pedido"
            icon={Filter}
            value={orderTypeFilter}
            onChange={setOrderTypeFilter}
            options={[
              { value: 'todos', label: 'TODOS OS TIPOS' },
              { value: 'entrega', label: 'ENTREGA', icon: '📦' },
              { value: 'instalacao', label: 'INSTALAÇÃO', icon: '🔧' },
              { value: 'retirada', label: 'RETIRADA', icon: '🏢' },
              { value: 'manutencao', label: 'MANUTENÇÃO', icon: '🛠️' },
            ]}
          />

          <ModernSelect 
            title="Meio de Envio"
            icon={Truck}
            value={carrierFilter}
            onChange={setCarrierFilter}
            options={[
              { value: 'todos', label: 'TODOS OS MEIOS' },
              { value: 'jadlog', label: 'JADLOG', icon: '🚛' },
              { value: 'motoboy', label: 'MOTOBOY', icon: '🛵' },
              { value: 'kleyton', label: 'KLEYTON', icon: '👤' },
              { value: 'lalamove', label: 'LALAMOVE', icon: '🚚' },
              { value: 'retirada', label: 'RETIRADA LOCAL', icon: '🏢' },
              { value: 'sem_definir', label: 'SEM DEFINIR', icon: '❓' },
            ]}
          />
        </div>
      </div>
      
      {
        statusFilter === 'garantias' ? (
          <div className="space-y-3">
            {warranties.filter(w => w.status === 'Em produção').length === 0 ? (
              <div className="card-section p-12 text-center text-muted-foreground">Nenhuma garantia em produção</div>
            ) : (
              warranties.filter(w => w.status === 'Em produção').map(w => (
                <div key={w.id} className="card-section p-4 sm:p-5 border-primary/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <HistoryIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-foreground">{w.orderNumber}</span>
                          <span className="status-badge bg-primary/10 text-primary text-[9px]">EM PRODUÇÃO</span>
                        </div>
                        <p className="text-sm font-bold text-foreground truncate">{w.clientName}</p>
                        <p className="text-xs text-muted-foreground italic mt-1 font-medium line-clamp-1">"{w.description}"</p>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto">
                      {w.orderId && (
                        <button
                          onClick={() => setViewOrderId(w.orderId)}
                          className="btn-modern flex-1 sm:flex-none justify-center bg-muted/50 text-foreground hover:bg-muted text-[10px] font-bold py-2.5 px-4 border border-border/20"
                        >
                          <Eye className="w-4 h-4 mr-2" /> <span className="sm:hidden">Ver</span><span className="hidden sm:inline">Detalhes</span>
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (window.confirm('Marcar esta garantia como FINALIZADA?')) {
                            await updateWarrantyStatus(w.id, 'Garantia finalizada', undefined, user?.name || 'Produção', 'Garantia concluída pela produção');
                            alert('Garantia concluída!');
                          }
                        }}
                        className="btn-modern flex-1 sm:flex-none justify-center bg-success/10 text-success hover:bg-success/20 text-[10px] font-bold py-2.5 px-4 border border-success/20"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Finalizar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="card-section p-12 text-center bg-card/50 backdrop-blur-sm border-dashed border-2">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Package className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-black text-xl uppercase tracking-widest">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Aguardando novos fluxos da fábrica ou critérios de busca</p>
          </div>
        ) : (
          <div className="space-y-12 mt-4">
            {Object.entries(groupedOrders).map(([clientName, clientOrders]) => (
              <div key={clientName} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="flex items-center justify-between group/header cursor-default px-2">
                  <div className="flex items-center gap-5">
                    <div className={`w-2 h-10 bg-gradient-to-b ${mainGradient} rounded-full shadow-lg ${mainShadow}`} />
                    <div>
                      <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-none group-hover/header:text-primary transition-colors">{clientName}</h2>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.1em] flex items-center gap-2">
                           Linha de Montagem • <span className="text-primary">{clientOrders.length} {clientOrders.length === 1 ? 'Pedido' : 'Pedidos'} em fila</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:block h-px flex-1 bg-gradient-to-r from-border/40 to-transparent ml-12" />
                </div>

                <div className="grid grid-cols-1 gap-5 ml-2 border-l border-border/20 pl-6 stagger-children">
                  {clientOrders.map(order => {
                    const late = isLate(order);
                    const scheduled = isScheduled(order);
                    const isPlanning = order.status === 'planejamento';
                    
                    // Cores e Ícones por transportadora
                    const carrierInfo = {
                      jadlog: { color: 'bg-[#002d72] text-white', label: 'JADLOG', icon: Truck },
                      motoboy: { color: 'bg-emerald-500 text-white', label: 'MOTOBOY', icon: ShieldCheck },
                      kleyton: { color: 'bg-orange-500 text-white', label: 'KLEYTON', icon: User },
                      retirada: { color: 'bg-slate-800 text-white', label: 'RETIRADA LOCAL', icon: Package },
                    }[(order.carrier || '').toLowerCase()] || { color: 'bg-muted text-muted-foreground', label: order.carrier || 'TRANSF...', icon: Package };

                    return (
                      <div key={order.id} className={`bg-card/80 backdrop-blur-md border border-border/40 transition-all duration-500 rounded-[2rem] relative overflow-hidden group/card
                        hover:bg-card hover:shadow-[0_20px_50px_-12px_rgba(var(--primary),0.08)] hover:-translate-y-1.5 active:scale-[0.99]
                        dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]
                        ${late ? 'ring-2 ring-destructive/20 border-destructive/30' : ''} 
                        ${order.isSite ? 'ring-2 ring-blue-500/20 border-blue-500/30' : ''}`}>
                        
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-muted/20" />
                        <div className={`absolute inset-x-0 bottom-0 h-1.5 transition-all duration-500 w-0 group-hover/card:w-full ${
                          order.status === 'aguardando_producao' ? 'bg-warning' :
                          order.status === 'em_producao' ? 'bg-primary' :
                          'bg-success'
                        }`} />

                        <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                          <div className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0">
                            {/* Avatar/Icon Group */}
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative group/icon transition-transform duration-700 group-hover/card:rotate-6 ${late ? 'bg-destructive/10' : 'bg-muted/30'}`}>
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                              {order.isWarranty || order.notes?.includes('GARANTIA') ? (
                                <HistoryIcon className={`w-7 h-7 sm:w-8 sm:h-8 relative z-10 transition-transform group-hover/icon:scale-110 ${late ? 'text-destructive' : 'text-primary'}`} />
                              ) : (
                                <Package className={`w-7 h-7 sm:w-8 sm:h-8 relative z-10 transition-transform group-hover/icon:scale-110 ${late ? 'text-destructive' : 'text-muted-foreground'}`} />
                              )}
                            </div>

                            {/* Info Group */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <h3 className="font-black text-foreground text-xl sm:text-2xl tracking-tighter uppercase flex items-center gap-3">
                                  {order.number}
                                  {(() => {
                                    const childCount = orders.filter(o => o.parentOrderId === order.id).length;
                                    if (childCount > 0) return (
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-[10px] font-black border border-primary/20" title={`${childCount} pedidos unificados nesta caixa`}>
                                        <Package className="w-3.5 h-3.5" /> +{childCount}
                                      </span>
                                    );
                                    if (order.parentOrderId) return (
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20" title={`Unificado no pedido #${order.parentOrderNumber}`}>
                                        <Share2 className="w-3.5 h-3.5" /> {order.parentOrderNumber}
                                      </span>
                                    );
                                    return null;
                                  })()}
                                  <div className="flex items-center gap-1.5">
                                    {order.isSite && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/30 animate-pulse">
                                        LOJA ONLINE
                                      </span>
                                    )}
                                    {(order.isWarranty || order.notes?.toLowerCase().includes('garantia')) && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-destructive text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-destructive/30">
                                        GARANTIA
                                      </span>
                                    )}
                                  </div>
                                </h3>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                   <StatusBadge status={order.status} />
                                   
                                   {order.carrier && (
                                     <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${carrierInfo.color}`}>
                                       <carrierInfo.icon className="w-3 h-3" />
                                       {carrierInfo.label}
                                     </span>
                                   )}

                                   {/* Badge de Tipo de Pedido */}
                                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                     order.orderType === 'instalacao' ? 'bg-amber-500 text-white' :
                                     order.orderType === 'manutencao' ? 'bg-indigo-500 text-white' :
                                     order.orderType === 'retirada' ? 'bg-slate-700 text-white' :
                                     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                   }`}>
                                     {order.orderType === 'instalacao' ? '🔧 Inst.' :
                                      order.orderType === 'manutencao' ? '🛠️ Manut.' :
                                      order.orderType === 'retirada' ? '🏢 Retirada' :
                                      '📦 Entrega'}
                                   </span>

                                   {late && (
                                     <span className="px-3 py-1 rounded-full bg-destructive text-white text-[9px] font-black uppercase tracking-widest animate-bounce shadow-lg shadow-destructive/40">
                                       ATRASADO
                                     </span>
                                   )}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-xs mb-4">
                                 <span className="font-extrabold text-foreground/90 flex items-center gap-2 group/client transition-colors hover:text-primary cursor-default">
                                   <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                     <User className="w-3.5 h-3.5" />
                                   </div>
                                   {order.clientName}
                                 </span>
                                 <div className="flex items-center gap-3">
                                   <span className="text-muted-foreground font-bold flex items-center gap-2">
                                     Vendedor: <span className="text-foreground">{order.sellerName}</span>
                                   </span>
                                   {(order.orderType === 'instalacao' || order.orderType === 'manutencao' || order.orderType === 'retirada') && (order.installationDate || order.scheduledDate) && (
                                      <span className="text-primary font-black flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10 transition-transform group-hover/card:scale-105">
                                        <Clock className="w-3.5 h-3.5" />
                                        {fmtDate(order.installationDate || order.scheduledDate)} {order.installationTime ? `@ ${order.installationTime}` : ''}
                                      </span>
                                   )}
                                 </div>
                              </div>

                              {/* Modern Itens List */}
                              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                                {order.items.map((i, idx) => (
                                  <div key={idx} className="group/item relative">
                                    <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 transition-all duration-300
                                      group-hover/card:shadow-sm
                                      ${i.sensorType === 'com_sensor' 
                                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 group-hover/item:bg-emerald-500/10' 
                                        : 'bg-muted/40 border-border/20 text-foreground/80 group-hover/item:bg-muted/60'}
                                    `}>
                                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                        i.sensorType === 'com_sensor' ? 'bg-emerald-500 text-white' : 'bg-muted-foreground/10 text-muted-foreground'
                                      }`}>
                                        {i.quantity}x
                                      </div>
                                      <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight truncate max-w-[150px]">{i.product}</span>
                                      
                                      {i.installationDate && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[8px] font-black">
                                          <Calendar className="w-2.5 h-2.5" /> {fmtDate(i.installationDate)}
                                        </div>
                                      )}

                                      {i.status === 'finalizado' && (
                                         <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-success/10 text-success border border-success/20 text-[8px] font-black animate-in fade-in zoom-in-95">
                                           <CheckCircle className="w-2.5 h-2.5" /> OK
                                         </div>
                                      )}
                                      
                                      {i.status === 'em_producao' && (
                                         <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-producao/10 text-producao border border-producao/20 text-[8px] font-black animate-pulse">
                                           <Play className="w-2.5 h-2.5" /> INICIADO
                                         </div>
                                      )}

                                      {i.sensorType === 'com_sensor' && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 group-hover/item:animate-pulse">
                                          <Zap className="w-2.5 h-2.5 fill-current" />
                                          <span className="text-[7px] font-black tracking-widest">SENSOR</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Refined Actions Group */}
                          <div className="flex flex-row items-center gap-3 w-full md:w-auto shrink-0 self-end md:self-center">
                            <button 
                              onClick={() => setViewOrderId(order.id)} 
                              className="h-12 flex-1 md:flex-none justify-center btn-modern bg-muted/50 text-foreground text-[10px] sm:px-6 font-black hover:bg-muted border border-border/10 rounded-2xl transition-all"
                            >
                              DETALHES
                            </button>

                            {['aguardando_producao', 'aprovado_financeiro', 'aprovado_gestor'].includes(order.status) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); iniciarProducao(order.id); }} 
                                className={`h-12 flex-1 md:flex-none justify-center btn-primary bg-gradient-to-br ${mainGradient} px-8 text-xs font-black uppercase rounded-2xl shadow-xl ${mainShadow} transform active:scale-95 transition-all text-white border-none group/btn`}
                              >
                                <Play className="w-4 h-4 mr-2 group-hover/btn:translate-x-1 transition-transform" /> INICIAR
                              </button>
                            )}

                            {order.status === 'em_producao' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); finalizarProducao(order.id); }} 
                                className="h-12 flex-1 md:flex-none justify-center btn-primary bg-gradient-to-br from-emerald-500 to-emerald-600 px-8 text-xs font-black uppercase rounded-2xl shadow-xl shadow-success/20 transform active:scale-95 transition-all text-white group/btn"
                              >
                                <CheckCircle className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" /> FINALIZAR
                              </button>
                            )}

                            <div className="flex gap-2.5 flex-1 md:flex-none">
                              {(order.status === 'producao_finalizada' || order.status === 'produto_liberado') && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setGuia(order.id); }} 
                                  className="h-12 flex-1 md:flex-none justify-center btn-modern bg-primary/10 text-primary px-6 text-xs font-black hover:bg-primary/20 border border-primary/20 rounded-2xl shadow-lg shadow-primary/5 transition-all"
                                >
                                  GUIA
                                </button>
                              )}
                              {order.orderType === 'entrega' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); printEtiqueta(order); }} 
                                  className="h-12 w-12 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shadow-sm"
                                  title="Imprimir Etiqueta"
                                >
                                  <Printer className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default PedidosProducaoPage;
