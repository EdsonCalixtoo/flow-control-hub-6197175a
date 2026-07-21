/**
 * ComprovanteUpload.tsx — Versão Storage 🚀
 * Envia arquivos para o Supabase Storage em vez de salvar Base64 no banco.
 * Inclui compressão de imagem no cliente para salvar mais banda.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Download, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { uploadToR2, generateR2Path, cleanR2Url } from '@/lib/storageServiceR2';
import { toast } from 'sonner';

interface Props {
    values?: string[];
    onChange: (values: string[]) => void;
    label?: string;
    readOnly?: boolean;
    orderId?: string;
    capture?: 'user' | 'environment';
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm';

/* ─── Helper: Compressão de Imagem ─────────────────────── */
const compressImage = async (file: File): Promise<Blob | File> => {
    if (file.type === 'application/pdf' || file.type.startsWith('video/')) return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Limite de 1200px (suficiente para leitura de comprovantes)
                const maxWidth = 1200;
                const scale = Math.min(1, maxWidth / img.width);
                
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(
                    (blob) => resolve(blob || file),
                    'image/jpeg',
                    0.75 // 75% de qualidade (ótimo equilíbrio)
                );
            };
        };
    });
};

const isPdf = (src: string) => src?.toLowerCase().includes('.pdf') && !src.startsWith('data:image');
const isVideo = (src: string) => {
    if (!src) return false;
    const lower = src.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.ogg') || lower.startsWith('data:video');
};

/* ─── Modal de visualização (Galeria Premium) ──────────────── */
export const PreviewModal: React.FC<{
    allMedia: string[];
    initialIndex: number;
    onClose: () => void;
}> = ({ allMedia, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const currentSrc = allMedia[currentIndex];
    const pdf = isPdf(currentSrc);
    const video = isVideo(currentSrc);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));
        setZoom(1);
    }, [allMedia.length]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
        setZoom(1);
    }, [allMedia.length]);

    // Teclado para navegação
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && allMedia.length > 1) handleNext();
            if (e.key === 'ArrowLeft' && allMedia.length > 1) handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, onClose, allMedia.length]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent shrink-0" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    <span className="text-white/90 text-sm font-bold tracking-widest uppercase">
                        Provas de Produção
                    </span>
                    {allMedia.length > 1 && (
                        <span className="text-xs font-black bg-white/10 text-white/80 px-2.5 py-1 rounded-full">
                            {currentIndex + 1} / {allMedia.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => window.open(currentSrc, '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-black uppercase tracking-wider hover:bg-primary hover:text-white transition-all">
                        <Download className="w-4 h-4" /> Original
                    </button>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-destructive transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center" onClick={e => e.stopPropagation()}>
                {/* Prev Button */}
                {allMedia.length > 1 && (
                    <button onClick={handlePrev} className="absolute left-4 z-10 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-white/20 transition-all group backdrop-blur-sm">
                        <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}

                {/* Content */}
                <div className="w-full h-full max-w-6xl max-h-[85vh] p-4 sm:p-8 flex items-center justify-center transition-all">
                    {pdf ? (
                        <iframe src={currentSrc} title="Comprovante PDF" className="w-full h-full rounded-2xl bg-white shadow-2xl ring-1 ring-white/10" />
                    ) : video ? (
                        <video src={cleanR2Url(currentSrc)} controls autoPlay className="w-full h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
                    ) : (
                        <img src={cleanR2Url(currentSrc)} alt="Prova" className="w-full h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-transform" style={{ transform: `scale(${zoom})` }} />
                    )}
                </div>

                {/* Next Button */}
                {allMedia.length > 1 && (
                    <button onClick={handleNext} className="absolute right-4 z-10 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-white/20 transition-all group backdrop-blur-sm">
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
            </div>

            {/* Thumbnails Footer */}
            {allMedia.length > 1 && (
                <div className="h-28 bg-gradient-to-t from-black/80 to-transparent shrink-0 flex items-center justify-center gap-2 px-6 overflow-x-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                    {allMedia.map((src, idx) => {
                        const isPd = isPdf(src);
                        const isVid = isVideo(src);
                        const active = idx === currentIndex;
                        return (
                            <button key={idx} onClick={() => { setCurrentIndex(idx); setZoom(1); }} className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-all ${active ? 'ring-2 ring-primary scale-110 shadow-lg' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}>
                                {isPd ? (
                                    <div className="w-full h-full bg-white flex items-center justify-center"><FileText className="w-6 h-6 text-red-500" /></div>
                                ) : isVid ? (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Video className="w-6 h-6 text-white" /></div>
                                ) : (
                                    <img src={cleanR2Url(src)} className="w-full h-full object-cover" alt="" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─── Componente principal ───────────────────────────────── */
export const ComprovanteUpload: React.FC<Props> = ({
    values = [], onChange, label = 'Comprovantes de Pagamento', readOnly = false, orderId, capture
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    const processFiles = useCallback(async (files: FileList | File[]) => {
        setUploading(true);
        const newUrls: string[] = [];

        try {
            for (const file of Array.from(files)) {
                // Checa se o tipo do arquivo está na lista de aceitos, ou se é um vídeo genérico que o SO mascarou
                if (!ACCEPTED.includes(file.type) && !file.type.startsWith('video/')) {
                    toast.error(`Arquivo ${file.name} ignorado. Formato não suportado.`);
                    continue;
                }

                console.log(`[Upload-R2] Processando: ${file.name} (${file.type})`);
                
                // 1. Comprime a imagem (se for imagem)
                const processedFile = await compressImage(file);
                
                // 2. Faz o upload para o Cloudflare R2
                const path = generateR2Path(processedFile, orderId);
                const publicUrl = await uploadToR2(processedFile, path);
                
                if (publicUrl) {
                    newUrls.push(publicUrl);
                }
            }

            if (newUrls.length > 0) {
                const combined = [...values, ...newUrls];
                const unique = combined.filter((v, i) => combined.indexOf(v) === i);
                onChange(unique);
                toast.success(`${newUrls.length} comprovante(s) subiram voando! 🚀`);
            }
        } catch (err: any) {
            console.error('[Upload-R2] ❌ Erro Crítico:', err);
            const msg = err?.message || 'Erro desconhecido no R2. Veja o Console (F12).';
            toast.error(`Falha no R2: ${msg}`);
        } finally {
            setUploading(false);
        }
    }, [onChange, values]);

    const removeValue = (index: number) => {
        const next = [...values];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {previewIndex !== null && <PreviewModal allMedia={values} initialIndex={previewIndex} onClose={() => setPreviewIndex(null)} />}

            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>{label} ({values.length})</span>
                {uploading && <span className="text-primary animate-pulse flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Enviando...</span>}
            </label>

            {/* Listagem */}
            {values.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {values.map((v, idx) => {
                        const pdf = isPdf(v);
                        return (
                            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-border/50 shadow-sm group transition-all hover:border-primary/30">
                                <div
                                    className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-inner"
                                    onClick={() => setPreviewIndex(idx)}
                                >
                                    {pdf
                                        ? <FileText className="w-6 h-6 text-primary" />
                                        : isVideo(v)
                                            ? <Video className="w-6 h-6 text-primary" />
                                            : <img src={cleanR2Url(v)} className="w-full h-full object-cover" alt="" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tighter">Comprovante #{idx + 1}</p>
                                    <button type="button" onClick={() => setPreviewIndex(idx)} className="text-[9px] text-primary font-bold uppercase hover:underline">Ver arquivo</button>
                                </div>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => removeValue(idx)}
                                        className="w-8 h-8 rounded-xl bg-destructive/5 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dropzone com suporte a Arrastar e Soltar 🚀 */}
            {!readOnly && (
                <div
                    onClick={() => !uploading && inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!uploading) e.currentTarget.classList.add('border-primary', 'bg-primary/5');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                        if (!uploading && e.dataTransfer.files) {
                            processFiles(e.dataTransfer.files);
                        }
                    }}
                    className={`
                        relative group flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] border-2 border-dashed
                        transition-all duration-300 select-none text-center
                        ${uploading ? 'opacity-50 cursor-not-allowed border-muted bg-muted/20' : 'cursor-pointer border-border/60 bg-slate-50 hover:border-primary/40 hover:bg-primary/[0.02]'}
                    `}
                >
                    <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden" capture={capture}
                        onChange={e => { if (e.target.files) processFiles(e.target.files); }} disabled={uploading} />
                    
                    <div className={`h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all shadow-sm`}>
                        {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                    </div>
                    
                    <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">
                            {uploading ? 'Enviando arquivos...' : 'Adicionar Comprovantes'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Ou arraste e solte o arquivo aqui (Imagens, PDF ou Vídeos)</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprovanteUpload;
