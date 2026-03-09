import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    CalendarClock,
    Plus,
    Search,
    X,
    Check,
    ArrowRight,
    User,
    Package,
    Clock,
    Truck,
    Info,
    DollarSign
} from 'lucide-react';
import { format, startOfToday, isBefore } from 'date-fns';
import { ptBR as localePtBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Order } from '@/types/erp';
import ModernCalendar from '@/components/shared/ModernCalendar';
import { formatCurrency } from '@/components/shared/StatusBadge';

const CronogramaVendedorPage: React.FC = () => {
    const { clients, products, addOrder, orders } = useERP();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [loading, setLoading] = useState(false);

    const cronogramaOrders = orders.filter(o => o.isCronograma && o.orderType !== 'instalacao' && (o.sellerId === user?.id || !user?.id));

    const [items, setItems] = useState<{ product: string; description: string; quantity: number; unitPrice: string | number }[]>([{ product: '', description: '', quantity: 1, unitPrice: '' }]);
    const [observation, setObservation] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [orderType, setOrderType] = useState<'entrega' | 'retirada'>('entrega');
    const [carrier, setCarrier] = useState('');

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        c.cpfCnpj?.includes(searchClient)
    );

    const handleDateClick = (date: Date) => {
        if (isBefore(date, startOfToday())) {
            toast.error('Não é possível agendar para datas passadas');
            return;
        }
        setSelectedDate(date);
        setShowCreateModal(true);
    };

    const addItem = () => setItems(prev => [...prev, { product: '', description: '', quantity: 1, unitPrice: '' }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: string, value: any) => {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
    };

    const calcTotal = () => items.reduce((s, item) => {
        const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
        return s + (item.quantity * price);
    }, 0);

    const resetForm = () => {
        setShowCreateModal(false);
        setSelectedClientId('');
        setSearchClient('');
        setItems([{ product: '', description: '', quantity: 1, unitPrice: '' }]);
        setObservation('');
        setInternalNotes('');
        setOrderType('entrega');
        setCarrier('');
    };

    const handleCreateScheduledOrder = async () => {
        if (!selectedClientId) {
            toast.error('Selecione um cliente');
            return;
        }
        if (items.some(i => !i.product || !i.quantity)) {
            toast.error('Preencha os itens do pedido com produto e quantidade.');
            return;
        }

        if (items.some(i => {
            const price = typeof i.unitPrice === 'string' ? parseFloat(i.unitPrice) : i.unitPrice;
            return isNaN(price) || price < 0;
        })) {
            toast.error('Todos os itens devem ter preço unitário válido (0 ou maior).');
            return;
        }

        const subtotal = calcTotal();
        if (subtotal < 0) {
            toast.error('O valor total do pedido deve ser maior ou igual a R$ 0,00.');
            return;
        }

        setLoading(true);
        try {
            const client = clients.find(c => c.id === selectedClientId);
            const subtotal = calcTotal();
            const now = new Date().toISOString();

            const newOrder: Order = {
                id: crypto.randomUUID(),
                number: `PED-CR-${Math.floor(Math.random() * 9000) + 1000}`,
                clientId: selectedClientId,
                clientName: client?.name || 'Cliente',
                sellerId: user?.id || '1',
                sellerName: user?.name || 'Vendedor',
                items: items.map((item, i) => ({
                    id: `cr${i}`,
                    product: item.product,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice,
                    total: item.quantity * (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice),
                    discount: 0,
                    discountType: 'percent',
                })),
                subtotal,
                total: subtotal,
                taxes: 0,
                status: 'aguardando_financeiro',
                notes: internalNotes,
                paymentStatus: 'pendente',
                deliveryDate: format(selectedDate, 'yyyy-MM-dd'),
                scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
                isCronograma: true,
                financeiroAprovado: false,
                statusPagamento: 'pendente',
                statusProducao: 'Aguardando',
                observation,
                orderType,
                carrier: orderType === 'entrega' ? carrier : undefined,
                createdAt: now,
                updatedAt: now,
                statusHistory: [{
                    status: 'rascunho',
                    timestamp: now,
                    user: user?.name || 'Vendedor',
                    note: 'Pedido de cronograma criado para o dia ' + format(selectedDate, 'dd/MM/yyyy')
                }]
            };

            await addOrder(newOrder);
            toast.success('Pedido agendado com sucesso!');
            resetForm();
        } catch (err: any) {
            toast.error('Erro ao agendar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header flex items-center gap-2">
                        <CalendarClock className="w-8 h-8 text-primary shadow-sm" /> Cronograma (Agendamento)
                    </h1>
                    <p className="page-subtitle">Selecione um dia no calendário para reservar um agendamento</p>
                </div>
            </div>

            <ModernCalendar
                orders={cronogramaOrders}
                onDateClick={handleDateClick}
                onOrderClick={(order) => {
                    toast.info(`Pedido ${order.number} agendado para este dia.`);
                }}
                role="vendedor"
            />

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="card-section p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl scale-100 ring-1 ring-border shadow-primary/20">
                        <div className="p-6 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                    <CalendarClock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground">Novo Agendamento</h3>
                                    <p className="text-[10px] text-primary uppercase font-black tracking-[0.2em]">{selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: localePtBR })}</p>
                                </div>
                            </div>
                            <button onClick={resetForm} className="p-3 hover:bg-muted rounded-2xl transition-all shadow-sm"><X className="w-6 h-6 text-muted-foreground" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {!selectedClientId ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                                            className="input-modern pl-12 h-14 text-sm font-bold shadow-sm"
                                            value={searchClient}
                                            onChange={e => setSearchClient(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {filteredClients.slice(0, 5).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedClientId(c.id)}
                                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all group shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors"><User className="w-5 h-5" /></div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest">{c.cpfCnpj || 'DOCUMENTO NÃO CADASTRADO'}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in slide-in-from-right-4">
                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-sm"><User className="w-6 h-6" /></div>
                                            <div>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Cliente Selecionado</p>
                                                <p className="text-base font-black text-foreground">{clients.find(c => c.id === selectedClientId)?.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedClientId('')} className="px-4 py-2 bg-background border border-border/40 rounded-xl text-[10px] font-black text-muted-foreground uppercase hover:bg-muted transition-all">Alterar</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-sm font-black text-foreground">Especificação do Pedido</p>
                                            <button onClick={addItem} className="h-10 px-4 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Plus className="w-4 h-4" /> Item</button>
                                        </div>

                                        <div className="space-y-3">
                                            {items.map((item, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-3 p-4 rounded-2xl bg-muted/20 border border-border/20 relative group">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-1 block">Produto</label>
                                                        <select
                                                            value={item.product}
                                                            onChange={e => updateItem(i, 'product', e.target.value)}
                                                            className="input-modern h-11 py-2 text-xs font-bold"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-4 md:col-span-2">
                                                        <label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-1 block">Quantidade</label>
                                                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="input-modern h-11 py-2 text-xs font-bold text-center" />
                                                    </div>
                                                    <div className="col-span-8 md:col-span-4">
                                                        <label className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-1 block">Preço Unitário</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">R$</span>
                                                            <input type="text" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} className="input-modern h-11 py-2 pl-9 text-xs font-black text-primary" placeholder="0,00" />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-12 flex items-center justify-end md:col-span-1 md:pt-6">
                                                        <button onClick={() => removeItem(i)} className="p-2 text-destructive/40 hover:text-destructive transition-all"><X className="w-5 h-5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tipo de Pedido e Transportadora */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Tipo do Pedido</label>
                                            <div className="flex p-1 bg-muted/30 rounded-xl border border-border/40">
                                                <button
                                                    onClick={() => setOrderType('entrega')}
                                                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${orderType === 'entrega' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-background'}`}
                                                >
                                                    <Truck className="w-4 h-4" /> Entrega
                                                </button>
                                                <button
                                                    onClick={() => { setOrderType('retirada'); setCarrier(''); }}
                                                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${orderType === 'retirada' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-background'}`}
                                                >
                                                    <Package className="w-4 h-4" /> Retirada
                                                </button>
                                            </div>
                                        </div>

                                        {orderType === 'entrega' && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-left-4">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Transportadora</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['JADLOG', 'MOTOBOY', 'CLEYTON', 'LALAMOVE'].map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => setCarrier(c)}
                                                            className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase border transition-all ${carrier === c ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'border-border/40 hover:border-primary/30 text-muted-foreground'}`}
                                                        >
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Observação (Financeiro e Produção)</label>
                                            <textarea
                                                value={observation}
                                                onChange={e => setObservation(e.target.value)}
                                                className="input-modern min-h-[100px] p-4 text-sm resize-none bg-muted/20"
                                                placeholder="Detalhes que aparecerão para o financeiro e produção..."
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Notas Internas (Opcional)</label>
                                            <textarea
                                                value={internalNotes}
                                                onChange={e => setInternalNotes(e.target.value)}
                                                className="input-modern min-h-[100px] p-4 text-sm resize-none bg-muted/20 border-dashed"
                                                placeholder="Anotações internas sobre o orçamento..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/20 w-full md:w-auto">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary"><DollarSign className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Total</p>
                                    <p className="text-2xl font-black text-foreground">{formatCurrency(calcTotal())}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={resetForm} className="btn-modern h-14 px-8 bg-muted text-foreground border-none font-black text-xs uppercase tracking-widest">Cancelar</button>
                                <button
                                    onClick={handleCreateScheduledOrder}
                                    disabled={loading || !selectedClientId}
                                    className="btn-primary h-14 min-w-[200px] justify-center text-xs font-black uppercase tracking-widest"
                                >
                                    {loading ? 'Processando...' : <><Check className="w-5 h-5 mr-3" /> Confirmar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CronogramaVendedorPage;
