import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    ShieldCheck, Clock, CheckCircle2, Factory,
    Search, ChevronRight, Package, Truck,
    AlertTriangle, Calendar, User, Info
} from 'lucide-react';
import { supabasePublic } from '@/lib/supabasePublic';
import type { Warranty, WarrantyStatus, Order, OrderStatus } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

// ── Busca pública da garantia (sem autenticação) ──────────────────────────────
const fetchWarrantyByIdPublic = async (warrantyId: string): Promise<Warranty | null> => {
    try {
        const { data, error } = await supabasePublic
            .from('warranties')
            .select('*')
            .eq('id', warrantyId)
            .maybeSingle();

        if (error) {
            console.error('[WarrantyTracking] Erro ao buscar:', error.message);
            return null;
        }
        if (!data) return null;

        return {
            id: data.id,
            orderId: data.order_id,
            orderNumber: data.order_number,
            clientId: data.client_id,
            clientName: data.client_name,
            sellerId: data.seller_id,
            sellerName: data.seller_name,
            product: data.product,
            description: data.description,
            status: data.status as WarrantyStatus,
            receiptUrls: data.receipt_urls || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            resolution: data.resolution || undefined,
            carrier: data.carrier || undefined,
            history: data.history || [],
        };
    } catch (err: any) {
        console.error('[WarrantyTracking] Erro inesperado:', err.message);
        return null;
    }
};

const WarrantyTrackingPage: React.FC = () => {
    const { warrantyId } = useParams<{ warrantyId: string }>();
    const [warranty, setWarranty] = useState<Warranty | null>(null);
    const [linkedOrder, setLinkedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    const loadWarranty = async () => {
        if (!warrantyId) return;
        const data = await fetchWarrantyByIdPublic(warrantyId);
        if (data) {
            setWarranty(data);
            if (data.orderId) {
                // Busca o status real do pedido de produção
                const { data: orderData } = await supabasePublic
                    .from('orders')
                    .select('status')
                    .eq('id', data.orderId)
                    .maybeSingle();
                
                if (orderData) {
                    setLinkedOrder(orderData as any);
                }
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadWarranty();
        const interval = setInterval(loadWarranty, 15000);
        return () => clearInterval(interval);
    }, [warrantyId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Sincronizando com a produção...</p>
            </div>
        );
    }

    if (!warranty) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-6 w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-800">Garantia não encontrada</h1>
                <p className="text-slate-500 max-w-xs mt-2">
                    Verifique se o link está correto ou entre em contato com seu vendedor.
                </p>
            </div>
        );
    }

    const steps = [
        { status: 'Garantia criada', label: 'Solicitação Criada', icon: Info },
        { status: 'Garantia aprovada', label: 'Aprovado pelo Gestor', icon: ShieldCheck },
        { status: 'Em produção', label: 'Em Reposição/Produção', icon: Factory },
        { status: 'Garantia finalizada', label: 'Enviado / Finalizado', icon: Truck },
    ];

    const getCurrentStepIndex = () => {
        // Se o pedido vinculado estiver em um status avançado, usamos ele
        if (linkedOrder) {
            if (linkedOrder.status === 'retirado_entregador') return 4;
            if (['producao_finalizada', 'produto_liberado'].includes(linkedOrder.status)) return 3;
            if (['aguardando_producao', 'em_producao'].includes(linkedOrder.status)) return 2;
        }

        if (warranty.status === 'Garantia finalizada') return 4;
        if (warranty.status === 'Em produção') return 2;
        if (warranty.status === 'Garantia aprovada') return 1;
        if (warranty.status === 'Garantia criada') return 0;
        if (warranty.status === 'rejeitado') return -1;
        return 0;
    };

    const currentStep = getCurrentStepIndex();

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-tight">AUTOMATIZA VANS</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assistência Técnica</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">
                    {linkedOrder ? (STATUS_LABELS[linkedOrder.status as OrderStatus] || linkedOrder.status) : warranty.status}
                </div>
            </div>

            <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pedido de Produção</p>
                            <h2 className="text-2xl font-black text-slate-800">#{warranty.orderNumber}</h2>
                                {(() => {
                                    const m = (warranty.description || '').match(/REFERENTE AO ([A-Z0-9-]+)/i);
                                    return m ? (
                                        <p className="text-[10px] text-primary font-black uppercase mt-1 leading-none">
                                            (Garantia do {m[1]})
                                        </p>
                                    ) : null;
                                })()}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abertura</p>
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold justify-end">
                                <Calendar className="w-4 h-4 text-primary" />
                                {warranty.createdAt ? format(new Date(warranty.createdAt), 'dd/MM/yyyy') : '—'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cliente</span>
                            <p className="font-bold text-slate-800 text-sm">{warranty.clientName}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendedor</span>
                            <p className="font-bold text-slate-800 text-sm">{warranty.sellerName}</p>
                        </div>
                    </div>
                </div>

                {warranty.status === 'rejeitado' ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-3">
                        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-black text-destructive">Assistência Não Aprovada</h3>
                        <p className="text-sm text-destructive/80 leading-relaxed font-medium">
                            Infelizmente seu pedido de garantia não pôde ser atendido neste momento.
                        </p>
                        {warranty.resolution && (
                            <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-destructive/10 text-sm text-destructive-foreground italic">
                                "{warranty.resolution}"
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <h3 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Acompanhamento
                        </h3>

                        <div className="relative space-y-8 ml-3">
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />
                            {steps.map((step, idx) => {
                                 const isCompleted = idx < currentStep;
                                 const isCurrent = idx === currentStep;
                                const isFuture = idx > currentStep;
                                const StepIcon = step.icon;

                                return (
                                    <div key={idx} className="flex gap-6 relative">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500
                                            ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                                isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 ring-4 ring-primary/10' :
                                                    'bg-slate-100 text-slate-400 scale-90'}
                                        `}>
                                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                                        </div>
                                        <div className="pt-1">
                                            <h4 className={`text-sm font-black tracking-tight ${isFuture ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {step.label}
                                            </h4>
                                            {isCurrent && (
                                                <p className="text-[10px] text-primary font-bold mt-1 animate-pulse italic">
                                                    Em andamento...
                                                </p>
                                            )}
                                            {isCompleted && (
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Concluído</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" /> Detalhes do Chamado
                    </h3>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed italic">
                        "{warranty.description}"
                    </div>
                    {warranty.carrier && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl text-emerald-700">
                            <Truck className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-tighter">Envio via: {warranty.carrier}</span>
                        </div>
                    )}
                </div>

                <div className="text-center space-y-4 pt-4">
                    <p className="text-xs text-slate-400 px-8">
                        Link de rastreio de assistência técnica oficial Automatiza Vans.
                    </p>
                    <a
                        href={`https://wa.me/5562999999999?text=Olá, sobre minha garantia #${warranty.orderNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        Falar com Suporte
                    </a>
                </div>
            </div>
        </div>
    );
};

export default WarrantyTrackingPage;
