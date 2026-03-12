import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, ArrowLeft, Send, CheckCircle, Clock, XCircle, ShieldCheck, ShieldAlert, History as HistoryIcon, User, X, Truck, Share2, Factory, Info } from 'lucide-react';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import type { Warranty, Order, WarrantyStatus } from '@/types/erp';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { addMonths, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type Tab = 'pedidos' | 'solicitacoes';

const GarantiasPage: React.FC = () => {
    const { orders, warranties, addWarranty, deliveryPickups, products } = useERP();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('pedidos');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [description, setDescription] = useState('');
    const [reason, setReason] = useState('');
    const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingWarranty, setViewingWarranty] = useState<Warranty | null>(null);
    const [warrantyItems, setWarrantyItems] = useState<{ product: string; description: string; quantity: number }[]>([]);
    const [carrier, setCarrier] = useState('');

    const isErica = user?.email === 'ericasousa@gmail.com';

    // 1. Permissão especial para Erica ver tudo na aba de Garantia
    const filteredOrders = useMemo(() => {
        let list = isErica ? orders : orders.filter(o => o.sellerId === user?.id);
        if (searchTerm) {
            list = list.filter(o =>
                o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.clientName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    }, [orders, isErica, user, searchTerm]);

    const filteredWarranties = useMemo(() => {
        let list = isErica ? warranties : warranties.filter(w => w.sellerId === user?.id);
        if (searchTerm) {
            list = list.filter(w =>
                w.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.clientName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return list;
    }, [warranties, isErica, user, searchTerm]);

    // 2. Cálculo da Garantia (12 meses após retirada)
    const getWarrantyStatus = (orderId: string) => {
        const pickup = deliveryPickups.find(p => p.orderId === orderId);
        if (!pickup) return { label: 'Sem data de retirada', color: 'text-muted-foreground', isValid: false };

        const pickupDate = new Date(pickup.pickedUpAt);
        const validUntil = addMonths(pickupDate, 12);
        const isValid = isAfter(validUntil, new Date());

        return {
            label: isValid ? `🟢 Em garantia até ${format(validUntil, 'dd/MM/yyyy')}` : `🔴 Fora da garantia (Venceu em ${format(validUntil, 'dd/MM/yyyy')})`,
            color: isValid ? 'text-success font-bold' : 'text-destructive font-bold',
            isValid,
            validUntil: format(validUntil, 'dd/MM/yyyy')
        };
    };

    const handleCreate = async () => {
        console.log('[Garantia] Tentativa de envio:', {
            hasOrder: !!selectedOrder,
            reasonLength: reason.trim().length,
            descriptionLength: description.trim().length
        });

        if (!selectedOrder || !reason.trim() || !description.trim()) {
            console.warn('[Garantia] Validação falhou: Campos obrigatórios vazios');
            toast.warning('Campos Obrigatórios', {
                description: 'Por favor, preencha o Motivo e a Descrição Detalhada.'
            });
            return;
        }

        console.log('[Garantia] Sincronizando com Gestor...', selectedOrder.number);

        try {
            setLoading(true);
            const now = new Date().toISOString();

            await addWarranty({
                orderId: selectedOrder.id,
                orderNumber: selectedOrder.number,
                clientId: selectedOrder.clientId,
                clientName: selectedOrder.clientName,
                sellerId: selectedOrder.sellerId,
                sellerName: selectedOrder.sellerName,
                product: selectedOrder.items[0]?.product || 'Produto não especificado',
                description: `${reason} - ${description}${warrantyItems.length > 0 ? '\n\nITENS EM GARANTIA:\n' + warrantyItems.map(i => `- ${i.product} (Qtd: ${i.quantity}): ${i.description}`).join('\n') : ''}`,
                status: 'Garantia criada' as WarrantyStatus,
                receiptUrls,
                carrier,
                history: [{
                    status: 'Garantia criada' as WarrantyStatus,
                    timestamp: now,
                    user: user?.name || 'Vendedor',
                    note: 'Garantia aberta por Erica'
                }]
            });

            setShowCreate(false);
            setSelectedOrder(null);
            setDescription('');
            setReason('');
            setReceiptUrls([]);
            setWarrantyItems([]);
            setCarrier('');
            toast.success('Garantia criada com sucesso!', {
                description: 'A solicitação foi enviada para análise do gestor.'
            });
        } catch (err: any) {
            console.error('[Garantia] Erro ao criar:', err);
            toast.error('Erro ao criar garantia', {
                description: err.message || 'Tente novamente depois'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTracking = (warrantyId: string) => {
        const link = `${window.location.origin}/rastreio/garantia/${warrantyId}`;
        navigator.clipboard.writeText(link);
        toast.info('Link de rastreio copiado!', {
            description: 'Envie este link para o cliente acompanhar.'
        });
    };

    if (showCreate) {
        return (
            <div className="space-y-6 animate-scale-in max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-header">Nova Garantia</h1>
                        <p className="page-subtitle">Formulário de registro de assistência técnica</p>
                    </div>
                    <button onClick={() => setShowCreate(false)} className="btn-modern bg-muted text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Cancelar
                    </button>
                </div>

                <div className="card-section p-8 space-y-6">
                    {selectedOrder && (
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase">Pedido</p>
                                <p className="text-sm font-black">{selectedOrder.number}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase">Cliente</p>
                                <p className="text-sm font-black">{selectedOrder.clientName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase">Vendedor</p>
                                <p className="text-sm font-black">{selectedOrder.sellerName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase">Produto Base</p>
                                <p className="text-sm font-black">{selectedOrder.items[0]?.product || '---'}</p>
                            </div>
                        </div>
                    )}

                    {/* CAMPOS OBRIGATÓRIOS NO TOPO PARA FACILITAR */}
                    <div className="space-y-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                                Motivo da Garantia <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                className="input-modern bg-white"
                                placeholder="Ex: Produto com defeito, Peça faltante..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                                Descrição Detalhada do Problema <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                className="input-modern min-h-[100px] bg-white"
                                placeholder="Relate o que o cliente informou..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* SELEÇÃO E EDIÇÃO DE PEÇAS / ITENS EM GARANTIA */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                📦 Itens / Peças para Garantia
                            </label>
                            <button
                                onClick={() => setWarrantyItems([...warrantyItems, { product: '', description: '', quantity: 1 }])}
                                className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Adicionar Peça
                            </button>
                        </div>

                        <div className="space-y-3">
                            {warrantyItems.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3 relative group">
                                    <button
                                        onClick={() => setWarrantyItems(warrantyItems.filter((_, i) => i !== idx))}
                                        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-8">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">Produto / Peça</label>
                                            <select
                                                value={item.product}
                                                onChange={(e) => {
                                                    const newItems = [...warrantyItems];
                                                    const prod = products.find(p => p.name === e.target.value);
                                                    newItems[idx] = {
                                                        ...newItems[idx],
                                                        product: e.target.value,
                                                        description: prod?.description || newItems[idx].description
                                                    };
                                                    setWarrantyItems(newItems);
                                                }}
                                                className="input-modern min-h-[48px] py-1 px-3 text-xs w-full bg-white shadow-sm font-medium text-foreground border-border/60"
                                            >
                                                <option value="">Selecione a peça...</option>
                                                {products.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-4">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">Qtd</label>
                                            <input
                                                type="number"
                                                className="input-modern min-h-[46px] text-xs font-bold text-center"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...warrantyItems];
                                                    newItems[idx].quantity = Number(e.target.value);
                                                    setWarrantyItems(newItems);
                                                }}
                                                min={1}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-muted-foreground uppercase block">Defeito Específico desta Peça</label>
                                        <textarea
                                            className="input-modern text-xs min-h-[60px]"
                                            placeholder="Ex: Sensor não liga, Chicote cortado..."
                                            value={item.description}
                                            onChange={(e) => {
                                                const newItems = [...warrantyItems];
                                                newItems[idx].description = e.target.value;
                                                setWarrantyItems(newItems);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {warrantyItems.length === 0 && (
                                <p className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                                    Nenhuma peça selecionada. Clique em "Adicionar Peça".
                                </p>
                            )}
                        </div>
                    </div>

                    {/* MEIO DE ENTREGA (TRANSPORTADORA) */}
                    <div className="space-y-3 p-5 rounded-2xl bg-primary/5 border border-primary/20 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <Truck className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-foreground uppercase tracking-tight">Meio de Entrega da Garantia</h3>
                                <p className="text-[10px] text-muted-foreground font-bold italic">Como enviaremos a reposição?</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {['JADLOG', 'MOTOBOY', 'CLEYTON', 'LALAMOVE'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCarrier(prev => prev === c ? '' : c)}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${carrier === c
                                        ? 'bg-primary/10 border-primary text-primary scale-[1.02] shadow-sm font-bold ring-2 ring-primary/20'
                                        : 'bg-muted/30 border-transparent text-muted-foreground grayscale hover:grayscale-0 hover:bg-muted/50'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{c}</span>
                                    {carrier === c && <CheckCircle className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload de Foto (Opcional)</label>
                            <ComprovanteUpload
                                values={receiptUrls}
                                onChange={setReceiptUrls}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            console.log('[Garantia] Clique no botão Enviar detectado');
                            handleCreate();
                        }}
                        disabled={loading}
                        className={`btn-primary w-full h-12 justify-center font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                    >
                        <Send className="w-4 h-4" /> {loading ? 'Sincronizando...' : 'Enviar para Gestor'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative min-h-[600px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header">Central de Garantias</h1>
                    <p className="page-subtitle">Gestão de assistência técnica e validade</p>
                </div>
                {isErica && (
                    <div className="p-2 px-4 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase flex items-center gap-2">
                        <User className="w-3 h-3" /> Administração Erica
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border/40 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('pedidos')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'pedidos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    🔍 Consultar Pedidos
                </button>
                <button
                    onClick={() => setActiveTab('solicitacoes')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'solicitacoes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    📋 {isErica ? 'Todas as Garantias' : 'Minhas Solicitações'}
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por número do pedido ou cliente..."
                    className="input-modern pl-10 h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {activeTab === 'pedidos' ? (
                <div className="card-section overflow-hidden">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Cliente</th>
                                {isErica && <th>Vendedor</th>}
                                <th>Status da Garantia</th>
                                <th className="text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={isErica ? 5 : 4} className="py-20 text-center text-muted-foreground font-medium">Nenhum pedido encontrado</td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => {
                                    const g = getWarrantyStatus(order.id);
                                    return (
                                        <tr key={order.id}>
                                            <td className="font-bold text-foreground text-sm">{order.number}</td>
                                            <td className="text-sm font-medium">{order.clientName}</td>
                                            {isErica && <td className="text-[10px] font-bold text-muted-foreground">{order.sellerName}</td>}
                                            <td className={`text-xs ${g.color}`}>{g.label}</td>
                                            <td className="text-right">
                                                {isErica ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setWarrantyItems(order.items.map(i => ({
                                                                product: i.product,
                                                                description: i.description || '',
                                                                quantity: i.quantity
                                                            })));
                                                            setShowCreate(true);
                                                        }}
                                                        className="btn-modern bg-primary/10 text-primary hover:bg-primary/20 p-2 text-[10px] font-black uppercase"
                                                    >
                                                        Criar Garantia
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Acesso Restrito</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredWarranties.length === 0 ? (
                        <div className="card-section p-20 text-center text-muted-foreground font-medium">
                            Nenhuma solicitação de garantia encontrada.
                        </div>
                    ) : (
                        filteredWarranties.map(w => (
                            <div key={w.id} className="card-section p-5 group hover:border-primary/30 transition-all">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-foreground">{w.orderNumber}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 bg-muted rounded-full">
                                                {w.status}
                                            </span>
                                            {w.history && w.history.length > 0 && (
                                                <HistoryIcon className="w-3.5 h-3.5 text-primary opacity-40" />
                                            )}
                                        </div>
                                        <p className="text-sm font-bold text-foreground">{w.clientName}</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{w.description}"</p>
                                        {isErica && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <User className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{w.sellerName || '---'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {format(new Date(w.createdAt), "dd 'de' MMM", { locale: ptBR })}
                                        </p>
                                        <button
                                            onClick={() => setViewingWarranty(w)}
                                            className="btn-modern bg-muted text-foreground p-2 text-[10px] font-bold hover:bg-primary/5 hover:text-primary"
                                        >
                                            Ver Histórico
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal: Histórico de Garantia */}
            {viewingWarranty && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="card-section w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-4 border-primary/20">
                        <div className="card-section-header border-b border-border/40 p-5 shrink-0 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <HistoryIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-foreground tracking-tight">Status da Assistência</h2>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{viewingWarranty.orderNumber} • {viewingWarranty.clientName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleCopyTracking(viewingWarranty.id)}
                                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 text-[10px] font-black uppercase"
                                    title="Copiar Link de Rastreio para Cliente"
                                >
                                    <Share2 className="w-3.5 h-3.5" /> Rastreio Cliente
                                </button>
                                <button onClick={() => setViewingWarranty(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border-b border-border/40">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Pipeline de Atendimento</p>
                            <div className="flex items-center justify-between relative px-2">
                                <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                                {[
                                    { s: 'Garantia criada', i: Info },
                                    { s: 'Garantia aprovada', i: ShieldCheck },
                                    { s: 'Em produção', i: Factory },
                                    { s: 'Garantia finalizada', i: Truck }
                                ].map((step, idx) => {
                                    const statuses = ['Garantia criada', 'Garantia aprovada', 'Em produção', 'Garantia finalizada'];
                                    const currentIdx = statuses.indexOf(viewingWarranty.status);
                                    const isDone = statuses.indexOf(step.s) <= currentIdx;
                                    const isCurrent = step.s === viewingWarranty.status;
                                    return (
                                        <div key={idx} className="flex flex-col items-center gap-2 z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                                isCurrent ? 'bg-primary border-primary text-white scale-110 shadow-lg' :
                                                isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-300'
                                            }`}>
                                                {isDone ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            </div>
                                            <span className={`text-[8px] font-bold uppercase text-center max-w-[60px] ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {step.s.replace('Garantia ', '')}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {(viewingWarranty.history || []).length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground italic text-sm">
                                    Nenhum log de alteração encontrado.
                                </div>
                            ) : (
                                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-border before:to-transparent">
                                    {(viewingWarranty.history || []).map((h, i) => (
                                        <div key={i} className="relative flex items-start gap-4 animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-background z-10 ${h.status === viewingWarranty.status ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                <div className="w-2 h-2 rounded-full bg-current" />
                                            </div>
                                            <div className="flex-1 pt-0.5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black uppercase tracking-tighter text-foreground">{h.status}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{format(new Date(h.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1 group-hover:border-primary/20 transition-colors">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                        Alterado por: <span className="text-foreground">{h.user}</span>
                                                    </p>
                                                    {h.note && <p className="text-xs text-foreground italic leading-relaxed text-muted-foreground">"{h.note}"</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-border/40 bg-muted/30 shrink-0">
                            <button onClick={() => setViewingWarranty(null)} className="btn-modern bg-primary text-primary-foreground w-full justify-center h-12 font-bold shadow-lg shadow-primary/10">
                                Fechar Histórico
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GarantiasPage;
