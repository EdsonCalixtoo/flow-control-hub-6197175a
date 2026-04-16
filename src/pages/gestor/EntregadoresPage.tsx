import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
    Truck, Package, CheckCircle, X, Camera, PenLine, RefreshCw,
    ClipboardList, ChevronDown, ChevronUp, User, Calendar, Hash,
    Search
} from 'lucide-react';
import { toast } from 'sonner';

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
    volumeIndex?: number;  // Índice do volume (0-based)
    totalVolumes?: number; // Quantidade total de volumes
    pickupInfo?: {
        delivererName: string;
        pickedUpAt: string;
        photoUrl: string;
        signatureUrl: string;
    };
    carrier?: string;
    groupKey: string;
    unifiedOrders?: Array<{ id: string; number: string; items: any[] }>; // Novos pedidos unificados nesta caixa
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
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
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
            <div className="space-y-3">
                <div className="relative rounded-[2rem] overflow-hidden border-2 border-primary/20 bg-white shadow-inner p-4">
                    <img src={captured} alt="Assinatura" className="w-full h-32 object-contain" />
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg animate-scale-in">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                </div>
                <button 
                  onClick={handleClear} 
                  className="w-full h-12 rounded-2xl bg-muted/50 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Limpar e Assinar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/20 bg-primary/[0.02] touch-none transition-all focus-within:border-primary/40 focus-within:bg-primary/[0.04]">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={320}
                    className="w-full h-48 md:h-56 cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                />
            </div>
            <p className="text-[10px] font-black text-muted-foreground/60 text-center uppercase tracking-widest">Utilize o dedo ou mouse para assinar campo acima</p>
            <div className="flex gap-2">
                <button 
                  onClick={handleCapture} 
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" /> Validar Assinatura
                </button>
                <button 
                  onClick={handleClear} 
                  className="w-12 h-12 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-muted transition-all flex items-center justify-center"
                >
                    <RefreshCw className="w-5 h-5" />
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
                <div className="relative rounded-xl overflow-hidden border-2 border-success/40 bg-black/5">
                    <img src={captured} alt="Foto do entregador" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
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
                <div className="relative w-full bg-black rounded-xl overflow-hidden border-2 border-primary/40 aspect-video md:aspect-[16/9] flex items-stretch shadow-inner">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        playsInline
                        autoPlay
                        muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 md:w-64 md:h-64 border-4 border-yellow-400/50 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                        <p className="absolute bottom-6 left-0 right-0 text-center text-white text-xs md:text-sm font-black bg-black/60 py-2 px-4 backdrop-blur-sm mx-auto w-fit rounded-full border border-white/20">
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
    const [selectedCarrier, setSelectedCarrier] = useState<string>('TODOS');
    const [loadingInitial, setLoadingInitial] = useState(true);

    const [search, setSearch] = useState('');

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
            const originalOrder = orders.find(o => o.id === scan.orderId);
            if (!originalOrder) continue;

            // 🧬 Busca Robusta e DETERMINÍSTICA pelo "Pai Raiz" (Evita duplicados em unificações circulares)
            let currentRoot = originalOrder;
            const groupMembers = [originalOrder];
            const visitedIds = new Set<string>();
            visitedIds.add(originalOrder.id);
            
            let parentId = originalOrder.parentOrderId;
            while (parentId && !visitedIds.has(parentId)) {
                const parent = orders.find(o => o.id === parentId);
                if (!parent) break;
                groupMembers.push(parent);
                visitedIds.add(parent.id);
                parentId = parent.parentOrderId;
            }

            // Para ser determinístico (um único cartão mesmo que unifique A->B e B->A):
            // 1. Tenta o que NÃO tem pai (o topo da cadeia oficial)
            // 2. Se for circular (todos têm pai), escolhemos o com menor número de ID alphabetically
            const headerOrder = groupMembers.find(m => !m.parentOrderId) || 
                               groupMembers.sort((a, b) => a.id.localeCompare(b.id))[0];

            // Filtro: Apenas pedidos liberados pela produção ou já retirados
            if (headerOrder.status !== 'produto_liberado' && headerOrder.status !== 'retirado_entregador' && headerOrder.status !== 'producao_finalizada' &&
                originalOrder.status !== 'produto_liberado' && originalOrder.status !== 'retirado_entregador' && originalOrder.status !== 'producao_finalizada') {
                continue;
            }

            const pickup = deliveryPickups.find(p => p.orderId === headerOrder.id);
            const volumes = headerOrder.volumes || 1;

            // Criar uma entrada para cada volume do pedido PAI
            for (let volumeIndex = 0; volumeIndex < volumes; volumeIndex++) {
                const groupKey = `${headerOrder.id}-vol-${volumeIndex}`;

                if (!map.has(groupKey)) {
                    map.set(groupKey, {
                        orderId: headerOrder.id,
                        orderNumber: headerOrder.number,
                        clientName: headerOrder.clientName,
                        sellerName: headerOrder.sellerName,
                        scans: [],
                        totalQty: headerOrder.items.reduce((acc, i) => acc + i.quantity, 0),
                        alreadyPickedUp: !!pickup || headerOrder.status === 'retirado_entregador',
                        volumeIndex,
                        totalVolumes: volumes,
                        carrier: (headerOrder.carrier || 'SEM TRANSPORTADORA').trim().toUpperCase(),
                        groupKey: groupKey,
                        unifiedOrders: [],
                    });
                }
                
                const currentGroup = map.get(groupKey)!;

                // Se o scan for de um pedido diferente (unificado), adiciona à lista
                if (originalOrder.id !== headerOrder.id) {
                    if (!currentGroup.unifiedOrders?.some(uo => uo.id === originalOrder.id)) {
                        currentGroup.unifiedOrders?.push({ 
                            id: originalOrder.id, 
                            number: originalOrder.number,
                            items: originalOrder.items // Passa os itens para o manifesto total
                        });
                    }
                }

                // Adiciona o scan ao grupo (evita duplicados)
                if (!currentGroup.scans.some(s => s.id === scan.id)) {
                    currentGroup.scans.push({
                        id: scan.id,
                        scannedBy: scan.scannedBy,
                        scannedAt: scan.scannedAt,
                    });
                }
            }
        }
        
        // Pós-processamento: Se houver pedidos que são filhos mas cujos pais NÃO foram bipados ainda, 
        // eles devem aparecer mesmo assim? O usuário disse: "deve conter em entregadores o pedido".
        // Vamos garantir que todos os pedidos unificados apareçam nos grupos de seus pais se os pedidos foram liberados.
        orders.filter(o => o.parentOrderId && (o.status === 'produto_liberado' || o.status === 'retirado_entregador' || o.status === 'producao_finalizada')).forEach(child => {
            // Segue a mesma lógica determinística do Pai Raiz
            let root = child;
            const visited = new Set<string>();
            visited.add(child.id);
            let pid = child.parentOrderId;
            const chain = [child];

            while(pid && !visited.has(pid)) {
                const p = orders.find(o => o.id === pid);
                if (!p) break;
                chain.push(p);
                visited.add(p.id);
                pid = p.parentOrderId;
            }

            const header = chain.find(m => !m.parentOrderId) || 
                          chain.sort((a,b) => a.id.localeCompare(b.id))[0];

            if (header.id === child.id) return; // Se ele mesmo acabou virando o pai, ignora o pós-processo de filho

            const volumes = header.volumes || 1;
            for (let v = 0; v < volumes; v++) {
                const groupKey = `${header.id}-vol-${v}`;
                const group = map.get(groupKey);
                if (group && !group.unifiedOrders?.some(uo => uo.id === child.id)) {
                    group.unifiedOrders?.push({ id: child.id, number: child.number, items: child.items });
                }
            }
        });
        return [...map.values()].sort((a, b) => {
            if (a.alreadyPickedUp && !b.alreadyPickedUp) return 1;
            if (!a.alreadyPickedUp && b.alreadyPickedUp) return -1;
            return 0;
        });
    }, [barcodeScans, orders, deliveryPickups]);

    const filtered = groups.filter(g => {
        let matchStatus = true;
        if (filterStatus === 'pendente') matchStatus = !g.alreadyPickedUp;
        if (filterStatus === 'retirado') matchStatus = g.alreadyPickedUp;

        const rawCarrier = (g.carrier || 'SEM TRANSPORTADORA').trim().toUpperCase();
        const gCarrier = rawCarrier === 'CLEYTON' ? 'KLEYTON' : rawCarrier;
        const sCarrier = selectedCarrier.trim().toUpperCase();
        const matchCarrier = sCarrier === 'TODOS' || gCarrier === sCarrier;

        let matchSearch = true;
        if (search.trim()) {
            const query = search.toLowerCase();
            const inHeader = g.orderNumber.toLowerCase().includes(query) || 
                             g.clientName.toLowerCase().includes(query) ||
                             g.orderId.toLowerCase().includes(query);
            const inUnified = g.unifiedOrders?.some(uo => 
                uo.number.toLowerCase().includes(query)
            );
            matchSearch = inHeader || inUnified;
        }

        return matchStatus && matchCarrier && matchSearch;
    });

    const carriers = React.useMemo(() => {
        const set = new Set<string>();
        groups.forEach(g => {
            if (g.carrier) {
                let name = g.carrier.trim().toUpperCase();
                if (name === 'CLEYTON') name = 'KLEYTON';
                set.add(name);
            }
        });
        return ['TODOS', ...Array.from(set).sort()];
    }, [groups]);

    const pendingCount = React.useMemo(() => groups.filter(g => !g.alreadyPickedUp).length, [groups]);
    const doneCount = React.useMemo(() => groups.filter(g => g.alreadyPickedUp).length, [groups]);

    const canConfirm = delivererName.trim().length > 1 && !!photo && !!signature;

    const handleConfirm = async (group: OrderGroup) => {
        if (!canConfirm || submitting) return;
        setSubmitting(true);
        try {
            console.log(`[EntregadoresPage] 🔄 Confirmando pedido ${group.orderNumber} com R2...`);

            // 🚀 Helper local para converter Base64 em Blob para o R2
            const b64ToBlob = (b64: string) => {
                const parts = b64.split(';');
                const contentType = parts[0].split(':')[1];
                const decodedData = window.atob(parts[1].split(',')[1]);
                const uInt8Array = new Uint8Array(decodedData.length);
                for (let i = 0; i < decodedData.length; ++i) {
                    uInt8Array[i] = decodedData.charCodeAt(i);
                }
                return new Blob([uInt8Array], { type: contentType });
            };

            const batchId = crypto.randomUUID();

            // 1. Upload das fotos para o R2 (com nomes únicos)
            const { uploadToR2 } = await import('@/lib/storageServiceR2');
            
            const photoBlob = b64ToBlob(photo!);
            const sigBlob = b64ToBlob(signature!);

            console.log('   📸 Subindo foto e assinatura para R2...');
            const photoPath = `entregas/${group.orderNumber}-face-${Date.now()}.jpg`;
            const sigPath = `entregas/${group.orderNumber}-sig-${Date.now()}.png`;

            const [r2PhotoUrl, r2SigUrl] = await Promise.all([
                uploadToR2(photoBlob, photoPath),
                uploadToR2(sigBlob, sigPath)
            ]);

            // 2. Salva no banco com os LINKS do R2
            await addDeliveryPickup({
                orderId: group.orderId,
                orderNumber: group.orderNumber,
                delivererName: delivererName.trim(),
                photoUrl: r2PhotoUrl,
                signatureUrl: r2SigUrl,
                batchId: batchId,
            });

            await updateOrderStatus(
                group.orderId,
                'retirado_entregador',
                {},
                user?.name || 'Gestor',
                `Retirado pelo entregador: ${delivererName.trim()}`
            );

            // 🔗 Sincroniza pedidos unificados (Garante que cada um tenha seu registro de coleta)
            if (group.unifiedOrders && group.unifiedOrders.length > 0) {
                for (const uo of group.unifiedOrders) {
                    // ✅ Cria registro de retirada também para o pedido unificado (herda fotos/assinaturas/lote)
                    await addDeliveryPickup({
                        orderId: uo.id,
                        orderNumber: uo.number,
                        delivererName: delivererName.trim(),
                        photoUrl: r2PhotoUrl,
                        signatureUrl: r2SigUrl,
                        batchId: batchId,
                        note: `Coleta unificada com ${group.orderNumber}`
                    });

                    await updateOrderStatus(
                        uo.id,
                        'retirado_entregador',
                        {},
                        user?.name || 'Gestor',
                        `Retirado pelo entregador (Unificado com ${group.orderNumber}): ${delivererName.trim()}`
                    );
                }
            }

            setSuccess(group.orderNumber);
            setConfirmingId(null);
            setDelivererName('');
            setPhoto(null);
            setSignature(null);
            setTimeout(() => setSuccess(null), 4000);
        } catch (err: any) {
            console.error('[EntregadoresPage] ❌ Erro ao confirmar pedido:', err?.message ?? err);
            toast.error(`Erro ao confirmar: ${err?.message || 'Verifique sua conexão'}`);
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
            const batchId = crypto.randomUUID();

            const { uploadToR2 } = await import('@/lib/storageServiceR2');
            const b64ToBlob = (b64: string) => {
                const parts = b64.split(';');
                const contentType = parts[0].split(':')[1];
                const decodedData = window.atob(parts[1].split(',')[1]);
                const uInt8Array = new Uint8Array(decodedData.length);
                for (let i = 0; i < decodedData.length; ++i) {
                    uInt8Array[i] = decodedData.charCodeAt(i);
                }
                return new Blob([uInt8Array], { type: contentType });
            };

            console.log(`[EntregadoresPage] 🔄 Confirmando lote ${batchId} com R2...`);

            // 1. Upload único da foto/assinatura do entregador para o R2 (reutilizamos para o lote)
            const photoBlob = b64ToBlob(photo!);
            const sigBlob = b64ToBlob(signature!);
            
            const commonPhotoPath = `entregas/lote-${batchId}-face.jpg`;
            const commonSigPath = `entregas/lote-${batchId}-sig.png`;

            console.log('   📸 Subindo mídias do lote para R2...');
            const [r2PhotoUrl, r2SigUrl] = await Promise.all([
                uploadToR2(photoBlob, commonPhotoPath),
                uploadToR2(sigBlob, commonSigPath)
            ]);

            // 2. Confirma cada pedido individualmente com os mesmos links R2
            for (const group of selectedGroups) {
                try {
                    await addDeliveryPickup({
                        orderId: group.orderId,
                        orderNumber: group.orderNumber,
                        delivererName: delivererName.trim(),
                        photoUrl: r2PhotoUrl,
                        signatureUrl: r2SigUrl,
                        batchId: batchId,
                    });

                    await updateOrderStatus(
                        group.orderId,
                        'retirado_entregador',
                        {},
                        user?.name || 'Gestor',
                        `Retirado pelo entregador: ${delivererName.trim()}`
                    );

                    // 🔗 Sincroniza pedidos unificados no lote (Garante registro para todos)
                    if (group.unifiedOrders && group.unifiedOrders.length > 0) {
                        for (const uo of group.unifiedOrders) {
                            // ✅ Herda fotos e lote para o pedido unificado
                            await addDeliveryPickup({
                                orderId: uo.id,
                                orderNumber: uo.number,
                                delivererName: delivererName.trim(),
                                photoUrl: r2PhotoUrl,
                                signatureUrl: r2SigUrl,
                                batchId: batchId,
                                note: `Coleta unificada (Lote) com ${group.orderNumber}`
                            });

                            await updateOrderStatus(
                                uo.id,
                                'retirado_entregador',
                                {},
                                user?.name || 'Gestor',
                                `Retirado pelo entregador (Unificado com ${group.orderNumber}): ${delivererName.trim()}`
                            );
                        }
                    }

                    orderNumbers.push(group.orderNumber);
                } catch (err) {
                    console.error(`[EntregadoresPage] ❌ Erro ao confirmar ${group.orderNumber}:`, err);
                    throw err;
                }
            }

            setSuccess(`${orderNumbers.length} lote(s) - ${orderNumbers.join(', ')}`);
            setConfirmingBatchMode(false);
            setSelectedGroupIds(new Map());
            setDelivererName('');
            setPhoto(null);
            setSignature(null);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('[EntregadoresPage] ❌ Erro ao confirmar lote:', err);
            toast.error(`Erro ao confirmar lote: ${err?.message || 'Verifique sua conexão'}`);
            setSuccess(null);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Header Modernizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shadow-inner group">
                        <Truck className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Entregadores</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <p className="text-xs text-muted-foreground font-semibold">Monitoramento e confirmação de coletas</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/40 p-1.5 rounded-2xl border border-border/20 backdrop-blur-md">
                        {([
                            { key: 'pendente', label: '⏳ Aguardando', count: groups.filter(g => !g.alreadyPickedUp).length },
                            { key: 'retirado', label: '✅ Retirados', count: groups.filter(g => g.alreadyPickedUp).length },
                            { key: 'todos', label: '📦 Todos', count: groups.length },
                        ] as const).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilterStatus(f.key)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filterStatus === f.key ? 'bg-white text-primary shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:bg-white/40'}`}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Dashboard - Estilo Premium */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-[2rem] bg-amber-500/[0.03] border border-amber-500/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Aguardando</p>
                        <p className="text-2xl font-black text-foreground">{pendingCount}</p>
                    </div>
                </div>
                <div className="p-4 rounded-[2rem] bg-success/[0.03] border border-success/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Retirados</p>
                        <p className="text-2xl font-black text-foreground">{doneCount}</p>
                    </div>
                </div>
                <div className="p-4 rounded-[2rem] bg-primary/[0.03] border border-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Total Geral</p>
                        <p className="text-2xl font-black text-foreground">{groups.length}</p>
                    </div>
                </div>
                <div className="p-4 rounded-[2rem] bg-secondary/[0.03] border border-secondary/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <Hash className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Leituras</p>
                        <p className="text-2xl font-black text-foreground">{barcodeScans.length}</p>
                    </div>
                </div>
            </div>

            {success && (
                <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-success/10 border border-success/30 text-success animate-scale-in">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-wider">Confirmação Realizada!</p>
                        <p className="text-xs font-bold opacity-80 mt-0.5">Pedido(s) {success} atualizado(s) com sucesso.</p>
                    </div>
                </div>
            )}

            {/* Ações e Filtros Secundários */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search Bar Premium */}
                    <div className="relative group flex-1 max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar por Pedido, Cliente ou Pedido Unificado..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            className="input-modern pl-10 h-12 text-xs w-full bg-white/50 border-border/40 focus:bg-white transition-all shadow-sm rounded-2xl" 
                        />
                    </div>

                    {/* Carrier Tabs Premium */}
                    {carriers.length > 2 && (
                        <div className="flex gap-2 flex-wrap p-1.5 bg-muted/30 rounded-2xl border border-border/20 backdrop-blur-md">
                            {carriers.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setSelectedCarrier(c)}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCarrier === c
                                        ? 'bg-background text-primary shadow-sm ring-1 ring-primary/10'
                                        : 'text-muted-foreground hover:bg-background/40'
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Batch mode activation */}
                {pendingCount > 0 && (
                    <button
                        onClick={() => {
                            const newMode = !confirmingBatchMode;
                            setConfirmingBatchMode(newMode);
                            if (newMode) {
                                const newMap = new Map();
                                filtered.forEach(g => { if (!g.alreadyPickedUp) newMap.set(g.orderId, true); });
                                setSelectedGroupIds(newMap);
                            } else {
                                setSelectedGroupIds(new Map());
                            }
                            setConfirmingId(null);
                        }}
                        className={`w-full group relative h-14 rounded-[1.5rem] font-bold transition-all flex items-center justify-between px-6 overflow-hidden ${confirmingBatchMode
                            ? 'bg-warning/10 text-warning border-2 border-warning/30'
                            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] border-none'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-5 h-5" />
                            <span className="text-sm font-black uppercase tracking-[0.2em]">
                                {confirmingBatchMode ? `Modo Lote Ativo (${pendingCount})` : 'Ativar Confirmação em Lote'}
                            </span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${confirmingBatchMode ? 'bg-warning/20' : 'bg-white/20'}`}>
                            {confirmingBatchMode ? 'Clique para Sair' : 'Modo Rápido'}
                        </div>
                        {confirmingBatchMode && <div className="absolute inset-0 bg-warning/5 animate-pulse pointer-events-none" />}
                    </button>
                )}
            </div>

            {/* Painel de confirmação em Lote (Redesenhado) */}
            {confirmingBatchMode && Array.from(selectedGroupIds.values()).filter(v => v).length > 0 && (
                <div className="card-section p-0 border-primary/30 bg-primary/[0.01] overflow-hidden shadow-2xl animate-in slide-in-from-top-4 duration-500 rounded-[2.5rem]">
                    <div className="bg-primary p-8 text-white relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <ClipboardList className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Processamento em Lote</p>
                                    <h2 className="text-3xl font-black uppercase leading-none">Confirmar Retirada</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => { setConfirmingBatchMode(false); setSelectedGroupIds(new Map()); }}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-8">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                <span className="text-xs font-black uppercase tracking-widest">{Array.from(selectedGroupIds.values()).filter(v => v).length} Pedidos Selecionados</span>
                            </div>
                            <div className="h-1 w-24 bg-white/20 rounded-full" />
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Formulário Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Lado Esquerdo: Identificação e Foto */}
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" /> Identificação do Entregador *
                                    </label>
                                    <input
                                        type="text"
                                        value={delivererName}
                                        onChange={e => setDelivererName(e.target.value)}
                                        placeholder="Digite o nome completo"
                                        className="h-14 w-full rounded-2xl bg-muted/30 border-2 border-transparent focus:border-primary/30 focus:bg-white transition-all px-6 font-bold text-lg"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-primary" /> Reconhecimento Facial *
                                    </label>
                                    <CameraCapture
                                        onCapture={setPhoto}
                                        captured={photo}
                                        onClear={() => setPhoto(null)}
                                    />
                                </div>
                            </div>

                            {/* Lado Direito: Assinatura */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <PenLine className="w-4 h-4 text-primary" /> Assinatura Digital do Recebedor *
                                </label>
                                <SignatureCanvas
                                    onCapture={setSignature}
                                    captured={signature}
                                    onClear={() => setSignature(null)}
                                />
                            </div>
                        </div>

                        {/* Footer do Painel */}
                        <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-6">
                            {!canConfirm ? (
                                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                                    <ClipboardList className="w-5 h-5 opacity-60" />
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                                        Aguardando: {!delivererName.trim() ? 'Nome' : !photo ? 'Foto' : 'Assinatura'}
                                    </p>
                                </div>
                            ) : <div />}

                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => { setConfirmingBatchMode(false); setSelectedGroupIds(new Map()); setPhoto(null); setSignature(null); setDelivererName(''); }}
                                    className="h-14 px-8 rounded-2xl bg-muted/50 text-muted-foreground font-black text-xs uppercase tracking-widest hover:bg-muted transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleBatchConfirm()}
                                    disabled={!canConfirm || submitting}
                                    className="flex-1 md:flex-none h-14 px-12 rounded-2xl bg-success text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    {submitting ? 'PROCESSANDO...' : `CONFIRMAR ${Array.from(selectedGroupIds.values()).filter(v => v).length} PEDIDOS`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Listagem Estilizada */}
            {filtered.length === 0 ? (
                <div className="py-24 text-center bg-white/40 rounded-[2.5rem] border-2 border-dashed border-border/40 backdrop-blur-sm animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-6">
                        <Package className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                    <p className="text-xl font-black text-foreground uppercase tracking-[0.2em]">Nada por aqui</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">Todos os pedidos estão em dia!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map(group => {
                        const isExpanded = expandedId === group.orderId;
                        const isConfirming = confirmingId === group.orderId;
                        const order = orders.find(o => o.id === group.orderId);

                        return (
                            <div
                                key={group.groupKey}
                                className={`group relative flex flex-col bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'ring-2 ring-primary/20 shadow-2xl' : 'border-border/20 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
                            >
                                {/* Banner indicador de status */}
                                <div className={`h-1.5 w-full bg-gradient-to-r ${group.alreadyPickedUp ? 'from-success to-emerald-600' : 'from-primary to-blue-600'}`} />

                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${group.alreadyPickedUp ? 'bg-success/5' : 'bg-primary/5'}`}>
                                                {group.alreadyPickedUp
                                                    ? <CheckCircle className="w-7 h-7 text-success" />
                                                    : <Truck className="w-7 h-7 text-primary" />}
                                            </div>
                                            
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                                    <h2 className="text-xl font-black text-foreground uppercase truncate tracking-tight">
                                                        {group.orderNumber}
                                                        {group.unifiedOrders && group.unifiedOrders.length > 0 && (
                                                            <span className="text-primary ml-2">+ {group.unifiedOrders.length} unificados</span>
                                                        )}
                                                    </h2>
                                                    {group.totalVolumes && group.totalVolumes > 1 && (
                                                        <span className="px-3 py-1 rounded-full bg-producao/10 text-producao text-[9px] font-black uppercase tracking-widest ring-1 ring-producao/20">
                                                            📦 Vol. {(group.volumeIndex || 0) + 1} / {group.totalVolumes}
                                                        </span>
                                                    )}
                                                    {order && <StatusBadge status={order.status} />}
                                                    {group.carrier && (
                                                        <span className="px-3 py-1 rounded-full bg-foreground text-background text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5">
                                                            <Truck className="w-3 h-3" /> {group.carrier}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                                                    <p className="text-foreground font-black uppercase tracking-wide truncate max-w-[200px]">{group.clientName}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 opacity-40" />
                                                        <span className="opacity-60">{group.sellerName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="w-3.5 h-3.5 opacity-40" />
                                                        <span className="opacity-60">{group.totalQty} itens</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : group.orderId)}
                                                className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isExpanded ? 'bg-foreground text-background shadow-lg' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                {isExpanded ? 'FECHAR' : 'PEDIDOS'}
                                            </button>

                                            {!group.alreadyPickedUp && !confirmingBatchMode && (
                                                <button
                                                    onClick={() => {
                                                        setConfirmingId(isConfirming ? null : group.orderId);
                                                        setPhoto(null);
                                                        setSignature(null);
                                                        setDelivererName('');
                                                    }}
                                                    className={`h-11 px-8 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${isConfirming ? 'bg-warning/10 text-warning ring-2 ring-warning/30' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}
                                                >
                                                    <Truck className="w-4 h-4" /> 
                                                    {isConfirming ? 'CANCELAR' : 'RETIRAR'}
                                                </button>
                                            )}

                                            {!group.alreadyPickedUp && confirmingBatchMode && (
                                                <div className="h-11 px-5 rounded-xl bg-success/10 border-2 border-success/30 flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                    <span className="text-[10px] font-black text-success uppercase tracking-wider">NO LOTE</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comprovante resumido se já retirado */}
                                    {group.alreadyPickedUp && group.pickupInfo && !isExpanded && (
                                        <div className="mt-6 flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                            <div className="flex -space-x-3">
                                                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-muted shadow-sm">
                                                    <img src={group.pickupInfo.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm flex items-center justify-center p-1">
                                                    <img src={group.pickupInfo.signatureUrl} alt="Assinatura" className="w-full h-full object-contain" />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">Entregue para</p>
                                                <p className="text-xs font-black text-foreground truncate uppercase">{group.pickupInfo.delivererName}</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(group.pickupInfo.pickedUpAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Seção Expandida: Itens e Leituras */}
                                {isExpanded && (
                                    <div className="px-8 pb-8 space-y-8 animate-in slide-in-from-top-2 duration-300">
                                        {/* Tabela de Itens Premium */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-primary" />
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Itens na embalagem</p>
                                            </div>
                                            <div className="rounded-3xl border border-border/20 overflow-hidden bg-muted/10 shadow-inner">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-muted/30 border-b border-border/10">
                                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pedido</th>
                                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Produto</th>
                                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Quantidade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[order, ...(group.unifiedOrders?.map(uo => orders.find(o => o.id === uo.id)) || [])].filter(Boolean).map(o => (
                                                            <React.Fragment key={o!.id}>
                                                                {o!.items.map(item => (
                                                                    <tr key={item.id} className="border-b border-border/5 hover:bg-white/40 transition-colors">
                                                                        <td className="px-6 py-4 text-xs font-black text-primary">{o!.number}</td>
                                                                        <td className="px-6 py-4">
                                                                            <p className="text-sm font-black text-foreground mb-0.5 uppercase tracking-tight">{item.product}</p>
                                                                            <p className="text-[10px] text-muted-foreground/60 uppercase font-bold">{item.description || 'N/A'}</p>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm px-2">
                                                                                {item.quantity}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Histórico e Comprovante */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <ClipboardList className="w-4 h-4 text-primary" />
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Histórico de Conferência</p>
                                                </div>
                                                <div className="space-y-3">
                                                    {group.scans.map((scan, idx) => (
                                                        <div key={scan.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/10 group/item hover:bg-white transition-all shadow-sm">
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-[10px] text-muted-foreground/40 group-hover/item:text-primary transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-xs font-black text-foreground uppercase tracking-widest">{scan.scannedBy}</p>
                                                                <p className="text-[10px] text-muted-foreground font-bold">{new Date(scan.scannedAt).toLocaleString('pt-BR')}</p>
                                                            </div>
                                                            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[8px] font-black uppercase">Confirmado</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {group.alreadyPickedUp && group.pickupInfo && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-success" />
                                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Comprovante de Retirada</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Foto Coletada</p>
                                                            <div className="aspect-[4/3] rounded-3xl border border-border/20 overflow-hidden bg-muted/10">
                                                                <img src={group.pickupInfo.photoUrl} alt="Face" className="w-full h-full object-cover" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Assinatura Digital</p>
                                                            <div className="aspect-[4/3] rounded-3xl border border-border/20 overflow-hidden bg-white flex items-center justify-center p-6">
                                                                <img src={group.pickupInfo.signatureUrl} alt="Sig" className="w-full h-full object-contain" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Formulário de Retirada (dentro do card) */}
                                {isConfirming && !group.alreadyPickedUp && (
                                    <div className="px-8 pb-8 pt-4 space-y-8 bg-primary/[0.02] border-t border-primary/20 animate-in slide-in-from-top-4">
                                        <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-3">
                                               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                   <Camera className="w-5 h-5 text-primary" />
                                               </div>
                                               <div>
                                                   <p className="text-sm font-black text-foreground uppercase tracking-tight">Finalizar Retirada Individual</p>
                                                   <p className="text-[9px] font-bold text-muted-foreground uppercase">Complete os campos obrigatórios abaixo</p>
                                               </div>
                                           </div>
                                           <button 
                                             onClick={() => { setConfirmingId(null); setPhoto(null); setSignature(null); setDelivererName(''); }}
                                             className="w-10 h-10 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted transition-all flex items-center justify-center"
                                           >
                                              <X className="w-5 h-5" />
                                           </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                                        <User className="w-4 h-4" /> Nome do Entregador *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={delivererName}
                                                        onChange={e => setDelivererName(e.target.value)}
                                                        placeholder="Digite o nome completo"
                                                        className="h-12 w-full rounded-xl bg-muted/50 border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all px-5 font-bold text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                                        <Camera className="w-4 h-4" /> Foto de Confirmação *
                                                    </label>
                                                    <CameraCapture
                                                        onCapture={setPhoto}
                                                        captured={photo}
                                                        onClear={() => setPhoto(null)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                                    <PenLine className="w-4 h-4" /> Assinatura do Recebedor *
                                                </label>
                                                <SignatureCanvas
                                                    onCapture={setSignature}
                                                    captured={signature}
                                                    onClear={() => setSignature(null)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-border/10">
                                            <div className="flex items-center gap-3">
                                                {!canConfirm && (
                                                   <p className="text-[10px] font-black text-warning uppercase bg-warning/5 px-4 py-2 rounded-xl ring-1 ring-warning/20">
                                                      Campos pendentes: {!delivererName.trim() ? 'Nome' : !photo ? 'Foto' : 'Assinatura'}
                                                   </p>
                                                )}
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleConfirm(group)}
                                                    disabled={!canConfirm || submitting}
                                                    className="flex-1 h-14 px-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                                >
                                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                                    {submitting ? 'Salvando...' : 'Confirmar Retirada'}
                                                </button>
                                            </div>
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
