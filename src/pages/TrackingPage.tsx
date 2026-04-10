import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Package, Truck, Clock, CheckCircle2, Factory,
    Search, ShieldCheck, ChevronRight, MapPin,
    Calendar, CreditCard, ShoppingBag
} from 'lucide-react';
import { StatusBadge, formatDate } from '@/components/shared/StatusBadge';
import { supabasePublic } from '@/lib/supabasePublic';
import type { Order, OrderStatus } from '@/types/erp';

// ── Busca pública do pedido (sem autenticação) ──────────────────────────────
const fetchOrderByIdPublic = async (orderId: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabasePublic
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();

        if (error) {
            console.error('[Tracking] Erro ao buscar pedido:', error.message);
            return null;
        }
        if (!data) return null;

        return {
            id: data.id,
            number: data.number,
            clientId: data.client_id,
            clientName: data.client_name,
            sellerId: data.seller_id,
            sellerName: data.seller_name,
            subtotal: Number(data.subtotal),
            taxes: Number(data.taxes),
            total: Number(data.total),
            status: data.status as OrderStatus,
            notes: data.notes || '',
            observation: data.observation || '',
            deliveryDate: data.delivery_date || undefined,
            orderType: data.order_type || 'entrega',
            receiptUrl: data.receipt_url || undefined,
            receiptUrls: data.receipt_urls || (data.receipt_url ? [data.receipt_url] : []),
            items: data.items || [],
            statusHistory: data.status_history || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (err: any) {
        console.error('[Tracking] Erro inesperado:', err.message);
        return null;
    }
};

// ── Componente ──────────────────────────────────────────────────────────────
const TrackingPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    const loadOrder = async () => {
        if (!orderId) return;
        const data = await fetchOrderByIdPublic(orderId);
        if (data) setOrder(data);
        setLoading(false);
    };

    useEffect(() => {
        loadOrder();
        const interval = setInterval(loadOrder, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Sincronizando dados com a fábrica...</p>
            </div>
        );
    }

    // ── Pedido não encontrado ──
    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-6 w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-800">Pedido não encontrado</h1>
                <p className="text-slate-500 max-w-xs mt-2">
                    Verifique se o link está correto ou entre em contato com seu vendedor.
                </p>

                {/* Botão WhatsApp para suporte — NÃO redireciona para o sistema */}
                <a
                    href="https://wa.me/5562999999999?text=Olá, preciso de ajuda com meu link de rastreio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Falar com o vendedor
                </a>

                <p className="mt-4 text-xs text-slate-400">
                    Grupo Automatiza Vans
                </p>
            </div>
        );
    }

    // ── Pipeline de status ──
    const steps = [
        { key: 'rascunho', label: 'Orçamento Criado', icon: ShoppingBag },
        {
            key: ['enviado_financeiro', 'aguardando_aprovacao_financeira', 'financeiro_aprovado'],
            label: 'Processamento Financeiro',
            icon: CreditCard,
        },
        {
            key: ['aguardando_producao', 'em_producao'],
            label: 'Em Produção',
            icon: Factory,
        },
        {
            key: ['producao_finalizada', 'produto_liberado'],
            label: 'Pedido aguardando entregador',
            icon: Package,
        },
        {
            key: 'retirado_entregador',
            label: 'Pedido retirado pelo entregador',
            icon: Truck,
        },
    ];

    const getCurrentStepIndex = () => {
        if (order.status === 'retirado_entregador') return 4;
        if (['producao_finalizada', 'produto_liberado'].includes(order.status)) return 3;
        if (['aguardando_producao', 'em_producao'].includes(order.status)) return 2;
        if (['enviado_financeiro', 'aguardando_aprovacao_financeira', 'financeiro_aprovado'].includes(order.status)) return 1;
        return 0;
    };

    const currentStep = getCurrentStepIndex();

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 leading-tight">AUTOMATIZA VANS</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rastreio de Pedido</p>
                    </div>
                </div>
                <div className="hidden sm:block">
                    <StatusBadge status={order.status} />
                </div>
            </div>

            <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
                {/* Resumo do Pedido */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID do Pedido</p>
                            <h2 className="text-2xl font-black text-slate-800">#{order.number}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Previsão</p>
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold justify-end">
                                <Calendar className="w-4 h-4 text-primary" />
                                {order.deliveryDate
                                    ? formatDate(order.deliveryDate)
                                    : 'A definir'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cliente</span>
                            <p className="font-bold text-slate-800 text-sm">{order.clientName}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendedor</span>
                            <p className="font-bold text-slate-800 text-sm">{order.sellerName}</p>
                        </div>
                    </div>
                </div>

                {/* Pipeline de Status */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-black text-slate-800 mb-8 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Status do Pedido
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
                                            <p className="text-xs text-primary font-bold mt-1 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3 animate-spin" /> Em andamento...
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

                {/* Itens */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Resumo dos Itens</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{item.product}</p>
                                        <p className="text-[10px] text-slate-400">{item.description || '—'}</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
                                    {item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rodapé de ajuda */}
                <div className="text-center space-y-4 pt-4">
                    <p className="text-xs text-slate-400 px-8">
                        Este é um link de rastreio automático. Atualizações ocorrem em tempo real conforme a fábrica processa seu pedido.
                    </p>
                    <div className="p-4 bg-primary/5 rounded-2xl inline-block border border-primary/10">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">Precisa de ajuda com seu pedido?</p>
                        <a
                            href={`https://wa.me/5562999999999?text=Olá, preciso de informações sobre o pedido ${order.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black text-slate-800 flex items-center justify-center gap-2 hover:text-primary transition-colors"
                        >
                            <svg className="w-4 h-4 fill-emerald-500" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Falar com Suporte / Vendedor
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Ícone local ──────────────────────────────────────────────────────────────
const RefreshCw = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);

export default TrackingPage;
