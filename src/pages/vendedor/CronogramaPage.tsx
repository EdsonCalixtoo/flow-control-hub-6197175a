import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarClock, Plus, Search, X, Check, ArrowRight, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfToday, isBefore, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Order } from '@/types/erp';

const CronogramaVendedorPage: React.FC = () => {
    const { clients, products, addOrder, orders } = useERP();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [loading, setLoading] = useState(false);

    // Form state similar to OrcamentosPage but simplified
    const [items, setItems] = useState<{ product: string; description: string; quantity: number; unitPrice: string | number }[]>([{ product: '', description: '', quantity: 1, unitPrice: '' }]);
    const [observation, setObservation] = useState('');

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
    };

    const handleCreateScheduledOrder = async () => {
        if (!selectedClientId) {
            toast.error('Selecione um cliente');
            return;
        }
        if (items.some(i => !i.product || !i.quantity)) {
            toast.error('Preencha os itens do pedido');
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
                notes: '',
                paymentStatus: 'pendente',
                deliveryDate: format(selectedDate, 'yyyy-MM-dd'),
                scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
                isCronograma: true,
                observation,
                createdAt: now,
                updatedAt: now,
                statusHistory: [{
                    status: 'rascunho',
                    timestamp: now,
                    user: user?.name || 'Vendedor',
                    note: 'Pedido de cronograma criado'
                }]
            };

            await addOrder(newOrder);
            toast.success('Pedido cronograma criado com sucesso!');
            resetForm();
        } catch (err: any) {
            toast.error('Erro ao criar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calendar render logic
    const days = Array.from({ length: 35 }, (_, i) => addDays(startOfToday(), i));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-primary" /> Cronograma (Agendamento)
                    </h1>
                    <p className="page-subtitle">Escolha uma data no calendário para agendar um novo pedido</p>
                </div>
            </div>

            <div className="card-section p-6">
                <div className="grid grid-cols-7 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="bg-muted/30 p-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {d}
                        </div>
                    ))}
                    {days.map((day, i) => {
                        const dayOrders = orders.filter(o => o.isCronograma && o.scheduledDate === format(day, 'yyyy-MM-dd'));
                        return (
                            <div
                                key={i}
                                onClick={() => handleDateClick(day)}
                                className={`min-h-[120px] bg-card p-3 cursor-pointer hover:bg-primary/5 transition-colors group relative border-t border-l border-border/20 ${isSameDay(day, selectedDate) ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''}`}
                            >
                                <span className={`text-sm font-bold ${isSameDay(day, startOfToday()) ? 'text-primary' : 'text-foreground'}`}>
                                    {format(day, 'd')}
                                </span>

                                <div className="mt-2 space-y-1">
                                    {dayOrders.slice(0, 3).map(o => (
                                        <div key={o.id} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 truncate font-semibold">
                                            {o.clientName.split(' ')[0]} - {o.number}
                                        </div>
                                    ))}
                                    {dayOrders.length > 3 && (
                                        <div className="text-[8px] text-muted-foreground font-bold pl-1">
                                            +{dayOrders.length - 3} mais...
                                        </div>
                                    )}
                                </div>

                                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <Plus className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal de Criação */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
                    <div className="card-section p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
                        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <CalendarClock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Novo Agendamento</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                                </div>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Seleção de Cliente */}
                            {!selectedClientId ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            className="input-modern pl-10"
                                            value={searchClient}
                                            onChange={e => setSearchClient(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {filteredClients.slice(0, 5).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedClientId(c.id)}
                                                className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"><User className="w-4 h-4" /></div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold">{c.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">{c.cpfCnpj || 'Sem documento'}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-2">
                                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <User className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="text-xs font-bold text-primary">Cliente Selecionado</p>
                                                <p className="text-sm font-black text-foreground">{clients.find(c => c.id === selectedClientId)?.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedClientId('')} className="text-[10px] font-bold text-destructive uppercase hover:underline">Alterar</button>
                                    </div>

                                    {/* Itens */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Produtos</p>
                                            <button onClick={addItem} className="text-[10px] font-bold text-primary uppercase flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar</button>
                                        </div>
                                        {items.map((item, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-muted/30 border border-border/30 relative group">
                                                <div className="col-span-12 md:col-span-5">
                                                    <select
                                                        value={item.product}
                                                        onChange={e => updateItem(i, 'product', e.target.value)}
                                                        className="input-modern py-2 text-xs"
                                                    >
                                                        <option value="">Produto...</option>
                                                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-4 md:col-span-2">
                                                    <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="input-modern py-2 text-xs" placeholder="Qtd" />
                                                </div>
                                                <div className="col-span-6 md:col-span-4">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                                                        <input type="text" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} className="input-modern py-2 pl-7 text-xs" placeholder="Preço" />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                                                    <button onClick={() => removeItem(i)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Observações</p>
                                        <textarea value={observation} onChange={e => setObservation(e.target.value)} className="input-modern min-h-[80px]" placeholder="Instruções para o financeiro/produção..." />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Total Estimado</p>
                                <p className="text-lg font-black text-foreground">R$ {calcTotal().toFixed(2)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={resetForm} className="btn-modern bg-background text-foreground shadow-none">Cancelar</button>
                                <button
                                    onClick={handleCreateScheduledOrder}
                                    disabled={loading || !selectedClientId}
                                    className="btn-primary min-w-[140px] justify-center"
                                >
                                    {loading ? 'Criando...' : <><Check className="w-4 h-4" /> Agendar e Enviar</>}
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
