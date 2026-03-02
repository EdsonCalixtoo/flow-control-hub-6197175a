import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, formatDate as fmtDate } from '@/components/shared/StatusBadge';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import OrderChat from '@/components/shared/OrderChat';
import { Play, CheckCircle, Printer, Package, ArrowLeft, Search, ScanLine, X, Eye, Truck, Wrench, Calendar, Clock, AlertTriangle, CalendarClock, Send, Camera, StopCircle, History } from 'lucide-react';
import BarcodeComponent from 'react-barcode';
import { useSearchParams } from 'react-router-dom';
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
  const { orders, clients, updateOrderStatus, updateOrder, addDelayReport, addBarcodeScan, barcodeScans } = useERP();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tipoFiltro = searchParams.get('tipo') || '';
  const viewParam = searchParams.get('view');

  const [guia, setGuia] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; orderNumber?: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewOrderId, setViewOrderId] = useState<string | null>(viewParam);
  const [delayReason, setDelayReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [manualLate, setManualLate] = useState<Set<string>>(new Set());
  const barcodeRef = useRef<HTMLDivElement>(null);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [barcodeDetectorAvailable, setBarcodeDetectorAvailable] = useState(false);
  const [barcodeScanMode, setBarcodeScanMode] = useState<'camera' | 'usb'>('usb');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper: atrasado = data passada OU marcado manualmente OU productionStatus === 'atrasado'
  const isLate = (order: typeof orders[0]) =>
    order.productionStatus === 'atrasado' ||
    manualLate.has(order.id) ||
    (order.deliveryDate
      ? new Date(order.deliveryDate) < new Date() &&
      !['producao_finalizada', 'produto_liberado'].includes(order.status)
      : false);

  const isScheduled = (order: typeof orders[0]) =>
    order.productionStatus === 'agendado' || !!order.scheduledDate;

  const PAGE_TITLES: Record<string, string> = {
    entrega: 'Pedidos — Entrega',
    instalacao: 'Pedidos — Instalação',
    agendado: 'Pedidos — Agendados',
    atrasado: 'Pedidos — Atrasados',
    '': 'Todos os Pedidos',
  };

  const formatDate = (d?: string) => fmtDate(d);

  const printEtiqueta = (order: typeof orders[0]) => {
    const client = clients.find(c => c.id === order.clientId);
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
.header-title { font-size: 7.5pt; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #000; margin-bottom: 0.2mm; }
.header-pedido { font-size: 16pt; font-weight: 900; font-family: 'Courier New', monospace; color: #000; letter-spacing: 2px; line-height: 1; }
.section { margin-bottom: 2mm; }
.section-label { font-size: 6.5pt; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #000; margin-bottom: 1mm; }
.remetente { padding: 2mm 2.5mm; border: 1mm solid #000; border-radius: 0.5mm; background: #fff; }
.remetente .name { font-size: 8.5pt; font-weight: 900; color: #000; margin-bottom: 0.3mm; letter-spacing: 0.3px; }
.remetente .address { font-size: 7pt; color: #000; line-height: 1.4; font-weight: 700; }
.destinatario { flex: 1; padding: 3mm; border: 1.5mm solid #000; border-radius: 1mm; background: #fff; display: flex; flex-direction: column; }
.destinatario .name { font-size: 13pt; font-weight: 900; color: #000; margin-bottom: 1.5mm; letter-spacing: 0.5px; }
.destinatario .address { font-size: 8pt; color: #000; line-height: 1.5; font-weight: 700; }
.destinatario .cpf { font-size: 7.5pt; color: #000; margin-top: 1mm; font-weight: 700; font-family: 'Courier New', monospace; }
.destinatario .phone { font-size: 7.5pt; color: #000; margin-top: 0.5mm; font-weight: 700; }
.barcode-section { text-align: center; padding-top: 2mm; border-top: 1mm dashed #000; margin-top: 1mm; }
.barcode-section .barcode-label { font-size: 7pt; font-weight: 900; color: #000; margin-bottom: 1mm; letter-spacing: 1px; font-family: 'Courier New', monospace; }
.barcode-section img { max-width: 75mm; height: auto; }
.footer { text-align: center; font-size: 5.5pt; color: #000; margin-top: 0.5mm; font-weight: 700; }
</style></head><body>
<div class="etiqueta">
  <div class="header">
    ${logoDataUrl ? `<img src="${logoDataUrl}" class="header-logo" alt="Logo" />` : ''}
    <div class="header-info">
      <div class="header-title">Etiqueta de Envio</div>
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
      <div class="address">${client?.address || 'Endereço não cadastrado'}<br>${client ? `${client.city} - ${client.state} CEP: ${client.cep}` : ''}</div>
      ${client?.cpfCnpj ? `<div class="cpf">CPF: ${client.cpfCnpj}</div>` : ''}
      ${client?.phone ? `<div class="phone">Tel: ${client.phone}</div>` : ''}
    </div>
  </div>
  <div class="barcode-section">
    <div class="barcode-label">PEDIDO: ${order.number}</div>
    <img src="${barcodeDataUrl}" alt="Código de barras" />
  </div>
  <div class="footer">Emitido: ${new Date().toLocaleDateString('pt-BR')}</div>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(window.close, 500); }, 300); };</script>
</body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    });
  };

  const allOrders = orders.filter(o =>
    ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status)
  );

  const tipoFiltered = allOrders.filter(o => {
    if (tipoFiltro === 'entrega') return o.orderType === 'entrega';
    if (tipoFiltro === 'instalacao') return o.orderType === 'instalacao';
    if (tipoFiltro === 'agendado') return isScheduled(o);
    if (tipoFiltro === 'atrasado') return isLate(o);
    return true;
  });

  const filteredOrders = tipoFiltered.filter(o => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'atrasado') return matchSearch && isLate(o);
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    return matchSearch && matchStatus;
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

    updateOrderStatus(orderId, 'producao_finalizada', {
      productionFinishedAt: now,
      qrCode,
      productionStatus: 'finalizado',
    }, finishedBy, 'Producao finalizada');

    // ✅ Registra barcode scan automático para o pedido aparecer nos ENTREGADORES
    // (equivale à leitura do código de barras na saída da produção)
    addBarcodeScan({
      orderId: order.id,
      orderNumber: order.number,
      scannedBy: finishedBy,
      success: true,
      note: 'Produto liberado automaticamente ao finalizar produção',
    });

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


  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const processCode = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    const order = orders.find(o => o.number === code);
    const scannedBy = user?.name || 'Equipe Produção';
    const now = new Date().toISOString();

    if (order) {
      if (order.status === 'producao_finalizada') {
        updateOrderStatus(order.id, 'produto_liberado', {
          releasedAt: now,
          releasedBy: scannedBy,
        }, scannedBy, 'Produto liberado via leitura de código de barras');
        addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: true,
          note: 'Produto liberado via scanner',
        });
        setScanResult({ success: true, message: `✅ Pedido ${order.number} liberado com sucesso!`, orderNumber: order.number });
      } else if (order.status === 'produto_liberado' || order.status === 'retirado_entregador') {
        addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: true,
          note: 'Releitura — produto já estava liberado',
        });
        setScanResult({ success: true, message: `ℹ️ Pedido ${order.number} já foi liberado anteriormente.`, orderNumber: order.number });
      } else if (!['aprovado_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada'].includes(order.status)) {
        addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Pedido não aprovado pelo financeiro. Status: ${order.status}`,
        });
        setScanResult({ success: false, message: `❌ Pedido ${order.number} NÃO foi aprovado pelo financeiro.` });
      } else {
        addBarcodeScan({
          orderId: order.id,
          orderNumber: order.number,
          scannedBy,
          success: false,
          note: `Produção não finalizada. Status atual: ${order.status}`,
        });
        setScanResult({ success: false, message: `⚠️ Pedido ${order.number} ainda não finalizou a produção. Status: ${order.status}` });
      }
    } else {
      setScanResult({ success: false, message: '❌ Código não encontrado. Verifique e tente novamente.' });
    }
    setScanInput('');
  }, [orders, addBarcodeScan, updateOrderStatus, user]);

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
          height: { ideal: 720 },
          focusMode: { ideal: 'continuous' }
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
                placeholder="PED-001234 ou código de barras"
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
                <History className="w-4 h-4 text-muted-foreground" />
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
            <button onClick={() => printEtiqueta(guiaOrder)} className="btn-primary">
              <Printer className="w-4 h-4" /> Imprimir Etiqueta
            </button>
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
                    <td className="text-foreground font-medium">{item.product}</td>
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

  // Detalhe do pedido
  const viewOrder = viewOrderId ? orders.find(o => o.id === viewOrderId) : null;
  const viewClient = viewOrder ? clients.find(c => c.id === viewOrder.clientId) : null;

  if (viewOrder) {
    return (
      <div className="space-y-6 animate-scale-in">
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

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{viewOrder.number}</h1>
            <p className="page-subtitle">{viewOrder.clientName} • Vendedor: {viewOrder.sellerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={viewOrder.status} />
            <button onClick={() => setViewOrderId(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>

        {/* Status de produção + badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card-section p-4">
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Tipo</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              {viewOrder.orderType === 'instalacao' ? <><Wrench className="w-4 h-4 text-producao" /> Instalação</> : <><Truck className="w-4 h-4 text-primary" /> Entrega</>}
            </span>
          </div>
          <div className={`card-section p-4 ${isLate(viewOrder) ? 'border-destructive/30 bg-destructive/5' : ''}`}>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Data de Entrega</span>
            <span className={`flex items-center gap-1.5 text-sm font-bold ${isLate(viewOrder) ? 'text-destructive' : 'text-foreground'}`}>
              <Calendar className="w-4 h-4" />
              {formatDate(viewOrder.deliveryDate)}
              {isLate(viewOrder) && <span className="px-1.5 py-0.5 rounded-full bg-destructive/15 text-[9px]">ATRASADO</span>}
            </span>
          </div>
          <div className={`card-section p-4 ${isScheduled(viewOrder) ? 'border-primary/30 bg-primary/5' : ''}`}>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Agendado para</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <CalendarClock className="w-4 h-4 text-primary" />
              {viewOrder.scheduledDate ? new Date(viewOrder.scheduledDate).toLocaleDateString('pt-BR') : '—'}
            </span>
          </div>
          <div className="card-section p-4">
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Status de Produção</span>
            <div className="flex gap-1 flex-wrap">
              {PRODUCTION_STATUS_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateOrder(viewOrder.id, { productionStatus: opt.value })}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${viewOrder.productionStatus === opt.value ? opt.cls : 'bg-muted/40 text-muted-foreground border-border/30 hover:opacity-80'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vendedor responsável */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-vendedor/10 flex items-center justify-center">
            <span className="text-[11px] font-extrabold text-vendedor">
              {viewOrder.sellerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Vendedor Responsável</p>
            <p className="text-sm font-bold text-foreground">{viewOrder.sellerName}</p>
          </div>
        </div>

        {/* Dados do cliente */}
        {viewClient && (
          <div className="card-section p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Dados do Cliente</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-[10px] text-muted-foreground block">Nome</span><span className="font-semibold">{viewClient.name}</span></div>
              <div><span className="text-[10px] text-muted-foreground block">CPF/CNPJ</span><span className="font-mono text-xs">{viewClient.cpfCnpj}</span></div>
              <div><span className="text-[10px] text-muted-foreground block">Telefone</span><span>{viewClient.phone || '—'}</span></div>
              <div><span className="text-[10px] text-muted-foreground block">Cidade/UF</span><span>{viewClient.city}/{viewClient.state}</span></div>
            </div>
          </div>
        )}

        {/* Produtos — sem valor financeiro */}
        <div className="card-section overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produtos do Pedido</p>
          </div>
          <table className="modern-table">
            <thead><tr>
              <th>Produto</th>
              <th>Descrição</th>
              <th className="text-center">Qtd</th>
            </tr></thead>
            <tbody>
              {viewOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="font-semibold text-foreground">{item.product}</td>
                  <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-producao/10 text-producao font-extrabold text-sm">{item.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Observação */}
        {viewOrder.observation && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação do Vendedor</p>
            <p className="text-sm text-foreground">{viewOrder.observation}</p>
          </div>
        )}

        {/* Comprovante */}
        {viewOrder.receiptUrl && (
          <div className="card-section p-5">
            <ComprovanteUpload value={viewOrder.receiptUrl} onChange={() => { }} label="Comprovante de Pagamento" readOnly />
          </div>
        )}

        {/* Chat interno */}
        <OrderChat
          orderId={viewOrder.id}
          orderNumber={viewOrder.number}
          allowedRoles={['vendedor', 'producao']}
        />

        {/* Envio de ocorrência */}
        {['aguardando_producao', 'em_producao'].includes(viewOrder.status) && (
          <div className={`p-4 rounded-xl border space-y-3 ${isLate(viewOrder) ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30 border-border/30'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${isLate(viewOrder) ? 'text-destructive' : 'text-muted-foreground'}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${isLate(viewOrder) ? 'text-destructive' : 'text-muted-foreground'}`}>
                {isLate(viewOrder) ? 'Pedido com Atraso — Informe o Motivo' : 'Enviar Ocorrência ao Gestor (opcional)'}
              </p>
            </div>
            <textarea
              value={delayReason}
              onChange={e => setDelayReason(e.target.value)}
              placeholder={isLate(viewOrder) ? "Descreva o motivo do atraso..." : "Descreva qualquer ocorrência para o Gestor..."}
              className="input-modern w-full min-h-[80px] resize-y text-sm"
              rows={3}
            />
            {reportSent && (
              <div className="flex items-center gap-2 text-success text-sm font-semibold animate-fade-in">
                <CheckCircle className="w-4 h-4" /> Relatório enviado ao Gestor!
              </div>
            )}
            <button
              disabled={!delayReason.trim() || reportSent}
              onClick={() => {
                if (!delayReason.trim()) return;
                addDelayReport({
                  orderId: viewOrder.id,
                  orderNumber: viewOrder.number,
                  clientName: viewOrder.clientName,
                  orderType: (viewOrder.orderType as 'entrega' | 'instalacao') ?? 'entrega',
                  deliveryDate: viewOrder.deliveryDate,
                  orderTotal: viewOrder.total,
                  reason: delayReason.trim(),
                  sentBy: user?.name || 'Equipe de Producao',
                });
                setReportSent(true);
                setTimeout(() => { setReportSent(false); setDelayReason(''); }, 3000);
              }}
              className={`btn-modern w-full justify-center py-3 text-sm font-bold transition-all ${reportSent
                ? 'bg-success/20 text-success border border-success/30 cursor-default'
                : delayReason.trim()
                  ? 'bg-gradient-to-r from-destructive to-destructive/80 text-white hover:shadow-lg'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                }`}
            >
              {reportSent ? <><CheckCircle className="w-4 h-4" /> Enviado ao Gestor</> : <><Send className="w-4 h-4" /> Enviar para Gestor</>}
            </button>
          </div>
        )}

        {/* Ações de produção */}
        <div className="flex gap-3 flex-wrap pt-2">
          {viewOrder.status === 'aguardando_producao' && (
            <button
              onClick={() => { iniciarProducao(viewOrder.id); setViewOrderId(null); }}
              className="btn-modern flex-1 bg-gradient-to-r from-producao to-producao/80 text-primary-foreground justify-center py-3 text-sm"
            >
              <Play className="w-5 h-5" /> Confirmar Início da Produção
            </button>
          )}
          {viewOrder.status === 'em_producao' && (
            <button
              onClick={() => { finalizarProducao(viewOrder.id); setViewOrderId(null); }}
              className="btn-modern flex-1 bg-gradient-to-r from-success to-success/80 text-success-foreground justify-center py-3 text-sm"
            >
              <CheckCircle className="w-5 h-5" /> Confirmar Finalização da Produção
            </button>
          )}
          {['aguardando_producao', 'em_producao'].includes(viewOrder.status) && (
            <button
              onClick={() => { setScheduleDate(viewOrder.scheduledDate || ''); setShowScheduleModal(true); }}
              className="btn-modern bg-primary/10 text-primary shadow-none justify-center py-2.5 text-xs hover:bg-primary/20 border border-primary/30 px-4"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {isScheduled(viewOrder) ? `Agendado: ${new Date(viewOrder.scheduledDate!).toLocaleDateString('pt-BR')} — Editar` : 'Agendar Pedido'}
            </button>
          )}
          {(viewOrder.status === 'producao_finalizada' || viewOrder.status === 'produto_liberado') && (
            <button
              onClick={() => { setGuia(viewOrder.id); setViewOrderId(null); }}
              className="btn-modern flex-1 bg-primary/10 text-primary shadow-none justify-center py-3 text-sm hover:bg-primary/20"
            >
              <Printer className="w-5 h-5" /> Imprimir Etiqueta de Envio
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">{PAGE_TITLES[tipoFiltro] ?? 'Pedidos de Producao'}</h1>
          <p className="page-subtitle">
            {tipoFiltro === 'entrega' ? 'Pedidos de entrega em producao' :
              tipoFiltro === 'instalacao' ? 'Pedidos de instalacao em producao' :
                tipoFiltro === 'agendado' ? 'Pedidos agendados pela equipe' :
                  tipoFiltro === 'atrasado' ? 'Pedidos com atraso na entrega' :
                    'Gerencie a producao dos pedidos aprovados'}
          </p>
        </div>
        <button onClick={() => setShowScanner(true)} className="btn-modern bg-gradient-to-r from-producao to-producao/80 text-primary-foreground">
          <ScanLine className="w-4 h-4" /> Ler Codigo
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input type="text" placeholder="Buscar pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-10 py-2.5" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'aguardando_producao', label: 'Aguardando' },
            { value: 'em_producao', label: 'Em Produção' },
            { value: 'producao_finalizada', label: 'Finalizado' },
            { value: 'produto_liberado', label: 'Liberado' },
            { value: 'atrasado', label: '⚠ Atrasados' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card-section p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-bold text-lg">Nenhum pedido encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Aguardando pedidos aprovados</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredOrders.map(order => {
            const late = isLate(order);
            const scheduled = isScheduled(order);
            return (
              <div key={order.id} className={`card-section p-5 hover:shadow-lg transition-all duration-300 ${late ? 'border-destructive/20' : 'hover:shadow-primary/[0.04]'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${late ? 'bg-destructive/10' : 'bg-gradient-to-br from-producao/20 to-producao/5'}`}>
                      <Package className={`w-5 h-5 ${late ? 'text-destructive' : 'text-producao'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm">{order.number}</p>
                        <StatusBadge status={order.status} />
                        {order.orderType === 'instalacao'
                          ? <span className="status-badge bg-producao/10 text-producao text-[9px]"><Wrench className="w-2.5 h-2.5" /> Instalação</span>
                          : <span className="status-badge bg-primary/10 text-primary text-[9px]"><Truck className="w-2.5 h-2.5" /> Entrega</span>
                        }
                        {late && <span className="status-badge bg-destructive/10 text-destructive text-[9px]"><AlertTriangle className="w-2.5 h-2.5" /> ATRASADO</span>}
                        {scheduled && !late && <span className="status-badge bg-primary/10 text-primary text-[9px]"><CalendarClock className="w-2.5 h-2.5" /> AGENDADO</span>}
                      </div>
                      {/* Nome do vendedor */}
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">{order.clientName}</span>
                        <span className="mx-1">•</span>
                        <span>Vendedor: <span className="font-semibold">{order.sellerName}</span></span>
                      </p>
                      {/* Produtos com descrição */}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {order.items.map(i => `${i.product} x${i.quantity}${i.description ? ` (${i.description})` : ''}`).join(' | ')}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Criado: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                        {order.deliveryDate && (
                          <span className={late ? 'text-destructive font-semibold' : ''}>
                            <Calendar className="w-2.5 h-2.5 inline" /> Entrega: {new Date(order.deliveryDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {order.scheduledDate && (
                          <span className="text-primary">
                            <CalendarClock className="w-2.5 h-2.5 inline" /> Agendado: {new Date(order.scheduledDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewOrderId(order.id)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-2 hover:bg-muted/80">
                      <Eye className="w-3.5 h-3.5" /> Ver Pedido
                    </button>
                    {order.status === 'aguardando_producao' && (
                      <button onClick={() => setViewOrderId(order.id)} className="btn-modern bg-gradient-to-r from-producao to-producao/80 text-primary-foreground text-xs px-4 py-2">
                        <Play className="w-3.5 h-3.5" /> Iniciar
                      </button>
                    )}
                    {order.status === 'em_producao' && (
                      <button onClick={() => setViewOrderId(order.id)} className="btn-modern bg-gradient-to-r from-success to-success/80 text-success-foreground text-xs px-4 py-2">
                        <CheckCircle className="w-3.5 h-3.5" /> Finalizar
                      </button>
                    )}
                    {(order.status === 'producao_finalizada' || order.status === 'produto_liberado') && (
                      <button onClick={() => setGuia(order.id)} className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-4 py-2 hover:bg-primary/20">
                        <Printer className="w-3.5 h-3.5" /> Ver Guia
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
