/**
 * ComprovanteUpload.tsx — Versão Storage 🚀
 * Envia arquivos para o Supabase Storage em vez de salvar Base64 no banco.
 * Inclui compressão de imagem no cliente para salvar mais banda.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadToR2, generateR2Path, cleanR2Url } from '@/lib/storageServiceR2';
import { toast } from 'sonner';

interface Props {
    values?: string[];
    onChange: (values: string[]) => void;
    label?: string;
    readOnly?: boolean;
    orderId?: string;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

/* ─── Helper: Compressão de Imagem ─────────────────────── */
const compressImage = async (file: File): Promise<Blob | File> => {
    if (file.type === 'application/pdf') return file;

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

/* ─── Modal de visualização ─────────────────────────────── */
const PreviewModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    const [zoom, setZoom] = useState(1);
    const pdf = isPdf(src);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm" onClick={onClose}>
            <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-white/70 text-sm font-semibold">Visualizar Comprovante</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.open(src, '_blank')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Abrir Original
                    </button>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-destructive/60 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex items-start justify-center p-6" onClick={e => e.stopPropagation()}>
                {pdf ? (
                    <iframe src={src} title="Comprovante PDF" className="w-full h-full rounded-xl bg-white" />
                ) : (
                    <img src={cleanR2Url(src)} alt="Comprovante" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%', borderRadius: 12 }} />
                )/*  */}
            </div>
        </div>
    );
};

/* ─── Componente principal ───────────────────────────────── */
export const ComprovanteUpload: React.FC<Props> = ({
    values = [], onChange, label = 'Comprovantes de Pagamento', readOnly = false, orderId,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const processFiles = useCallback(async (files: FileList | File[]) => {
        setUploading(true);
        const newUrls: string[] = [];

        try {
            for (const file of Array.from(files)) {
                if (!ACCEPTED.includes(file.type)) {
                    toast.error(`Arquivo ${file.name} ignorado. Use JPG, PNG ou PDF.`);
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
            {previewSrc && <PreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} />}

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
                                    onClick={() => setPreviewSrc(v)}
                                >
                                    {pdf
                                        ? <FileText className="w-6 h-6 text-primary" />
                                        : <img src={cleanR2Url(v)} className="w-full h-full object-cover" alt="" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-foreground truncate uppercase tracking-tighter">Comprovante #{idx + 1}</p>
                                    <button type="button" onClick={() => setPreviewSrc(v)} className="text-[9px] text-primary font-bold uppercase hover:underline">Ver arquivo</button>
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
                    <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden"
                        onChange={e => { if (e.target.files) processFiles(e.target.files); }} disabled={uploading} />
                    
                    <div className={`h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all shadow-sm`}>
                        {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                    </div>
                    
                    <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">
                            {uploading ? 'Enviando arquivos...' : 'Adicionar Comprovantes'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Ou arraste e solte o arquivo aqui (Imagens ou PDF)</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprovanteUpload;
