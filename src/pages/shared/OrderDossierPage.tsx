import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Calendar, User, Truck, Receipt, CheckCircle, Package, Clock, ShieldCheck, MapPin, Search } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DossierData {
    order: any;
    pickup: any;
    loading: boolean;
    error: string | null;
}

const OrderDossierPage: React.FC = () => {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const navigate = useNavigate();
    
    const [dossier, setDossier] = useState<DossierData>({
        order: null,
        pickup: null,
        loading: true,
        error: null,
    });
    
    const [activeTab, setActiveTab] = useState<'timeline' | 'financeiro' | 'provas' | 'logistica'>('timeline');

    useEffect(() => {
        const fetchDossier = async () => {
            if (!orderNumber) return;
            setDossier(prev => ({ ...prev, loading: true, error: null }));
            try {
                const searchNum = orderNumber.startsWith('PED-') ? orderNumber.replace('PED-', '') : orderNumber;
                
                // Fetch Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .or(`number.eq.${orderNumber},number.eq.${searchNum}`)
                    .single();
                
                if (orderError) throw orderError;
                
                // Fetch Pickup if exists
                let pickupData = null;
                if (orderData) {
                    const { data: pData } = await supabase
                        .from('delivery_pickups')
                        .select('*')
                        .eq('order_id', orderData.id)
                        .maybeSingle();
                    pickupData = pData;
                }
                
                setDossier({
                    order: orderData,
                    pickup: pickupData,
                    loading: false,
                    error: null
                });
            } catch (err: any) {
                console.error("Erro ao carregar dossiê:", err);
                setDossier(prev => ({ ...prev, loading: false, error: err.message || 'Erro ao carregar dados' }));
            }
        };
        fetchDossier();
    }, [orderNumber]);

    if (dossier.loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="font-bold tracking-widest uppercase text-slate-500">Montando Dossiê...</p>
            </div>
        );
    }

    if (dossier.error || !dossier.order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <p className="text-xl font-black mb-6 uppercase text-slate-800 text-center">Pedido {orderNumber} não encontrado</p>
                <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white shadow-sm border border-slate-200 hover:bg-slate-100 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2 transition-colors text-slate-700">
                    <ArrowLeft className="w-5 h-5" /> Voltar
                </button>
            </div>
        );
    }

    const { order, pickup } = dossier;
    const history = order.status_history || [];

    const tabs = [
        { id: 'timeline', label: 'Linha do Tempo', icon: Clock },
        { id: 'financeiro', label: 'Orçamento', icon: Receipt },
        { id: 'provas', label: 'Provas', icon: ShieldCheck },
        { id: 'logistica', label: 'Logística', icon: Truck },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 py-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg sm:text-2xl font-black text-slate-900 truncate uppercase">
                                    {order.number}
                                </h1>
                                <StatusBadge status={order.status} />
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {order.client_name || 'Desconhecido'}</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(order.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex overflow-x-auto hide-scrollbar border-t border-slate-100">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'timeline' && (
                    <div className="max-w-3xl mx-auto space-y-8">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Histórico de Alterações</h2>
                        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-10">
                            {history.slice().reverse().map((entry: any, idx: number) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[35px] sm:-left-[41px] w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm" />
                                    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                                            <StatusBadge status={entry.status} />
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        {entry.notes && (
                                            <p className="text-sm text-slate-600 font-medium mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">{entry.notes}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                            <User className="w-3.5 h-3.5" />
                                            <span className="bg-slate-100 px-2 py-1 rounded-md">{entry.user || 'Sistema'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Criado */}
                            <div className="relative">
                                <div className="absolute -left-[35px] sm:-left-[41px] w-5 h-5 rounded-full bg-slate-200 border-4 border-slate-300" />
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-2">
                                    Pedido Criado em {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financeiro' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Itens do Pedido
                            </h2>
                            <div className="space-y-3">
                                {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase">{item.name}</p>
                                            <p className="text-xs font-semibold text-slate-500">QTD: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-black text-slate-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-2">
                                <div className="flex justify-between text-sm font-bold text-slate-500 uppercase">
                                    <span>Subtotal</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.subtotal || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-red-500 uppercase">
                                    <span>Desconto</span>
                                    <span>-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.discount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-orange-500 uppercase">
                                    <span>Taxas / Extras</span>
                                    <span>+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.taxes || 0)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-slate-900 mt-2 pt-2 border-t border-slate-100 uppercase">
                                    <span>Total Final</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'provas' && (
                    <div className="max-w-4xl mx-auto flex flex-col items-center">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 w-full text-center">
                            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4 opacity-20" />
                            <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 mb-2">Provas de Produção</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">Mídias enviadas pela equipe de produção</p>
                            
                            {order.production_media && order.production_media.length > 0 ? (
                                <button 
                                    onClick={() => window.open(`/provas/${order.number}`, '_blank')}
                                    className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mx-auto"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                    Visualizar {order.production_media.length} Provas
                                </button>
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 font-bold uppercase text-sm">
                                    Nenhuma prova anexada a este pedido.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'logistica' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Dados de Entrega
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transportadora Definida</p>
                                    <p className="text-sm font-bold text-slate-800 uppercase bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 inline-block">
                                        {order.carrier || 'Padrão / Não Informada'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Qtd. Volumes</p>
                                    <p className="text-sm font-bold text-slate-800 uppercase bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 inline-block">
                                        {order.volumes || 1} Volume(s)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {pickup ? (
                            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
                                <h2 className="text-sm font-black uppercase tracking-widest text-green-600 mb-6 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Confirmação de Retirada
                                </h2>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 bg-green-50/50 p-4 rounded-xl border border-green-100">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-0.5">Retirado Por</p>
                                            <p className="text-sm font-black text-green-800 uppercase">{pickup.deliverer_name}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Foto Facial</p>
                                            <div className="aspect-square sm:aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                                                {pickup.photo_url ? (
                                                    <img src={pickup.photo_url} alt="Foto Entregador" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><User className="w-10 h-10"/></div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assinatura</p>
                                            <div className="aspect-square sm:aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-white p-4 flex items-center justify-center">
                                                {pickup.signature_url ? (
                                                    <img src={pickup.signature_url} alt="Assinatura" className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <div className="text-slate-300">Sem assinatura</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-200 border-dashed text-center">
                                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-500 uppercase">O pedido ainda não foi retirado</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderDossierPage;
