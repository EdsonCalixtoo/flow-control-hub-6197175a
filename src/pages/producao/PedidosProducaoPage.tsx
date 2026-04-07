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
  const { orders, clients, barcodeScans, updateOrderStatus, addBarcodeScan, updateOrder, addDelayReport, loadFromSupabase, loading, warranties, updateWarrantyStatus, loadOrderDetails } = useERP();
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

  const printEtiqueta = (order: typeof orders[0]) => {
    console.log('[Etiqueta] 🏷️ Preparando impressão para pedido:', order.number);
    console.log('[Etiqueta] 🆔 Tentando encontrar cliente ID:', order.clientId);

    // Fallback: Tenta encontrar por ID ou por Nome de forma ultra robusta
    const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

    let client = clients.find(c => c.id === order.clientId);
    if (!client) {
      console.warn('[Etiqueta] ⚠️ Cliente não encontrado por ID. Tentando busca robusta por nome:', order.clientName);
      const nameRef = normalize(order.clientName || "");
      client = clients.find(c => normalize(c.name) === nameRef);
    }

    if (client) {
      console.log('[Etiqueta] ✅ Cliente encontrado:', client.name, 'Endereço:', client.address);
    } else {
      console.error('[Etiqueta] ❌ Cliente não localizado (Total na base:', clients.length, ')');
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const barcodeCanvas = document.createElement('canvas');
    // @ts-ignore
    import('jsbarcode').then(async (mod) => {
      const JsBarcode = (mod as any).default || mod;
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
.destinatario { flex: 1; padding: 4mm; border: 1.5mm solid #000; border-radius: 1mm; background: #fff; display: flex; flex-direction: column; justify-content: center; }
.destinatario .name { font-size: 15pt; font-weight: 900; color: #000; margin-bottom: 2mm; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.1; }
.destinatario .address { font-size: 10pt; color: #000; line-height: 1.4; font-weight: 800; }
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
        ${client?.address || '<span style="color:red">ENDEREÇO NÃO LOCALIZADO</span>'}
        ${client?.bairro ? `<br>Bairro: ${client.bairro}` : ''}
        ${client ? `<br>${client.city} - ${client.state} CEP: ${client.cep}` : ''}
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
    });
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

    // Pedido é considerado "Concluído" para a produção se já foi Finalizado, Liberado, Retirado ou Escaneado
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

  const iniciarProducao = (orderId: string) => {
    updateOrderStatus(orderId, 'em_producao', {
      productionStartedAt: new Date().toISOString(),
      productionStatus: 'em_producao',
    }, 'Equipe Producao', 'Producao iniciada');
  };

  const finalizarProducao = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const qrCode = `${window.location.origin}/qr/${orderId}`;
    const finishedBy = user?.name || 'Equipe Producao';
    const now = new Date().toISOString();

    const isFieldWork = order.orderType === 'instalacao' || order.orderType === 'manutencao';
    const nextStatus = isFieldWork ? 'produto_liberado' : 'producao_finalizada';

    updateOrderStatus(orderId, nextStatus, {
      productionFinishedAt: now,
      qrCode: order.orderType === 'retirada' || isFieldWork ? undefined : qrCode,
      productionStatus: 'finalizado',
      releasedAt: isFieldWork ? now : undefined,
      releasedBy: isFieldWork ? finishedBy : undefined,
    }, finishedBy, isFieldWork ? 'Produção finalizada e liberada para o campo' : 'Producao finalizada');

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
    const order = orders.find(o => o.number === code);
    const scannedBy = user?.name || 'Equipe Produção';
    const now = new Date().toISOString();

    if (order) {
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
      } else if (!['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada'].includes(order.status)) {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Pedido não aprovado pelo financeiro. Status: ${order.status}`,
        });
        setScanResult({
          success: false,
          message: `❌ Pedido ${order.number} NÃO foi aprovado pelo financeiro. Status: ${order.status}. Fale com o financeiro para liberar.`
        });
      } else {
        await addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Produção não finalizada. Status atual: ${order.status}`,
        });
        setScanResult({ success: false, message: `⚠️ Pedido ${order.number} ainda não finalizou a produção. Status atual: ${order.status}. Finalize o pedido antes de liberar.` });
      }
    } else {
      setScanResult({ success: false, message: '❌ Código não encontrado. Verifique se o código é o número do pedido (ex: PED-001).' });
    }
    setScanInput('');
  }, [orders, barcodeScans, addBarcodeScan, updateOrderStatus, user, loadFromSupabase]);

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

  // Scanner screen
  if (showScanner) {
    const recentScans = barcodeScans.slice(0, 5);
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Leitura de Código de Barras</h1>
            <p className="page-subtitle">Escaneie via câmera {barcodeDetectorAvailable ? '(se disponível)' : ''}, leitor USB ou digite manualmente</p>
          </div>
          <button onClick={() => { setShowScanner(false); setScanResult(null); stopCamera(); }} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Fechar
          </button>
        </div>
        <div className="max-w-lg mx-auto space-y-6">
          {/* Camera scanner */}
          <div className="card-section p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-producao/20 to-producao/5 flex items-center justify-center mx-auto mb-3">
                <ScanLine className="w-8 h-8 text-producao" />
              </div>
              <h2 className="text-base font-bold text-foreground">Leitura de Código</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {barcodeDetectorAvailable ? 'Use câmera, leitor USB ou digite' : 'Usa leitor USB ou digite manualmente'}
              </p>
            </div>

            {/* Aviso se BarcodeDetector não disponível */}
            {!barcodeDetectorAvailable && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs space-y-1">
                <p className="font-semibold">⚠️ Detecção automática indisponível neste navegador</p>
                <p>Use um dos métodos abaixo:</p>
                <ul className="ml-3 mt-1 space-y-0.5">
                  <li>• 📱 <strong>Leitor USB</strong>: Conecte um scanner de código de barras</li>
                  <li>• ⌨️ <strong>Digitar</strong>: Digite o número do pedido manualmente</li>
                  <li>• 🌐 <strong>Navegador</strong>: Use Chrome/Edge/Safari 14+ para câmera</li>
                </ul>
              </div>
            )}

            {/* Video — sempre no DOM para que videoRef.current esteja sempre válido */}
            {barcodeDetectorAvailable && (
              <div className={`space-y-3 ${!cameraActive ? 'hidden' : ''}`}>
                <div className="relative rounded-xl overflow-hidden border-2 border-producao/40 bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-48 object-cover"
                    playsInline
                    autoPlay
                    muted
                    onCanPlay={() => { videoRef.current?.play().catch(() => { }); }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-white/70 rounded-xl" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded-full">Aponte para o código de barras</span>
                  </div>
                </div>
                <button onClick={stopCamera} className="btn-modern bg-destructive/10 text-destructive shadow-none text-xs w-full justify-center">
                  <StopCircle className="w-4 h-4" /> Parar Câmera
                </button>
              </div>
            )}

            {cameraError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-2">
                <p className="font-semibold">Erro na câmera:</p>
                <p>{cameraError}</p>
              </div>
            )}

            {barcodeDetectorAvailable && !cameraActive && (
              <button onClick={startCamera} className="btn-modern bg-producao/10 text-producao shadow-none w-full justify-center py-3 hover:bg-producao/20 border border-producao/20">
                <Camera className="w-4 h-4" /> Ativar Câmera
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] text-muted-foreground font-semibold">DIGITAR / LEITOR USB</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="PED-001 ou código de barras"
                className="input-modern text-center text-lg font-mono font-bold tracking-widest flex-1"
                autoFocus={!cameraActive || !barcodeDetectorAvailable}
              />
              <button onClick={handleScan} className="btn-primary px-6" disabled={!scanInput.trim()}>Validar</button>
            </div>
          </div>

          {/* Scan result */}
          {scanResult && (
            <div className={`card-section p-6 text-center animate-scale-in ${scanResult.success ? 'border-success/40' : 'border-destructive/40'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${scanResult.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {scanResult.success ? <CheckCircle className="w-8 h-8 text-success" /> : <X className="w-8 h-8 text-destructive" />}
              </div>
              <p className={`font-bold text-sm ${scanResult.success ? 'text-success' : 'text-destructive'}`}>
                {scanResult.success ? '✅ Sucesso!' : '❌ Erro'}
              </p>
              <p className="text-sm text-foreground mt-1">{scanResult.message}</p>

              {!scanResult.success && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground text-left space-y-1">
                  <p className="font-semibold">💡 Dicas de solução:</p>
                  <ul className="ml-3 space-y-1">
                    <li>• Verifique se o número do pedido está correto</li>
                    <li>• Confirme que o código de barras corresponde ao número do pedido</li>
                    <li>• Se usar leitor USB, certifique-se que está configurado como teclado</li>
                    <li>• Limpe a câmera se usar modo câmera</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recent scans */}
          {recentScans.length > 0 && (
            <div className="card-section p-4 space-y-3">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Últimas leituras</p>
              </div>
              {recentScans.map(scan => (
                <div key={scan.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${scan.success ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                  <div className="flex items-center gap-2">
                    {scan.success
                      ? <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                      : <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    <div>
                      <p className="text-xs font-bold text-foreground">{scan.orderNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{scan.scannedBy}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(scan.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Volumes sobreposto durante scanner */}
        {showVolumesDialog && scannedOrderForVolumes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm">
            <div className="card-section p-6 w-96 space-y-4 animate-scale-in shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-lg">Quantos volumes?</h3>
                <button
                  onClick={() => {
                    setShowVolumesDialog(false);
                    setScannedOrderForVolumes(null);
                    setVolumesInput('1');
                    setScanResult(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-3 border-b border-border/30">
                <p className="text-sm font-bold text-foreground">{scannedOrderForVolumes.number}</p>
                <p className="text-xs text-muted-foreground">{scannedOrderForVolumes.clientName}</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground block">
                  Quantidade de Volumes / Caixas
                </label>
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => setVolumesInput(Math.max(1, parseInt(volumesInput) - 1).toString())}
                    className="w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-lg"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={volumesInput}
                    onChange={e => setVolumesInput(Math.max(1, parseInt(e.target.value) || 1).toString())}
                    className="input-modern text-center text-3xl font-bold w-24 py-2"
                    autoFocus
                  />
                  <button
                    onClick={() => setVolumesInput((parseInt(volumesInput) + 1).toString())}
                    className="w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-lg"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  💡 Escanear 2 vezes = {volumesInput} {parseInt(volumesInput) === 1 ? "volume" : "volumes"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-producao/5 border border-producao/20 space-y-1">
                <p className="text-xs text-muted-foreground">
                  ✓ Pedido <span className="font-bold text-foreground">{scannedOrderForVolumes.number}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ Será liberado com <span className="font-bold text-producao">{volumesInput} {parseInt(volumesInput) === 1 ? "volume" : "volumes"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ Seguirá para <span className="font-bold text-success">entregadores</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVolumesDialog(false);
                    setScannedOrderForVolumes(null);
                    setVolumesInput('1');
                    setScanResult(null);
                  }}
                  className="btn-modern bg-muted text-foreground shadow-none flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmVolumes}
                  disabled={!volumesInput || parseInt(volumesInput) < 1}
                  className="btn-primary flex-1 gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar
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
              <div>
                 <p className="text-xl font-black text-foreground uppercase leading-none tracking-tighter">
                   {(viewOrder.orderType === 'instalacao' || viewOrder.orderType === 'manutencao' || viewOrder.orderType === 'retirada')
                     ? (viewOrder.installationDate 
                          ? fmtDate(viewOrder.installationDate)
                         : 'DIRETO'
                       )
                     : 'PROD. PADRÃO'
                    }
                  </p>
                  {(viewOrder.orderType === 'instalacao' || viewOrder.orderType === 'manutencao' || viewOrder.orderType === 'retirada') && viewOrder.installationDate && viewOrder.installationTime && (
                     <div className='flex items-center gap-1.5 px-2 py-1 rounded-xl bg-primary/10 text-primary w-fit border border-primary/20 mt-1.5 animate-in fade-in zoom-in-95 duration-500'>
                        <Clock className='w-3 h-3 shrink-0' />
                        <span className='text-[10px] font-black uppercase tracking-widest whitespace-nowrap'>Agendado: {viewOrder.installationTime}</span>
                     </div>
                  )}
                 <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Tipo de Produção</p>
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

        {/* COMPONENTES DE MONTAGEM */}
        <div className="glass-card overflow-hidden rounded-[2rem] border-2 border-border/40 shadow-xl">
           <div className="bg-foreground py-3 px-6 flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-background">Componentes de Montagem</h4>
              <div className="px-2 py-0.5 rounded-full bg-background/10 text-background text-[9px] font-black">{viewOrder.items.length} ITENS</div>
           </div>
           <div className="p-2 space-y-1">
              {viewOrder.items.map((item) => (
                <div key={item.id} className={`p-4 rounded-2xl flex items-center gap-6 transition-all border-b border-border/10 last:border-none ${item.sensorType === 'com_sensor' ? 'bg-emerald-500/[0.03]' : ''}`}>
                   <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl font-black text-primary shrink-0 border border-border/10">
                      {item.quantity}<span className="text-[9px] ml-0.5 mt-2 opacity-50">x</span>
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-0.5">
                         <h5 className="text-lg font-black text-foreground tracking-tight uppercase">{item.product}</h5>
                         {item.product.toUpperCase().includes('KIT') && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 ${(!item.sensorType || item.sensorType === 'com_sensor') ? 'bg-emerald-500 text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                               {(!item.sensorType || item.sensorType === 'com_sensor') ? <><Zap className="w-3 h-3 fill-current" /> COM SENSOR</> : '⚪ SEM SENSOR'}
                            </span>
                         )}
                      </div>
                      <p className="text-sm font-bold text-muted-foreground italic leading-tight">{item.description || 'Nenhuma instrução adicional.'}</p>
                   </div>
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
                 {viewOrder.status === 'aguardando_producao' && (
                    <button onClick={() => { iniciarProducao(viewOrder.id); setViewOrderId(null); }} className="btn-primary from-producao to-producao/80 px-6 py-3 text-xs font-black uppercase rounded-xl transition-all text-white">
                       <Play className="w-4 h-4 mr-2" /> Iniciar
                    </button>
                 )}
                 {viewOrder.status === 'em_producao' && (
                    <button onClick={() => { finalizarProducao(viewOrder.id); setViewOrderId(null); }} className="btn-primary from-emerald-500 to-emerald-600 px-6 py-3 text-xs font-black uppercase rounded-xl transition-all text-white">
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
    <div className="space-y-6">
      <RealtimeNotificationHandler />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mainGradient} flex items-center justify-center text-white shadow-lg ${mainShadow} shrink-0`}>
                <MainIcon className="w-5 h-5" />
             </div>
             <span className="gradient-text">{PAGE_TITLES[tipoFiltro] ?? 'Pedidos de Produção'}</span>
          </h1>
          <p className="text-[10px] text-muted-foreground ml-[3.25rem] font-bold uppercase tracking-wider">
            {tipoFiltro === 'entrega' ? 'Aguardando despacho' :
              tipoFiltro === 'instalacao' ? 'Equipe de campo' :
                tipoFiltro === 'atrasado' ? 'Pendências críticas' :
                  'Gestão da fábrica industrial'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {tipoFiltro === 'instalacao' && (
            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/10 shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground ml-1" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`btn-modern gap-2 text-xs font-bold shrink-0 ${showCalendar ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border-primary/20'}`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden xs:inline">{showCalendar ? 'Ocultar Calendário' : 'Ver Calendário'}</span>
            <span className="xs:hidden">{showCalendar ? 'Ocultar' : 'Calendário'}</span>
          </button>
          <button onClick={() => setShowScanner(true)} className={`btn-modern bg-gradient-to-r ${mainGradient} text-primary-foreground shrink-0`}>
            <ScanLine className="w-4 h-4" /> <span className="hidden xs:inline">Ler Código</span>
          </button>
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

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Filtre por Pedido, Cliente ou Vendedor..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-3" />
        </div>
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex flex-1 items-center gap-2 bg-muted/20 p-2 rounded-2xl border border-border/10">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
               <Filter className="w-4 h-4" />
            </div>
            <div className="relative flex-1 min-w-[100px]">
              <select 
                value={orderTypeFilter} 
                onChange={e => setOrderTypeFilter(e.target.value)}
                className="w-full bg-transparent border-none text-[9px] font-black focus:outline-none uppercase tracking-widest appearance-none cursor-pointer pr-6"
              >
                <option value="todos" className="bg-card text-foreground">TODOS OS TIPOS</option>
                <option value="entrega" className="bg-card text-foreground">📦 ENTREGA</option>
                <option value="instalacao" className="bg-card text-foreground">🔧 INSTALAÇÃO</option>
                <option value="retirada" className="bg-card text-foreground">🏢 RETIRADA</option>
                <option value="manutencao" className="bg-card text-foreground">🛠️ MANUTENÇÃO</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
  
          <div className="flex flex-1 items-center gap-2 bg-muted/20 p-2 rounded-2xl border border-border/10">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="relative flex-1 min-w-[100px]">
              <select 
                value={carrierFilter} 
                onChange={e => setCarrierFilter(e.target.value)}
                className="w-full bg-transparent border-none text-[9px] font-black focus:outline-none uppercase tracking-widest appearance-none cursor-pointer pr-6"
              >
                <option value="todos" className="bg-card text-foreground">TODOS OS MEIOS</option>
                <option value="jadlog" className="bg-card text-foreground">JADLOG</option>
                <option value="motoboy" className="bg-card text-foreground">MOTOBOY</option>
                <option value="kleyton" className="bg-card text-foreground">KLEYTON</option>
                <option value="lalamove" className="bg-card text-foreground">LALAMOVE</option>
                <option value="retirada" className="bg-card text-foreground">RETIRADA LOCAL</option>
                <option value="sem_definir" className="bg-card text-foreground">SEM DEFINIR</option>
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
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
          <div className="space-y-4 stagger-children">
            {filteredOrders.map(order => {
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
                <div key={order.id} className={`glass-card p-0 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 rounded-2xl relative overflow-hidden group border-l-4 ${
                  order.status === 'aguardando_producao' ? 'border-l-warning' :
                  order.status === 'em_producao' ? 'border-l-primary' :
                  order.status === 'producao_finalizada' ? 'border-l-success' :
                  'border-l-muted'
                } ${late ? 'border-l-destructive shadow-lg shadow-destructive/5' : ''}`}>
                  
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10">
                    <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                      {/* Avatar/Icon Group */}
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-3 transition-transform duration-500 ${late ? 'bg-destructive/10' : 'bg-muted/30'}`}>
                        {order.isWarranty || order.notes?.includes('GARANTIA') ? (
                          <HistoryIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${late ? 'text-destructive' : 'text-primary'}`} />
                        ) : (
                          <Package className={`w-6 h-6 sm:w-7 sm:h-7 ${late ? 'text-destructive' : 'text-muted-foreground'}`} />
                        )}
                      </div>

                      {/* Info Group */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1.5">
                          <h3 className="font-black text-foreground text-lg sm:text-xl tracking-tighter uppercase flex items-center gap-2">
                            {order.number}
                            {(order.isWarranty || order.notes?.toLowerCase().includes('garantia')) && (
                              <span className="px-2 py-0.5 rounded-lg bg-destructive text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-destructive/20 animate-pulse">
                                GARANTIA
                              </span>
                            )}
                          </h3>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                             <StatusBadge status={order.status} />
                             
                             {order.carrier && (
                               <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${carrierInfo.color}`}>
                                 <carrierInfo.icon className="w-2.5 h-2.5" />
                                 {carrierInfo.label}
                               </span>
                             )}

                             {/* Badge de Tipo de Pedido */}
                             <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                               order.orderType === 'instalacao' ? 'bg-amber-500 text-white' :
                               order.orderType === 'manutencao' ? 'bg-indigo-500 text-white' :
                               order.orderType === 'retirada' ? 'bg-slate-700 text-white' :
                               'bg-muted text-muted-foreground'
                             }`}>
                               {order.orderType === 'instalacao' ? '🔧 Inst.' :
                                order.orderType === 'manutencao' ? '🛠️ Manut.' :
                                order.orderType === 'retirada' ? '🏢 Retirada' :
                                '📦 Entrega'}
                             </span>

                             {(order.orderType === 'instalacao' || order.orderType === 'manutencao' || order.orderType === 'retirada') && order.installationPaymentType && (
                               <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
                                 order.installationPaymentType === 'pago' ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'
                               }`}>
                                 {order.installationPaymentType === 'pago' ? '✅ PAGO' : '💰 NA HORA'}
                               </span>
                             )}

                             {late && (
                               <span className="px-2 py-0.5 rounded-full bg-destructive text-white text-[8px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-destructive/20">
                                 ATRASADO
                               </span>
                             )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[10px] sm:text-xs mb-3">
                           <span className="font-extrabold text-foreground/90 flex items-center gap-1.5 truncate">
                             <User className="w-3.5 h-3.5 text-primary shrink-0" />
                             {order.clientName}
                           </span>
                           <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
                             Vend: {order.sellerName}
                           </span>
                           {(order.orderType === 'instalacao' || order.orderType === 'manutencao' || order.orderType === 'retirada') && (order.installationDate || order.scheduledDate) && (
                              <span className="text-primary font-black flex items-center gap-1.5 sm:ml-auto bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                <Clock className="w-3.5 h-3.5" />
                                {fmtDate(order.installationDate || order.scheduledDate)} {order.installationTime ? `@ ${order.installationTime}` : ''}
                              </span>
                           )}
                        </div>

                        {/* Itens Group */}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {order.items.map((i, idx) => (
                            <div key={idx} className="group/item relative max-w-full">
                              <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border flex items-center gap-2 transition-all
                                ${i.sensorType === 'com_sensor' 
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 shadow-sm' 
                                  : 'bg-muted/40 border-border/20 text-foreground/80'}
                              `}>
                                <span className="font-black text-[10px] sm:text-xs">{i.quantity}x</span>
                                <span className="font-extrabold text-[9px] sm:text-[11px] uppercase tracking-tight truncate max-w-[150px]">{i.product}</span>
                                
                                {i.sensorType === 'com_sensor' && (
                                  <div className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/10 shrink-0">
                                    <Zap className="w-2 h-2 fill-current" />
                                    <span className="text-[6px] sm:text-[7px] font-black">SENSOR</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex flex-row sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setViewOrderId(order.id)} 
                        className="btn-modern flex-1 md:flex-none justify-center bg-muted/60 text-foreground text-[10px] font-black px-4 sm:px-5 py-3 hover:bg-muted border border-border/10 rounded-xl"
                      >
                        DETALHES
                      </button>

                      {order.status === 'aguardando_producao' && (
                        <button 
                          onClick={() => setViewOrderId(order.id)} 
                          className={`btn-primary flex-1 md:flex-none justify-center bg-gradient-to-br ${mainGradient} px-6 sm:px-8 py-3 text-[10px] sm:text-xs font-black uppercase rounded-xl shadow-xl ${mainShadow} hover:scale-105 active:scale-95 transition-all text-white border-none`}
                        >
                          INICIAR
                        </button>
                      )}

                      {order.status === 'em_producao' && (
                        <button 
                          onClick={() => setViewOrderId(order.id)} 
                          className="btn-primary flex-1 md:flex-none justify-center from-emerald-500 to-emerald-600 px-6 sm:px-8 py-3 text-[10px] sm:text-xs font-black uppercase rounded-xl shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-white"
                        >
                          FINALIZAR
                        </button>
                      )}

                      {(order.status === 'producao_finalizada' || order.status === 'produto_liberado') && (
                        <div className="flex gap-2 flex-1 md:flex-none">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setGuia(order.id); }} 
                            className="btn-modern flex-1 md:flex-none justify-center bg-primary/10 text-primary px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-black hover:bg-primary/20 border border-primary/20 rounded-xl shadow-lg shadow-primary/5"
                          >
                            GUIA
                          </button>
                          {order.orderType === 'entrega' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); printEtiqueta(order); }} 
                              className="btn-modern justify-center bg-emerald-500/10 text-emerald-600 px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-black hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}

                      {order.status === 'retirado_entregador' && order.orderType === 'entrega' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); printEtiqueta(order); }} 
                          className="btn-modern flex-1 md:flex-none justify-center bg-emerald-500/10 text-emerald-600 px-5 sm:px-6 py-3 text-[10px] sm:text-xs font-black hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex items-center gap-2"
                        >
                          <Printer className="w-4 h-4" /> <span className="hidden sm:inline">REIMPRIMIR</span><span className="sm:hidden">ETIQUETA</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

export default PedidosProducaoPage;
