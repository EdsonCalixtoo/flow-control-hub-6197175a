/**
 * ComprovanteUpload.tsx — versão 2
 * Modal em tela cheia (92vh) com zoom, scroll, download.
 * Suporta imagem e PDF.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image, ZoomIn, Download, Maximize2 } from 'lucide-react';

interface Props {
    value?: string;
    onChange: (base64: string) => void;
    label?: string;
    readOnly?: boolean; // desativa o upload, apenas exibe
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
    src.startsWith('data:application/pdf') || src.toLowerCase().includes('.pdf');

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
            {/* Toolbar */}
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

            {/* Viewer */}
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
    value, onChange, label = 'Comprovante de Pagamento', readOnly = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [open, setOpen] = useState(false);
    const [err, setErr] = useState('');

    const processFile = useCallback(async (file: File) => {
        setErr('');
        if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
            setErr('Use JPG, PNG, WEBP ou PDF (máx. 10 MB).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) { setErr('Arquivo muito grande (máx. 10 MB).'); return; }
        onChange(await fileToBase64(file));
    }, [onChange]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, [processFile]);

    /* ── Exibição quando há comprovante ── */
    if (value) {
        const pdf = isPdf(value);
        return (
            <>
                {open && <PreviewModal src={value} onClose={() => setOpen(false)} />}
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        {label}
                    </label>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
                        {/* Thumbnail */}
                        <div
                            className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => setOpen(true)}
                        >
                            {pdf
                                ? <FileText className="w-7 h-7 text-success" />
                                : <img src={value} className="w-full h-full object-cover" alt="" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-success">✓ Comprovante anexado</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {pdf ? 'Documento PDF' : 'Imagem (JPG/PNG/WEBP)'}
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setOpen(true)}
                                title="Visualizar"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
                            >
                                <Maximize2 className="w-3.5 h-3.5" /> Visualizar
                            </button>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => onChange('')}
                                    title="Remover"
                                    className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (readOnly) return null;

    /* ── Dropzone ── */
    return (
        <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                {label}
            </label>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`
          flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed
          cursor-pointer transition-all duration-200 select-none text-center
          ${dragging
                        ? 'border-primary bg-primary/10 scale-[1.01]'
                        : 'border-border/40 bg-muted/20 hover:border-primary/40 hover:bg-primary/5'
                    }
        `}
            >
                <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-primary/20' : 'bg-muted'}`}>
                    {dragging ? <ZoomIn className="w-5 h-5 text-primary animate-bounce" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">{dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para anexar'}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG, WEBP ou PDF • Máx. 10 MB</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow">
                    <Image className="w-3 h-3" /> Selecionar arquivo
                </span>
            </div>
            {err && <p className="text-[11px] text-destructive mt-1">⚠ {err}</p>}
        </div>
    );
};

export default ComprovanteUpload;
