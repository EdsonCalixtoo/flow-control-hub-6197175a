import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
    Truck, Package, CheckCircle, X, Camera, PenLine, RefreshCw,
    ClipboardList, ChevronDown, ChevronUp, User, Calendar, Hash,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface OrderGroup {
    orderId: string;
    orderNumber: string;
    clientName: string;
    sellerName: string;
    scans: Array<{ id: string; scannedBy: string; scannedAt: string }>;
    totalQty: number;
    alreadyPickedUp: boolean;
    pickupInfo?: {
        delivererName: string;
        pickedUpAt: string;
        photoUrl: string;
        signatureUrl: string;
    };
}

/* ─────────────────────────────────────────────
   Signature Canvas Component
───────────────────────────────────────────── */
const SignatureCanvas: React.FC<{
    onCapture: (dataUrl: string) => void;
    captured: string | null;
    onClear: () => void;
}> = ({ onCapture, captured, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawing, setDrawing] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (captured) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        setDrawing(true);
        lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing || captured) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !lastPos.current) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
    };

    const stopDraw = () => {
        if (!drawing) return;
        setDrawing(false);
        lastPos.current = null;
    };

    const handleCapture = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        onCapture(dataUrl);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onClear();
    };

    if (captured) {
        return (
            <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border-2 border-success/40 bg-white">
                    <img src={captured} alt="Assinatura" className="w-full h-32 object-contain" />
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                </div>
                <button onClick={handleClear} className="btn-modern bg-muted text-foreground shadow-none text-xs w-full justify-center">
                    <RefreshCw className="w-3.5 h-3.5" /> Limpar e Refazer
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="rounded-xl overflow-hidden border-2 border-dashed border-border/60 bg-white/50 touch-none">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    className="w-full h-32 cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Assine dentro do campo acima usando o dedo ou mouse</p>
            <div className="flex gap-2">
                <button onClick={handleCapture} className="btn-primary flex-1 justify-center text-xs">
                    <CheckCircle className="w-3.5 h-3.5" /> Confirmar Assinatura
                </button>
                <button onClick={handleClear} className="btn-modern bg-muted text-foreground shadow-none text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Camera Capture Component
───────────────────────────────────────────── */
const CameraCapture: React.FC<{
    onCapture: (dataUrl: string) => void;
    captured: string | null;
    onClear: () => void;
}> = ({ onCapture, captured, onClear }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [streaming, setStreaming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        setError(null);
        setLoading(true);
        console.log('[CameraCapture] 🎥 Iniciando câmera...');

        // VERIFICAÇÃO: videoRef deve estar disponível ANTES
        if (!videoRef.current) {
            console.error('[CameraCapture] ❌ videoRef.current é null ANTES de getUserMedia!');
            setLoading(false);
            setError('Erro: video element não pronto');
            return;
        }
        console.log('[CameraCapture] ✅ videoRef.current existe');

        try {
            console.log('[CameraCapture] 📋 Solicitando getUserMedia...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });

            const tracks = stream.getTracks();
            console.log('[CameraCapture] ✅ Stream obtido! Tracks:', tracks.length);
            if (tracks.length === 0) {
                throw new Error('Stream obtido mas sem video tracks');
            }

            console.log('[CameraCapture] 🎬 Primeiro: setar streaming = true...');
            setStreaming(true);

            // IMPORTANTE: Aguardar render do video no DOM
            await new Promise(r => setTimeout(r, 100));

            console.log('[CameraCapture] 📹 Agora atribuindo stream ao video...');

            // VERIFICAÇÃO final
            if (!videoRef.current) {
                console.error('[CameraCapture] ❌ videoRef desapareceu após setStreaming!');
                stream.getTracks().forEach(t => t.stop());
                setError('Erro: video element desapareceu');
                setStreaming(false);
                setLoading(false);
                return;
            }

            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            console.log('[CameraCapture] ✅ srcObject atribuído');

            // Tentar play manualmente em casos especiais
            try {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    await playPromise;
                    console.log('[CameraCapture] ✅ play() sucesso');
                }
            } catch (playErr: any) {
                console.warn('[CameraCapture] ⚠️ play() falhou mas continuando:', playErr?.message);
            }

            setLoading(false);
            console.log('[CameraCapture] ✅ Câmera ativa com sucesso!');

        } catch (err: any) {
            console.error('[CameraCapture] ❌ Erro completo:', JSON.stringify(err));
            console.error('[CameraCapture] Name:', err?.name);
            console.error('[CameraCapture] Message:', err?.message);
            console.error('[CameraCapture] Code:', err?.code);

            setLoading(false);
            setStreaming(false);

            const code = err?.name || err?.code || (err?.message?.includes('permission') ? 'NotAllowedError' : 'UNKNOWN');
            let message = 'Não foi possível acessar a câmera.';

            if (code === 'NotAllowedError' || err?.message?.includes('permission')) {
                message = '❌ Permissão negada! Acesse Configurações → Câmera → Permitir acesso.';
            } else if (code === 'NotFoundError' || err?.message?.includes('no device')) {
                message = '❌ Câmera não encontrada no dispositivo.';
            } else if (code === 'NotReadableError') {
                message = '❌ Câmera em uso por outro app. Feche e tente novamente.';
            } else {
                message = `❌ Erro: ${code}. Tente novamente.`;
            }

            setError(message);
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setStreaming(false);
    }, []);

    useEffect(() => {
        return () => { stopCamera(); };
    }, [stopCamera]);

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        console.log('[CameraCapture] 📸 Tentando capturar foto...');
        console.log('[CameraCapture] Video ref:', !!video);
        console.log('[CameraCapture] Canvas ref:', !!canvas);
        console.log('[CameraCapture] Video ready state:', video?.readyState);
        console.log('[CameraCapture] Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);

        if (!video || !canvas) {
            console.error('[CameraCapture] ❌ Refs não disponíveis');
            setError('Erro interno: refs não disponíveis');
            return;
        }

        try {
            // Usar dimensões do video, ou fallback para 640x480
            const w = video.videoWidth || 640;
            const h = video.videoHeight || 480;

            console.log('[CameraCapture] Usando dimensões:', w, 'x', h);

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Não conseguiu contexto 2D');
            }

            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            console.log('[CameraCapture] ✅ Foto capturada! Size:', dataUrl.length, 'bytes');
            stopCamera();
            onCapture(dataUrl);
        } catch (err: any) {
            console.error('[CameraCapture] ❌ Erro ao capturar:', err?.message);
            setError(`Erro ao capturar: ${err?.message || 'desconhecido'}`);
        }
    };

    if (captured) {
        return (
            <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-success/40">
                    <img src={captured} alt="Foto do entregador" className="w-full h-96 object-cover" />
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                </div>
                <button onClick={() => { onClear(); }} className="btn-modern bg-muted text-foreground shadow-none text-sm w-full justify-center">
                    <RefreshCw className="w-3.5 h-3.5" /> Tirar Outra Foto
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                    {error}
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Container com video - sempre responsivo */}
            {streaming ? (
                <div className="relative w-full bg-black rounded-xl overflow-hidden border-2 border-primary/40 aspect-video flex items-stretch">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        autoPlay
                        muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 border-3 border-yellow-400/70 rounded-full shadow-lg" />
                        <p className="absolute bottom-4 left-0 right-0 text-center text-white text-xs sm:text-sm font-semibold bg-black/50 py-2 px-2">
                            Posicione seu rosto dentro do círculo
                        </p>
                    </div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    className="hidden"
                    playsInline
                    autoPlay
                    muted
                />
            )}

            {/* Botões quando streaming */}
            {streaming && (
                <div className="flex gap-2">
                    <button onClick={takePhoto} className="btn-primary flex-1 justify-center text-sm">
                        <Camera className="w-4 h-4" /> Capturar Foto
                    </button>
                    <button onClick={stopCamera} className="btn-modern bg-muted text-foreground shadow-none text-sm">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Botão abrir câmera quando não streaming */}
            {!streaming && (
                <div className="space-y-2">
                    {loading && (
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                            <p className="text-sm font-semibold text-primary">⏳ Aguarde... solicitando acesso à câmera</p>
                            <p className="text-xs text-muted-foreground mt-1">Caso apareça permissão, clique em Permitir</p>
                        </div>
                    )}
                    <button onClick={startCamera} disabled={loading} className="btn-modern bg-primary/10 text-primary shadow-none w-full justify-center py-4 hover:bg-primary/20 border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="ml-2 font-semibold">Abrindo câmera...</span>
                            </>
                        ) : (
                            <>
                                <Camera className="w-5 h-5" />
                                <span className="ml-2 font-semibold">Abrir Câmera e Tirar Foto</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
const EntregadoresPage: React.FC = () => {
    const { orders, barcodeScans, deliveryPickups, addDeliveryPickup, updateOrderStatus } = useERP();
    const { user } = useAuth();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingBatchMode, setConfirmingBatchMode] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Map<string, boolean>>(new Map());
    const [delivererName, setDelivererName] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'pendente' | 'retirado' | 'todos'>('pendente');
    const [loadingInitial, setLoadingInitial] = useState(true);

    // Sincroniza data ao montar - resolve "entregadores precisa atualizar página para ver pedidos"
    useEffect(() => {
        console.log('[EntregadoresPage] 🔄 Página carregada - iniciando sincronização Realtime');
        console.log('[EntregadoresPage] 📦 Pedidos atuais:', barcodeScans.length);

        // A sincronização automática acontece via Realtime subscription no ERPContext
        // Marcar como carregado após 500ms (tempo para Realtime primário conectar)
        const timer = setTimeout(() => {
            console.log('[EntregadoresPage] ✅ Sincronização inicial completa');
            setLoadingInitial(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [barcodeScans.length]);

    // Group barcode scans by order
    const groups: OrderGroup[] = React.useMemo(() => {
        const map = new Map<string, OrderGroup>();
        for (const scan of barcodeScans) {
            if (!scan.success) continue;
            const order = orders.find(o => o.id === scan.orderId);
            if (!order) continue;

            // Filtro: Apenas pedidos liberados pela produção ou já retirados
            if (order.status !== 'produto_liberado' && order.status !== 'retirado_entregador') {
                continue;
            }
            const pickup = deliveryPickups.find(p => p.orderId === scan.orderId);
            if (!map.has(scan.orderId)) {
                const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
                map.set(scan.orderId, {
                    orderId: scan.orderId,
                    orderNumber: scan.orderNumber,
                    clientName: order.clientName,
                    sellerName: order.sellerName,
                    scans: [],
                    totalQty,
                    alreadyPickedUp: !!pickup,
                    pickupInfo: pickup ? {
                        delivererName: pickup.delivererName,
                        pickedUpAt: pickup.pickedUpAt,
                        photoUrl: pickup.photoUrl,
                        signatureUrl: pickup.signatureUrl,
                    } : undefined,
                });
            }
            map.get(scan.orderId)!.scans.push({
                id: scan.id,
                scannedBy: scan.scannedBy,
                scannedAt: scan.scannedAt,
            });
        }
        return [...map.values()].sort((a, b) => {
            if (a.alreadyPickedUp && !b.alreadyPickedUp) return 1;
            if (!a.alreadyPickedUp && b.alreadyPickedUp) return -1;
            return 0;
        });
    }, [barcodeScans, orders, deliveryPickups]);

    const filtered = groups.filter(g => {
        if (filterStatus === 'pendente') return !g.alreadyPickedUp;
        if (filterStatus === 'retirado') return g.alreadyPickedUp;
        return true;
    });

    const pendingCount = groups.filter(g => !g.alreadyPickedUp).length;
    const doneCount = groups.filter(g => g.alreadyPickedUp).length;

    const canConfirm = delivererName.trim().length > 1 && !!photo && !!signature;

    const handleConfirm = async (group: OrderGroup) => {
        if (!canConfirm || submitting) return;
        setSubmitting(true);
        try {
            console.log(`[EntregadoresPage] 🔄 Confirmando pedido ${group.orderNumber}...`);
            console.log(`[EntregadoresPage] 📸 Com foto (${photo!.length} bytes) e assinatura (${signature!.length} bytes)`);

            const batchId = `RET-${Date.now()}`;

            // Aguarda o pickup ser salvo com foto e assinatura
            await addDeliveryPickup({
                orderId: group.orderId,
                orderNumber: group.orderNumber,
                delivererName: delivererName.trim(),
                photoUrl: photo!,
                signatureUrl: signature!,
                batchId: batchId,
            });

            console.log(`[EntregadoresPage] ✅ Pickup salvo no banco`);

            // Aguarda status ser atualizado
            await updateOrderStatus(
                group.orderId,
                'retirado_entregador',
                {},
                user?.name || 'Gestor',
                `Retirado pelo entregador: ${delivererName.trim()}`
            );

            console.log(`[EntregadoresPage] ✅ ${group.orderNumber} confirmado com sucesso!`);

            setSuccess(group.orderNumber);
            setConfirmingId(null);
            setDelivererName('');
            setPhoto(null);
            setSignature(null);
            setTimeout(() => setSuccess(null), 4000);
        } catch (err: any) {
            console.error('[EntregadoresPage] ❌ Erro ao confirmar pedido:', err?.message ?? err);
            setSuccess(null);
        } finally {
            setSubmitting(false);
        }
    };

    // Novo: Confirma múltiplos grupos em lote
    const handleBatchConfirm = async () => {
        const selectedCount = Array.from(selectedGroupIds.values()).filter(v => v).length;
        if (!canConfirm || submitting || selectedCount === 0) return;
        setSubmitting(true);
        try {
            const selectedGroups = filtered.filter(g => selectedGroupIds.get(g.orderId));
            const orderNumbers: string[] = [];
            const batchId = `RET-${Date.now()}`;

            console.log(`[EntregadoresPage] 🔄 Confirmando lote ${batchId} de ${selectedCount} pedidos...`);

            // Confirma cada pedido e aguarda
            for (const group of selectedGroups) {
                try {
                    console.log(`[EntregadoresPage] 📦 Processando ${group.orderNumber}...`);

                    // Aguarda o pickup ser salvo com foto e assinatura
                    await addDeliveryPickup({
                        orderId: group.orderId,
                        orderNumber: group.orderNumber,
                        delivererName: delivererName.trim(),
                        photoUrl: photo!,
                        signatureUrl: signature!,
                        batchId: batchId,
                    });

                    // Aguarda status ser atualizado
                    await updateOrderStatus(
                        group.orderId,
                        'retirado_entregador',
                        {},
                        user?.name || 'Gestor',
                        `Retirado pelo entregador: ${delivererName.trim()}`
                    );

                    orderNumbers.push(group.orderNumber);
                    console.log(`[EntregadoresPage] ✅ ${group.orderNumber} confirmado`);
                } catch (err) {
                    console.error(`[EntregadoresPage] ❌ Erro ao confirmar ${group.orderNumber}:`, err);
                    throw err;
                }
            }

            console.log(`[EntregadoresPage] ✅ Lote completo! ${orderNumbers.length} pedidos confirmados`);

            setSuccess(`${orderNumbers.length} lote(s) - ${orderNumbers.join(', ')}`);
            setConfirmingBatchMode(false);
            setSelectedGroupIds(new Map());
            setDelivererName('');
            setPhoto(null);
            setSignature(null);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('[EntregadoresPage] ❌ Erro ao confirmar lote:', err);
            setSuccess(null);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-header flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary" />
                        </div>
                        Entregadores
                    </h1>
                    <p className="page-subtitle">Gerencie a retirada de pedidos e colete assinaturas dos entregadores</p>
                </div>
                <div className="flex bg-muted/50 p-1 rounded-xl border border-border/30">
                    <button
                        onClick={() => setFilterStatus('pendente')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'pendente' ? 'bg-white text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        ⏳ Pendentes ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('retirado')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'retirado' ? 'bg-white text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        ✅ Retirados ({doneCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('todos')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'todos' ? 'bg-white text-primary shadow-sm border border-border/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        📦 Todos
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card-section p-4 bg-amber-500/[0.03] border-amber-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500/70 mb-1">Aguardando Retirada</p>
                    <p className="text-2xl font-black text-amber-500">{pendingCount}</p>
                </div>
                <div className="card-section p-4 bg-success/[0.03] border-success/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-success/70 mb-1">Pedidos Retirados</p>
                    <p className="text-2xl font-black text-success">{doneCount}</p>
                </div>
                <div className="card-section p-4 bg-primary/[0.03] border-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1">Total Mapeado</p>
                    <p className="text-2xl font-black text-primary">{groups.length}</p>
                </div>
                <div className="card-section p-4 bg-secondary/[0.03] border-secondary/20">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground/70 mb-1">Novas Leituras</p>
                    <p className="text-2xl font-black text-secondary-foreground">{barcodeScans.length}</p>
                </div>
            </div>



            {success && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/30 text-success animate-scale-in">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold">Confirmação Realizada!</p>
                        <p className="text-xs opacity-80">Pedido(s) {success} atualizado(s) com sucesso.</p>
                    </div>
                </div>
            )}

            {/* Batch mode button + Filter tabs */}
            <div className="flex gap-2 items-center flex-wrap">
                {pendingCount > 0 && (
                    <button
                        onClick={() => {
                            const newMode = !confirmingBatchMode;
                            setConfirmingBatchMode(newMode);
                            if (newMode) {
                                // Auto-seleciona todos os pendentes no lote
                                const newMap = new Map();
                                filtered.forEach(g => { if (!g.alreadyPickedUp) newMap.set(g.orderId, true); });
                                setSelectedGroupIds(newMap);
                            } else {
                                setSelectedGroupIds(new Map());
                            }
                            setConfirmingId(null);
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${confirmingBatchMode
                            ? 'bg-warning/20 text-warning border border-warning/40'
                            : 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 hover:border-primary/40'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        {confirmingBatchMode ? `Modo Lote Ativo: Todos Pendentes Selecionados` : 'Modo Lote (Confirmar Tudo)'}
                    </button>
                )}

                {confirmingBatchMode && pendingCount > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const newMap = new Map();
                                filtered.forEach(g => { if (!g.alreadyPickedUp) newMap.set(g.orderId, true); });
                                setSelectedGroupIds(newMap);
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                        >
                            Refiltrar Pendentes
                        </button>
                        <button
                            onClick={() => setSelectedGroupIds(new Map())}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/40 hover:bg-muted/80"
                        >
                            Limpar Lote
                        </button>
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2">
                    {([
                        { key: 'pendente', label: `⏳ Aguardando (${pendingCount})` },
                        { key: 'retirado', label: `✅ Retirados (${doneCount})` },
                        { key: 'todos', label: `📦 Todos (${groups.length})` },
                    ] as { key: typeof filterStatus; label: string }[]).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterStatus(f.key)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${filterStatus === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Batch confirmation panel */}
            {confirmingBatchMode && Array.from(selectedGroupIds.values()).filter(v => v).length > 0 && (
                <div className="card-section p-6 border-primary/30 bg-primary/5 space-y-5 sticky top-4 z-20">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Confirmar Lote</p>
                                <p className="text-xs text-muted-foreground">{Array.from(selectedGroupIds.values()).filter(v => v).length} pedido(s) selecionado(s)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setConfirmingBatchMode(false); setSelectedGroupIds(new Map()); }}
                            className="btn-modern bg-muted text-foreground shadow-none px-3"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" /> Nome do Entregador *
                        </label>
                        <input
                            type="text"
                            value={delivererName}
                            onChange={e => setDelivererName(e.target.value)}
                            placeholder="Nome completo do entregador"
                            className="input-modern w-full text-sm"
                        />
                    </div>

                    {/* Camera */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Foto do Rosto *
                        </label>
                        <CameraCapture
                            onCapture={setPhoto}
                            captured={photo}
                            onClear={() => setPhoto(null)}
                        />
                    </div>

                    {/* Signature */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <PenLine className="w-3 h-3" /> Assinatura Digital *
                        </label>
                        <SignatureCanvas
                            onCapture={setSignature}
                            captured={signature}
                            onClear={() => setSignature(null)}
                        />
                    </div>

                    {/* Missing fields hint */}
                    {!canConfirm && (
                        <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                            <p className="text-[10px] font-semibold text-warning">
                                {!delivererName.trim() && '• Informe o nome do entregador. '}
                                {!photo && '• Tire uma foto do rosto. '}
                                {!signature && '• Assine digitalmente.'}
                            </p>
                        </div>
                    )}

                    {/* Confirm button */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBatchConfirm()}
                            disabled={!canConfirm || submitting}
                            className="btn-modern flex-1 justify-center py-3 text-sm font-bold bg-gradient-to-r from-success to-success/80 text-success-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {submitting ? 'Confirmando Lote...' : `Confirmar ${Array.from(selectedGroupIds.values()).filter(v => v).length} Pedido(s)`}
                        </button>
                        <button
                            onClick={() => { setConfirmingBatchMode(false); setSelectedGroupIds(new Map()); setPhoto(null); setSignature(null); setDelivererName(''); }}
                            className="btn-modern bg-muted text-foreground shadow-none px-4"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {filtered.length === 0 ? (
                <div className="card-section p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-bold text-foreground text-lg">Nenhum lote encontrado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {filterStatus === 'pendente'
                            ? 'Nenhum pedido aguardando retirada. Aguarde a produção escanear os códigos.'
                            : 'Nenhum pedido nesta categoria.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(group => {
                        const isExpanded = expandedId === group.orderId;
                        const isConfirming = confirmingId === group.orderId;
                        const order = orders.find(o => o.id === group.orderId);

                        return (
                            <div
                                key={group.orderId}
                                className={`card-section overflow-hidden transition-all duration-300 ${group.alreadyPickedUp ? 'opacity-70' : 'border-primary/20'}`}
                            >
                                {/* Card header */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${group.alreadyPickedUp ? 'bg-success/10' : 'bg-primary/10'}`}>
                                                {group.alreadyPickedUp
                                                    ? <CheckCircle className="w-5 h-5 text-success" />
                                                    : <Truck className="w-5 h-5 text-primary" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-foreground text-sm">{group.orderNumber}</p>
                                                    {order && <StatusBadge status={order.status} />}
                                                    {group.alreadyPickedUp && (
                                                        <span className="status-badge bg-success/10 text-success text-[9px]">
                                                            ✓ RETIRADO
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <span className="font-semibold text-foreground">{group.clientName}</span>
                                                    <span className="mx-1">•</span>
                                                    Vendedor: <span className="font-semibold">{group.sellerName}</span>
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Hash className="w-3 h-3" />
                                                        {group.scans.length} leitura(s)
                                                    </span>
                                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                        <Package className="w-3 h-3" />
                                                        {group.totalQty} produto(s) total
                                                    </span>
                                                    {group.alreadyPickedUp && group.pickupInfo && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {group.pickupInfo.delivererName}
                                                            <span className="mx-1">•</span>
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(group.pickupInfo.pickedUpAt).toLocaleDateString('pt-BR')} às{' '}
                                                            {new Date(group.pickupInfo.pickedUpAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : group.orderId)}
                                                className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-2"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                Detalhes
                                            </button>
                                            {!group.alreadyPickedUp && !confirmingBatchMode && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setConfirmingId(isConfirming ? null : group.orderId);
                                                            setPhoto(null);
                                                            setSignature(null);
                                                            setDelivererName('');
                                                        }}
                                                        className="btn-modern bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs px-4 py-2"
                                                    >
                                                        <Truck className="w-3.5 h-3.5" /> Confirmar Retirada
                                                    </button>
                                                </>
                                            )}
                                            {!group.alreadyPickedUp && confirmingBatchMode && (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
                                                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                                                    <span className="text-xs font-bold text-success uppercase">Incluído no Lote</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded: scans + order items */}
                                {isExpanded && (
                                    <div className="border-t border-border/40 p-5 space-y-4 animate-fade-in">
                                        {/* Products from order */}
                                        {order && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Produtos do Pedido</p>
                                                <div className="rounded-xl border border-border/40 overflow-hidden">
                                                    <table className="modern-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Produto</th>
                                                                <th>Descrição</th>
                                                                <th className="text-right">Qtd</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {order.items.map(item => (
                                                                <tr key={item.id}>
                                                                    <td className="font-semibold text-foreground">
                                                                        {item.product}
                                                                        {item.product.toUpperCase().includes('KIT') && item.sensorType && (
                                                                            <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                                                                                {item.sensorType === 'com_sensor' ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                                                                    <td className="text-right">
                                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-extrabold text-sm">
                                                                            {item.quantity}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Scans history */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                Histórico de Leituras ({group.scans.length})
                                            </p>
                                            <div className="space-y-2">
                                                {group.scans.map((scan, idx) => (
                                                    <div key={scan.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                                                        <span className="text-[10px] font-bold text-muted-foreground w-5 text-center">#{idx + 1}</span>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-semibold text-foreground">{scan.scannedBy}</p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {new Date(scan.scannedAt).toLocaleDateString('pt-BR')} às{' '}
                                                                {new Date(scan.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <span className="status-badge bg-success/10 text-success text-[9px]">✓ Lido</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Already picked up info */}
                                        {group.alreadyPickedUp && group.pickupInfo && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Comprovante de Retirada</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-muted-foreground">Foto do Entregador</p>
                                                        <img
                                                            src={group.pickupInfo.photoUrl}
                                                            alt="Foto do entregador"
                                                            className="rounded-xl border border-border/40 w-full h-28 object-cover"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-muted-foreground">Assinatura Digital</p>
                                                        <img
                                                            src={group.pickupInfo.signatureUrl}
                                                            alt="Assinatura"
                                                            className="rounded-xl border border-border/40 w-full h-28 object-contain bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Confirmation form */}
                                {isConfirming && !group.alreadyPickedUp && (
                                    <div className="border-t border-primary/20 p-5 space-y-5 bg-primary/5 animate-fade-in">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Truck className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">Confirmação de Retirada</p>
                                                <p className="text-[10px] text-muted-foreground">Foto + Assinatura obrigatórias para confirmar</p>
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                <User className="w-3 h-3" /> Nome do Entregador *
                                            </label>
                                            <input
                                                type="text"
                                                value={delivererName}
                                                onChange={e => setDelivererName(e.target.value)}
                                                placeholder="Nome completo do entregador"
                                                className="input-modern w-full text-sm"
                                            />
                                        </div>

                                        {/* Camera */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                <Camera className="w-3 h-3" /> Foto do Rosto *
                                            </label>
                                            <CameraCapture
                                                onCapture={setPhoto}
                                                captured={photo}
                                                onClear={() => setPhoto(null)}
                                            />
                                        </div>

                                        {/* Signature */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                <PenLine className="w-3 h-3" /> Assinatura Digital *
                                            </label>
                                            <SignatureCanvas
                                                onCapture={setSignature}
                                                captured={signature}
                                                onClear={() => setSignature(null)}
                                            />
                                        </div>

                                        {/* Missing fields hint */}
                                        {!canConfirm && (
                                            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                                                <p className="text-[10px] font-semibold text-warning">
                                                    {!delivererName.trim() && '• Informe o nome do entregador. '}
                                                    {!photo && '• Tire uma foto do rosto. '}
                                                    {!signature && '• Assine digitalmente.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Confirm button */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleConfirm(group)}
                                                disabled={!canConfirm || submitting}
                                                className="btn-modern flex-1 justify-center py-3 text-sm font-bold bg-gradient-to-r from-success to-success/80 text-success-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                {submitting ? 'Registrando...' : 'Confirmar Retirada'}
                                            </button>
                                            <button
                                                onClick={() => { setConfirmingId(null); setPhoto(null); setSignature(null); setDelivererName(''); }}
                                                className="btn-modern bg-muted text-foreground shadow-none px-4"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default EntregadoresPage;
