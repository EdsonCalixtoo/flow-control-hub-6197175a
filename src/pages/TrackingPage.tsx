import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Package, Truck, Clock, CheckCircle2, Factory,
    Search, Calendar, CreditCard, ShoppingBag
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
            subtotal: Number(data.subtotal || 0),
            taxes: Number(data.taxes || 0),
            total: Number(data.total || 0),
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

// ── Definição dos Passos do Fluxo (Conforme solicitado pelo usuário) ──────────
const STEPS = [
    { key: 'orcamento', label: 'Orçamento Criado', icon: ShoppingBag },
    { key: 'aguardando_financeiro', label: 'Aguardando Financeiro', icon: Clock },
    { key: 'processamento_financeiro', label: 'Processamento Financeiro', icon: CreditCard },
    { key: 'producao', label: 'Em Produção', icon: Factory },
    { key: 'expedicao', label: 'Aguardando entregador', icon: Truck },
    { key: 'finalizado', label: 'Pedido retirado pelo entregador', icon: CheckCircle2 },
];

const TrackingPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    // ── Lógica de Sincronização e Realtime ──
    const loadOrder = async (isSilent = false) => {
        if (!orderId) return;
        if (!isSilent) setLoading(true);
        const data = await fetchOrderByIdPublic(orderId);
        if (data) setOrder(data);
        setLoading(false);
    };

    useEffect(() => {
        loadOrder();

        // 📡 CONFIGURAÇÃO REALTIME: Ouve mudanças apenas para ESTE pedido específico
        if (orderId) {
            console.log('[Tracking] 🛰️ Ativando Realtime para pedido:', orderId);
            const channel = supabasePublic
                .channel(`public_track_${orderId}`)
                .on(
                    'postgres_changes',
                    { 
                        event: 'UPDATE', 
                        table: 'orders', 
                        schema: 'public',
                        filter: `id=eq.${orderId}`
                    },
                    (payload) => {
                        console.log('[Tracking] 🔔 Atualização instantânea recebida no Cliente!');
                        loadOrder(true); // Atualização silenciosa para não mostrar loading toda hora
                    }
                )
                .subscribe();

            return () => {
                supabasePublic.removeChannel(channel);
            };
        }
    }, [orderId]);

    // ── Função de Mapeamento de Status para Step State ──
    const getStepState = (stepKey: string, currentStatus: OrderStatus): 'completed' | 'current' | 'pending' => {
        // Mapeia o progresso do pedido em níveis (0 a 5)
        const statusMap: Record<string, number> = {
            'rascunho': 0,
            'aguardando_financeiro': 1,
            'rejeitado_financeiro': 1, // Se rejected, stay on level 1
            'aprovado_financeiro': 2,
            'aguardando_producao': 2,
            'em_producao': 3,
            'producao_finalizada': 4,
            'produto_liberado': 4,
            'pronto_para_retirada': 4,
            'retirado_entregador': 5,
        };

        const currentLevel = statusMap[currentStatus] || 0;
        const stepLevel = STEPS.findIndex(s => s.key === stepKey);

        if (stepLevel < currentLevel) return 'completed';
        if (stepLevel === currentLevel) {
            // Orçamento criado (nível 0) sempre concluído por regra do usuário
            if (currentLevel === 0 && stepKey === 'orcamento') return 'completed';
            if (currentLevel === 0 && stepKey === 'aguardando_financeiro') return 'pending';
            
            // Se for o estágio final e status está correto, é concluído
            if (currentLevel === 5 && stepKey === 'finalizado') return 'completed';

            return 'current';
        }
        return 'pending';
    };

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
                <a
                    href="https://wa.me/5562999999999?text=Olá, preciso de ajuda com meu link de rastreio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 px-6 py-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
                >
                    Falar com Suporte
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header / Nav */}
            <div className="bg-white border-b border-slate-200/60 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-black text-slate-800 tracking-tight">Rastreio de Pedido</span>
                    </div>
                    <StatusBadge status={order.status} />
                </div>
            </div>

            <main className="max-w-2xl mx-auto p-6 space-y-6">
                {/* Resumo Card */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ID do Pedido</p>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">#{order.number}</h2>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-2 pr-4 rounded-2xl border border-slate-100">
                             <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                <Calendar className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Previsão</p>
                                <span className="text-sm font-black text-slate-800">{order.deliveryDate ? formatDate(order.deliveryDate) : 'A definir'}</span>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-slate-100">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cliente</span>
                            <span className="text-sm font-black text-slate-800 line-clamp-1">{order.clientName}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Vendedor</span>
                            <span className="text-sm font-black text-slate-800 uppercase line-clamp-1">{order.sellerName}</span>
                        </div>
                    </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-8">
                        <Clock className="w-4 h-4 text-primary" />
                        Status do Pedido
                    </h3>

                    <div className="relative space-y-0 pl-1">
                        {/* Linha da Timeline */}
                        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-100" />

                        {STEPS.map((step, idx) => {
                            const state = getStepState(step.key, order.status);
                            const Icon = step.icon;
                            
                            return (
                                <div key={step.key} className="relative flex items-start gap-4 pb-8 last:pb-0 group">
                                    {/* Link de preenchimento para itens concluídos */}
                                    {idx < STEPS.length - 1 && state === 'completed' && (
                                        <div className="absolute left-[18px] top-6 bottom-0 w-0.5 bg-emerald-500 z-10 animate-in slide-in-from-top-4 duration-1000" />
                                    )}

                                    <div className={`
                                        z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2
                                        ${state === 'completed' ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 
                                          state === 'current' ? 'bg-white border-primary shadow-lg shadow-primary/20 scale-110' : 
                                          'bg-white border-slate-100'}
                                    `}>
                                        {state === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        ) : (
                                            <div className="relative flex items-center justify-center">
                                                {state === 'current' && (
                                                    <span className="absolute inset-0 w-full h-full bg-primary/10 rounded-full animate-ping" />
                                                )}
                                                <Icon className={`w-5 h-5 ${state === 'current' ? 'text-primary animate-pulse' : 'text-slate-300'}`} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <h4 className={`text-sm font-black tracking-tight ${state === 'pending' ? 'text-slate-300' : 'text-slate-800'}`}>
                                            {step.label}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {state === 'completed' ? (
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Concluído</p>
                                            ) : state === 'current' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Em andamento...</p>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Pendente</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Resumo Itens */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm overflow-hidden">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        Resumo dos itens
                    </h3>
                    
                    <div className="space-y-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="max-w-[150px] md:max-w-xs">
                                        <p className="text-sm font-black text-slate-800 line-clamp-1">{item.product}</p>
                                        <p className="text-[10px] text-slate-400 leading-none mt-1 line-clamp-1">{item.description}</p>
                                    </div>
                                </div>
                                <span className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 text-xs font-black text-slate-800 shadow-sm">
                                    {item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Suporte Footer */}
                <div className="text-center pt-4 pb-12">
                     <p className="text-[11px] text-slate-400 font-medium">Alguma dúvida? Estamos aqui para ajudar.</p>
                     <div className="flex justify-center gap-4 mt-4">
                        <a href={`https://wa.me/5562999999999?text=Olá, preciso de informações sobre o pedido ${order.number}`} target="_blank" className="text-[11px] font-bold text-primary hover:underline">Falar com Consultor</a>
                        <span className="text-slate-200">•</span>
                        <a href="https://automatiza.com.br" target="_blank" className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors">Automatiza.com.br</a>
                     </div>
                </div>
            </main>
        </div>
    );
};

export default TrackingPage;
