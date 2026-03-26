import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import {
    CalendarDays,
    ArrowLeft,
    Factory,
    Truck,
    Package,
    Warehouse,
    Filter,
    X,
    Check,
    ArrowRight,
    Search,
    DollarSign,
    Plus,
    User,
    Clock,
    Eye,
    Info,
    CalendarClock,
    AlertCircle,
    CheckCircle2,
    Zap,
    XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ModernCalendar from '@/components/shared/ModernCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfToday, isBefore } from 'date-fns';
import { ptBR as localePtBR } from 'date-fns/locale';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import type { Order } from '@/types/erp';

const CalendarioProducaoVendedorPage: React.FC = () => {
    const { clients, products, addOrder, orders } = useERP();
    const { user } = useAuth();
    
    // Estados para o calendário e filtros
    const [carrierFilter, setCarrierFilter] = useState<string>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Estados para o modal de agendamento
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchClient, setSearchClient] = useState('');
    const [clientName, setClientName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [loading, setLoading] = useState(false);

    // Estados do formulário de pedido
    const [items, setItems] = useState<{ product: string; description: string; quantity: number; unitPrice: string | number; sensorType?: 'com_sensor' | 'sem_sensor' }[]>([{ product: '', description: '', quantity: 1, unitPrice: '', sensorType: 'sem_sensor' }]);
    const [observation, setObservation] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [orderType, setOrderType] = useState<'entrega' | 'retirada'>('entrega');
    const [carrier, setCarrier] = useState('');

    // Filtramos apenas ordens que fazem parte da produção da empresa
    const productionOrders = orders.filter(o =>
        (o.isCronograma || o.scheduledDate) &&
        o.orderType !== 'instalacao' &&
        ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'planejamento'].includes(o.status) &&
        (carrierFilter === 'todos' || o.carrier?.toLowerCase() === carrierFilter.toLowerCase()) &&
        (searchTerm === '' || o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
        setSearchClient('');
        setSelectedClientId('');
        setShowCreateModal(true);
    };

    const addItem = () => setItems(prev => [...prev, { product: '', description: '', quantity: 1, unitPrice: '', sensorType: 'sem_sensor' }]);
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
        setItems([{ product: '', description: '', quantity: 1, unitPrice: '', sensorType: 'sem_sensor' }]);
        setClientName('');
        setObservation('');
        setInternalNotes('');
        setOrderType('entrega');
        setCarrier('');
    };

    const handleCreateScheduledOrder = async () => {
        if (!clientName && !selectedClientId) {
            toast.error('Insira o nome do cliente ou selecione um');
            return;
        }
        if (items.some(i => !i.product || !i.quantity)) {
            toast.error('Preencha os itens do pedido com produto e quantidade.');
            return;
        }

        setLoading(true);
        try {
            const client = clients.find(c => c.id === selectedClientId);
            const now = new Date().toISOString();

            const newOrder: Order = {
                id: crypto.randomUUID(),
                number: `PREVISÃO-${Math.floor(Math.random() * 9000) + 1000}`,
                clientId: selectedClientId || '00000000-0000-0000-0000-000000000000',
                clientName: clientName || client?.name || 'Anotação Visual',
                sellerId: user?.id || '1',
                sellerName: user?.name || 'Vendedor',
                items: items[0]?.product ? items.map((item, i) => ({
                    id: `cr${i}`,
                    product: item.product,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice,
                    total: item.quantity * (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice),
                    sensorType: item.sensorType,
                    discount: 0,
                    discountType: 'percent',
                })) : [],
                total: 0,
                subtotal: 0,
                taxes: 0,
                status: 'planejamento',
                notes: internalNotes,
                paymentStatus: 'pendente',
                deliveryDate: format(selectedDate, 'yyyy-MM-dd'),
                scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
                isCronograma: true,
                financeiroAprovado: false,
                statusPagamento: 'pendente',
                statusProducao: 'Planejamento',
                observation,
                orderType,
                carrier: orderType === 'entrega' ? carrier : undefined,
                createdAt: now,
                updatedAt: now,
                statusHistory: [{
                    status: 'planejamento',
                    timestamp: now,
                    user: user?.name || 'Vendedor',
                    note: 'Anotação visual no calendário para o dia ' + format(selectedDate, 'dd/MM/yyyy')
                }]
            };

            await addOrder(newOrder);
            toast.success('Anotação enviada para o calendário!');
            resetForm();
        } catch (err: any) {
            toast.error('Erro ao agendar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative">
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-producao to-producao/60 flex items-center justify-center text-white shadow-lg shadow-producao/20">
                            <CalendarDays className="w-7 h-7" />
                        </div>
                        <span className="gradient-text">Calendário de Previsão</span>
                    </h1>
                    <p className="page-subtitle ml-[3.75rem]">Registre previsões de venda para organizar a fila da linha de produção (Fábrica)</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar no calendário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-modern pl-9 py-2 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-border/10 self-start shadow-inner">
                        <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground">
                            <Truck className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Logística:</span>
                        </div>
                        {['TODOS', 'JADLOG', 'MOTOBOY', 'KLEYTON', 'LALAMOVE'].map(c => (
                            <button
                                key={c}
                                onClick={() => setCarrierFilter(c.toLowerCase())}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-300 uppercase tracking-widest ${
                                    carrierFilter === c.toLowerCase() 
                                        ? 'bg-card text-foreground shadow-lg shadow-black/5 ring-1 ring-border/50 scale-105' 
                                        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-[2.5rem] border border-border/40 shadow-2xl shadow-primary/5 flex flex-col gap-8">
                <div className="flex items-center gap-8 px-4 bg-muted/10 w-fit p-3 rounded-2xl border border-border/10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Confirmado</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_10px_rgba(234,179,8,0.6)] animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aguardando Pagam.</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-producao shadow-[0_0_10px_rgba(255,127,0,0.6)] ring-1 ring-producao/30" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Previsão</span>
                    </div>
                </div>

                <ModernCalendar
                    orders={productionOrders}
                    onDateClick={handleDateClick}
                    onOrderClick={(order) => setSelectedOrder(order)}
                    role="producao"
                />
            </div>

            {/* Modal de Detalhes do Pedido */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl glass-card border border-border/40 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col scale-100 shadow-primary/10">
                        <div className="p-8 border-b border-border/10 flex items-center justify-between bg-gradient-to-br from-primary/10 via-transparent to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                    <Package className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-1">Detalhes do Planejamento</p>
                                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                        {selectedOrder.number}
                                        <StatusBadge status={selectedOrder.status} />
                                    </h2>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedOrder(null)} 
                                className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-2xl transition-all shadow-sm border border-border/10 group"
                            >
                                <X className="w-6 h-6 text-muted-foreground group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/10 space-y-1">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cliente</p>
                                    <p className="text-base font-black text-foreground">{selectedOrder.clientName}</p>
                                </div>
                                <div className="p-5 rounded-[2rem] bg-muted/20 border border-border/10 space-y-1">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Data Programada</p>
                                    <p className="text-base font-black text-foreground">
                                        {format(new Date((selectedOrder.scheduledDate || selectedOrder.createdAt).includes('T') ? (selectedOrder.scheduledDate || selectedOrder.createdAt) : (selectedOrder.scheduledDate || selectedOrder.createdAt) + 'T12:00:00'), "dd 'de' MMMM", { locale: localePtBR })}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
                                    <Warehouse className="w-4 h-4" /> Itens do Pedido
                                </h3>
                                <div className="rounded-[2rem] border border-border/10 overflow-hidden bg-muted/5">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted/20 border-b border-border/10">
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Produto</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Qtd</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Obs</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/5">
                                            {selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-primary/5 transition-colors">
                                                    <td className="p-4 text-sm font-black text-foreground">{item.product}</td>
                                                    <td className="p-4 text-sm font-black text-foreground text-center bg-muted/20">
                                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{item.quantity}</span>
                                                    </td>
                                                     <td className="p-4 text-xs text-muted-foreground italic font-medium">
                                                         {item.description || '—'}
                                                         {item.sensorType && (
                                                             <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${item.sensorType === 'com_sensor' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                 {item.sensorType === 'com_sensor' ? 'Com Sensor' : 'Sem Sensor'}
                                                             </span>
                                                         )}
                                                     </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.observation && (
                                <div className="p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/20 space-y-2">
                                    <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Observação de Produção
                                    </h4>
                                    <p className="text-sm text-foreground/80 font-medium leading-relaxed">{selectedOrder.observation}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-muted/10 border border-border/10 flex items-center gap-3" >
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Vendedor</p>
                                        <p className="text-[11px] font-bold text-foreground">{selectedOrder.sellerName}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/10 border border-border/10 flex items-center gap-3">
                                    <Truck className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Transporte</p>
                                        <p className="text-[11px] font-bold text-foreground uppercase tracking-tighter">{selectedOrder.carrier || 'Balcão / Retirada'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-border/10 bg-muted/5 flex justify-end">
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="px-8 py-4 rounded-2xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-foreground/10"
                            >
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="card-section p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl scale-100 ring-1 ring-border shadow-primary/20">
                        <div className="p-6 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                    <CalendarClock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Registar Previsão</h3>
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
                                                onClick={() => {
                                                    setSelectedClientId(c.id);
                                                    setClientName(c.name);
                                                }}
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
                                                <p className="text-base font-black text-foreground">{clientName || clients.find(c => c.id === selectedClientId)?.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedClientId(''); setClientName(''); }} className="px-4 py-2 bg-background border border-border/40 rounded-xl text-[10px] font-black text-muted-foreground uppercase hover:bg-muted transition-all">Alterar</button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-sm font-black text-foreground uppercase tracking-tight">Produtos da Previsão</p>
                                            <button onClick={addItem} className="h-10 px-4 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105"><Plus className="w-4 h-4" /> Novo Item</button>
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
                                                     {item.product.toLowerCase().includes('kit') && (
                                                         <div className="col-span-12 md:col-span-12 pt-2">
                                                             <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-1.5 block">Configurar Sensor</label>
                                                             <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/10 w-fit">
                                                                 <button
                                                                     onClick={() => updateItem(i, 'sensorType', 'sem_sensor')}
                                                                     className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${item.sensorType === 'sem_sensor' ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
                                                                 >
                                                                     <XCircle className="w-3.5 h-3.5" /> Sem Sensor
                                                                 </button>
                                                                 <button
                                                                     onClick={() => updateItem(i, 'sensorType', 'com_sensor')}
                                                                     className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${item.sensorType === 'com_sensor' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-muted-foreground hover:text-foreground'}`}
                                                                 >
                                                                     <Zap className="w-3.5 h-3.5 fill-current" /> Com Sensor
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     )}
                                                     <div className="col-span-12 flex items-center justify-end md:col-span-1 md:pt-6">
                                                        <button onClick={() => { removeItem(i); }} className="p-2 text-destructive/40 hover:text-destructive transition-all"><X className="w-5 h-5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

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
                                                    {['JADLOG', 'MOTOBOY', 'KLEYTON', 'LALAMOVE'].map(c => (
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
                                            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Observação (Produção)</label>
                                            <textarea
                                                value={observation}
                                                onChange={e => setObservation(e.target.value)}
                                                className="input-modern min-h-[100px] p-4 text-sm resize-none bg-muted/20"
                                                placeholder="Detalhes que aparecerão para a produção..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border/40 bg-card flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/20 w-full md:w-auto">
                                <div className="p-3 rounded-xl bg-producao/10 text-producao"><Package className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Atenção</p>
                                    <p className="text-xs font-bold text-foreground leading-tight">Isto é apenas uma previsão para a fábrica</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={resetForm} className="btn-modern h-14 px-8 bg-muted text-foreground border-none font-black text-xs uppercase tracking-widest">Cancelar</button>
                                <button
                                    onClick={handleCreateScheduledOrder}
                                    disabled={loading || (!selectedClientId && !clientName)}
                                    className="btn-primary bg-producao hover:bg-producao/90 h-14 min-w-[200px] justify-center text-xs font-black uppercase tracking-widest shadow-xl shadow-producao/20"
                                >
                                    {loading ? 'Sincronizando...' : <><Check className="w-5 h-5 mr-3" /> Enviar para Cronograma</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legenda de Fluxo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-producao/10 flex items-center justify-center text-producao">
                        <Factory className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Em Produção</p>
                        <p className="text-xs font-bold">Pedidos sendo fabricados</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Finalizados</p>
                        <p className="text-xs font-bold">Aguardando coleta/entrega</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Truck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Logística</p>
                        <p className="text-xs font-bold">Identifique pela cor do selo</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarioProducaoVendedorPage;
