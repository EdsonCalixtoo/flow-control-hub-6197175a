/**
 * ComprovanteUpload.tsx — versão 2
 * Modal em tela cheia (92vh) com zoom, scroll, download.
 * Suporta imagem e PDF.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image, ZoomIn, Download, Maximize2 } from 'lucide-react';

interface Props {
    values?: string[];
    onChange: (values: string[]) => void;
    label?: string;
    readOnly?: boolean;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf';

function fileToBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

const isPdf = (src: string) =>
    src?.startsWith('data:application/pdf') || src?.toLowerCase().includes('.pdf');

/* ─── Modal de visualização ─────────────────────────────── */
const PreviewModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    const [zoom, setZoom] = useState(1);
    const pdf = isPdf(src);

    const download = () => {
        const a = document.createElement('a');
        a.href = src;
        a.download = pdf ? 'comprovante.pdf' : 'comprovante.jpg';
        a.click();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 shrink-0"
                onClick={e => e.stopPropagation()}
            >
                <span className="text-white/70 text-sm font-semibold">Comprovante</span>
                <div className="flex items-center gap-2">
                    {!pdf && (
                        <>
                            <button
                                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xs font-bold"
                            >−</button>
                            <span className="text-white/60 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <button
                                onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                                className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xs font-bold"
                            >+</button>
                            <button
                                onClick={() => setZoom(1)}
                                className="px-2 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-xs"
                            >Reset</button>
                        </>
                    )}
                    <button
                        onClick={download}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-destructive/60 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                className="flex-1 overflow-auto flex items-start justify-center p-6"
                onClick={e => e.stopPropagation()}
                style={{ cursor: pdf ? 'default' : 'zoom-in' }}
                onDoubleClick={() => !pdf && setZoom(z => z === 1 ? 2 : 1)}
            >
                {pdf ? (
                    <iframe
                        src={src}
                        title="Comprovante PDF"
                        className="w-full rounded-xl shadow-2xl"
                        style={{ height: 'calc(92vh - 60px)', minHeight: 400 }}
                    />
                ) : (
                    <img
                        src={src}
                        alt="Comprovante"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: 'transform 0.15s ease',
                            maxWidth: '100%',
                            borderRadius: 12,
                            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                            display: 'block',
                        }}
                        draggable={false}
                    />
                )}
            </div>
            <p className="text-white/30 text-[10px] text-center pb-2 shrink-0">
                {pdf ? 'PDF — use os controles do visualizador' : 'Clique duplo para 2× | Botões para zoom'}
            </p>
        </div>
    );
};

/* ─── Componente principal ───────────────────────────────── */
export const ComprovanteUpload: React.FC<Props> = ({
    values = [], onChange, label = 'Comprovantes de Pagamento', readOnly = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [err, setErr] = useState('');

    const processFiles = useCallback(async (files: FileList | File[]) => {
        setErr('');
        const newBase64s: string[] = [];

        for (const file of Array.from(files)) {
            if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
                setErr('Alguns arquivos foram ignorados. Use JPG, PNG, WEBP ou PDF.');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                setErr('Arquivos maiores que 10MB foram ignorados.');
                continue;
            }
            newBase64s.push(await fileToBase64(file));
        }

        onChange([...values, ...newBase64s]);
    }, [onChange, values]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const removeValue = (index: number) => {
        const next = [...values];
        next.splice(index, 1);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {previewSrc && <PreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} />}

            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                {label} ({values.length})
            </label>

            {/* Listagem */}
            {values.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {values.map((v, idx) => {
                        const pdf = isPdf(v);
                        return (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-success/5 border border-success/20 overflow-hidden">
                                <div
                                    className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() => setPreviewSrc(v)}
                                >
                                    {pdf
                                        ? <FileText className="w-5 h-5 text-success" />
                                        : <img src={v} className="w-full h-full object-cover" alt="" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-success truncate">Comprovante #{idx + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewSrc(v)}
                                        className="text-[9px] text-primary font-bold uppercase hover:underline"
                                    > Visualizar </button>
                                </div>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => removeValue(idx)}
                                        className="w-6 h-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dropzone (apenas se não for readOnly) */}
            {!readOnly && (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`
                        relative group flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed
                        cursor-pointer transition-all duration-300 select-none text-center
                        ${dragging
                            ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl shadow-primary/10'
                            : 'border-border/60 bg-slate-50 dark:bg-slate-900/40 hover:border-primary/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                        }
                    `}
                >
                    <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden"
                        onChange={e => { if (e.target.files) processFiles(e.target.files); }} />
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                        <Upload className={`w-6 h-6 ${dragging ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">{dragging ? 'Solte para adicionar' : 'Adicionar Comprovantes'}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Clique ou arraste arquivos (Imagens ou PDF)</p>
                    </div>
                </div>
            )}

            {err && <p className="text-[10px] text-destructive mt-1">⚠ {err}</p>}
        </div>
    );
};

export default ComprovanteUpload;
