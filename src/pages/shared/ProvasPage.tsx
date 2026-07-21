import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cleanR2Url } from '@/lib/storageServiceR2';
import { Download, ChevronLeft, ChevronRight, ArrowLeft, FileText, Video, Loader2 } from 'lucide-react';

const isPdf = (src: string) => src?.toLowerCase().includes('.pdf') && !src.startsWith('data:image');
const isVideo = (src: string) => {
    if (!src) return false;
    const lower = src.toLowerCase();
    return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.ogg') || lower.startsWith('data:video');
};

const ProvasPage: React.FC = () => {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const navigate = useNavigate();
    
    const [mediaList, setMediaList] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    
    useEffect(() => {
        const fetchOrderMedia = async () => {
            if (!orderNumber) return;
            setLoading(true);
            try {
                const searchNum = orderNumber.startsWith('PED-') ? orderNumber.replace('PED-', '') : orderNumber;
                
                const { data, error } = await supabase
                    .from('orders')
                    .select('production_media, number')
                    .or(`number.eq.${orderNumber},number.eq.${searchNum}`)
                    .single();
                
                if (error) throw error;
                
                if (data && data.production_media) {
                    const parsedMedia = Array.isArray(data.production_media) 
                        ? data.production_media.map((m: any) => typeof m === 'string' ? m : m.url)
                        : [];
                    setMediaList(parsedMedia);
                } else {
                    setMediaList([]);
                }
            } catch (err) {
                console.error("Erro ao carregar provas:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrderMedia();
    }, [orderNumber]);

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev < mediaList.length - 1 ? prev + 1 : 0));
        setZoom(1);
    }, [mediaList.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : mediaList.length - 1));
        setZoom(1);
    }, [mediaList.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') navigate(-1);
            if (e.key === 'ArrowRight' && mediaList.length > 1) handleNext();
            if (e.key === 'ArrowLeft' && mediaList.length > 1) handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, navigate, mediaList.length]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="font-bold tracking-widest uppercase">Carregando provas...</p>
            </div>
        );
    }

    if (mediaList.length === 0) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
                <p className="text-xl font-black mb-6 uppercase text-center">Nenhuma prova encontrada para {orderNumber}</p>
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Voltar
                </button>
            </div>
        );
    }

    const currentSrc = mediaList[currentIndex];
    const pdf = isPdf(currentSrc);
    const video = isVideo(currentSrc);

    return (
        <div className="min-h-screen bg-black flex flex-col select-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/90 to-transparent shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-white text-lg sm:text-xl font-black uppercase tracking-widest">
                            Provas: {orderNumber}
                        </h1>
                        <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">
                            Arquivo {currentIndex + 1} de {mediaList.length}
                        </p>
                    </div>
                </div>
                
                <button onClick={() => window.open(currentSrc, '_blank')} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-wider hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
                    <Download className="w-5 h-5" /> <span className="hidden sm:inline">Baixar Original</span>
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-12 overflow-hidden z-10">
                {/* Prev */}
                {mediaList.length > 1 && (
                    <button onClick={handlePrev} className="absolute left-2 sm:left-8 z-50 w-14 h-14 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                )}

                {/* Content */}
                <div className="w-full h-full max-w-7xl mx-auto flex items-center justify-center relative">
                    {pdf ? (
                        <iframe src={currentSrc} className="w-full h-full rounded-3xl bg-white shadow-2xl ring-1 ring-white/10" />
                    ) : video ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <video 
                                src={cleanR2Url(currentSrc)} 
                                controls 
                                playsInline
                                className="w-full h-full max-h-[75vh] object-contain rounded-3xl shadow-2xl bg-black/50 ring-1 ring-white/5" 
                                onError={(e) => console.error("Erro ao carregar vídeo:", e)}
                            />
                            <p className="text-white/40 text-[10px] mt-4 uppercase font-bold text-center max-w-md tracking-wider">
                                Se o vídeo não tocar, pode ser um formato não suportado pelo seu navegador. Use o botão de Baixar Original.
                            </p>
                        </div>
                    ) : (
                        <img 
                            src={cleanR2Url(currentSrc)} 
                            alt="Prova de Produção" 
                            className="w-full h-full max-h-[80vh] object-contain rounded-3xl shadow-2xl transition-transform ring-1 ring-white/5 bg-black/50" 
                            style={{ transform: `scale(${zoom})` }} 
                        />
                    )}
                </div>

                {/* Next */}
                {mediaList.length > 1 && (
                    <button onClick={handleNext} className="absolute right-2 sm:right-8 z-50 w-14 h-14 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
                        <ChevronRight className="w-8 h-8" />
                    </button>
                )}
            </div>

            {/* Thumbnails Footer */}
            {mediaList.length > 1 && (
                <div className="h-32 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-3 px-6 overflow-x-auto shrink-0 pb-4 z-50">
                    {mediaList.map((src, idx) => {
                        const isPd = isPdf(src);
                        const isVid = isVideo(src);
                        const active = idx === currentIndex;
                        return (
                            <button 
                                key={idx} 
                                onClick={() => { setCurrentIndex(idx); setZoom(1); }} 
                                className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 transition-all duration-300 ${active ? 'ring-4 ring-primary scale-110 shadow-xl shadow-primary/20' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                            >
                                {isPd ? (
                                    <div className="w-full h-full bg-white flex items-center justify-center"><FileText className="w-8 h-8 text-red-500" /></div>
                                ) : isVid ? (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Video className="w-8 h-8 text-white" /></div>
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

export default ProvasPage;
