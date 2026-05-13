import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
    Plus, Search, Eye, ArrowLeft, Send, CheckCircle, 
    Clock, XCircle, ShieldCheck, ShieldAlert, 
    History as HistoryIcon, User, X, Truck, 
    Share2, Factory, Info 
} from 'lucide-react';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import type { Warranty, Order, WarrantyStatus, OrderStatus } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { addMonths, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { InstallationCalendar } from '@/components/shared/InstallationCalendar';
import { checkInstallationConflict, saveInstallation, deleteInstallationByOrder } from '@/lib/installationServiceSupabase';

type Tab = 'pedidos' | 'garantias' | 'sistema_antigo';

const getNextOrderNumber = (existingOrders: Order[]): number => {
    if (existingOrders.length === 0) return 1;
    const numbers = existingOrders
        .map(o => parseInt(o.number.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
    return Math.max(...numbers, 0) + 1;
};

const GarantiasPage: React.FC = () => {
    const { orders, warranties, addWarranty, deliveryPickups, products, addOrder, editWarranty, editOrderFull, clients } = useERP();
    const { user } = useAuth();
    
    // States
    const [activeTab, setActiveTab] = useState<Tab>('garantias');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [description, setDescription] = useState('');
    const [reason, setReason] = useState('');
    const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingWarranty, setViewingWarranty] = useState<Warranty | null>(null);
    const [warrantyItems, setWarrantyItems] = useState<{ product: string; description: string; quantity: number; sensorType?: 'com_sensor' | 'sem_sensor' }[]>([]);
    const [carrier, setCarrier] = useState('');
    const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
    const [showChoiceModal, setShowChoiceModal] = useState(false);
    const [isManual, setIsManual] = useState(false);
    const [manualOrderNumber, setManualOrderNumber] = useState('');
    const [manualClientId, setManualClientId] = useState('');
    const [manualClientName, setManualClientName] = useState('');
    const [orderType, setOrderType] = useState<'entrega' | 'instalacao' | 'manutencao' | 'retirada'>('entrega');
    const [installationDate, setInstallationDate] = useState('');
    const [installationTime, setInstallationTime] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [openProductIdx, setOpenProductIdx] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pendente' | 'em_analise' | 'concluido'>('all');

    const isErica = user?.email === 'ericasousa@gmail.com';
    const isVendedor = user?.role === 'vendedor';

    // Filters
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
            const searchLower = searchTerm.toLowerCase();
            list = list.filter(w =>
                w.orderNumber.toLowerCase().includes(searchLower) ||
                w.clientName.toLowerCase().includes(searchLower) ||
                w.description?.toLowerCase().includes(searchLower)
            );
        }
        if (filterStatus !== 'all') {
            list = list.filter(w => {
                if (filterStatus === 'pendente') return w.status === 'Garantia criada';
                if (filterStatus === 'em_analise') return ['Aguardando aprovação do gestor', 'Garantia aprovada', 'Em produção'].includes(w.status);
                if (filterStatus === 'concluido') return w.status === 'Garantia finalizada' || w.status === 'rejeitado';
                return true;
            });
        }
        return list;
    }, [warranties, isErica, user, searchTerm, filterStatus]);

    // Helpers
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

    const handleCopyTracking = (warrantyId: string) => {
        const link = `${window.location.origin}/rastreio/garantia/${warrantyId}`;
        navigator.clipboard.writeText(link);
        toast.info('Link de rastreio copiado!', {
            description: 'Envie este link para o cliente acompanhar.'
        });
    };

    const handleCreateForOrder = (order: Order) => {
        setSelectedOrder(order);
        setWarrantyItems(order.items.map(i => ({
            product: i.product,
            description: i.description || '',
            quantity: i.quantity,
            sensorType: i.sensorType
        })));
        setShowCreate(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = async (generateNew: boolean = true) => {
        if (!reason.trim() || !description.trim()) {
            toast.warning('Motivo e Descrição são obrigatórios');
            return;
        }

        if (isManual) {
            if (!manualOrderNumber.trim() || !manualClientName.trim()) {
                toast.warning('Pedido Antigo e Cliente são obrigatórios');
                return;
            }
        } else if (!selectedOrder) {
            toast.warning('Selecione um pedido');
            return;
        }

        try {
            setLoading(true);
            const now = new Date().toISOString();
            const fullDescription = `${reason} - ${description}${warrantyItems.length > 0 ? '\n\nITENS EM GARANTIA:\n' + warrantyItems.map(i => `- ${i.product} (Qtd: ${i.quantity}): ${i.description}`).join('\n') : ''}`;

            if (orderType === 'instalacao' || orderType === 'manutencao') {
                if (!installationDate || !installationTime) {
                    toast.error(`Informe a data e o horário da ${orderType === 'manutencao' ? 'manutenção' : 'instalação'}.`);
                    setLoading(false);
                    return;
                }

                const hasConflict = await checkInstallationConflict(installationDate, installationTime, editingWarranty?.orderId);
                if (hasConflict) {
                    toast.error('❌ Este horário já está ocupado na agenda.');
                    setLoading(false);
                    return;
                }
            }

            if (isManual) {
                const orderIdGenerated = crypto.randomUUID();
                await addOrder({
                    id: orderIdGenerated,
                    number: manualOrderNumber,
                    clientId: manualClientId || 'manual-id',
                    clientName: manualClientName || 'Cliente Manual',
                    sellerId: user?.id || '',
                    sellerName: user?.name || '',
                    items: warrantyItems.map((item, i) => ({
                        id: `ni${i}`, product: item.product, description: item.description, quantity: item.quantity, unitPrice: 0, discount: 0, discountType: 'value', total: 0, sensorType: item.sensorType
                    })),
                    subtotal: 0, taxes: 0, total: 0,
                    status: 'aguardando_financeiro',
                    notes: `PEDIDO DE GARANTIA (SISTEMA ANTIGO) REFERENTE AO ${manualOrderNumber}\n\nMotivo: ${reason}\n\nDetalhes: ${description}`,
                    createdAt: now, updatedAt: now,
                    statusHistory: [{ status: 'aguardando_financeiro' as any, timestamp: now, user: user?.name || 'Vendedor', note: `Garantia do ${manualOrderNumber} - Enviado para validação do Financeiro` }],
                    carrier: carrier,
                    isWarranty: true,
                    orderType,
                    installationDate,
                    installationTime,
                    scheduledDate: (orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') ? installationDate : undefined,
                });

                if (orderType === 'instalacao' || orderType === 'manutencao') {
                    await saveInstallation({
                        order_id: orderIdGenerated,
                        seller_id: user?.id || '',
                        client_name: manualClientName || 'Cliente Manual',
                        date: installationDate,
                        time: installationTime,
                        payment_type: 'pago',
                        type: orderType as any
                    });
                }

                await addWarranty({
                    orderId: orderIdGenerated,
                    orderNumber: manualOrderNumber,
                    clientId: manualClientId || 'manual-id',
                    clientName: manualClientName || 'Cliente Manual',
                    sellerId: user?.id || '',
                    sellerName: user?.name || '',
                    product: 'Produto da Garantia',
                    description: fullDescription,
                    status: 'Garantia criada' as WarrantyStatus,
                    receiptUrls,
                    carrier,
                    orderType,
                    installationDate,
                    installationTime,
                    history: [{ status: 'Garantia criada' as WarrantyStatus, timestamp: now, user: user?.name || 'Vendedor', note: `Garantia aberta MANUALMENTE (Ref: ${manualOrderNumber})` }]
                });
                toast.success(`Garantia manual aberta e pedido ${manualOrderNumber} gerado`);
            } else if (editingWarranty) {
                if (generateNew) {
                    const nextNumber = getNextOrderNumber(orders);
                    const orderNumber = `PED-${String(nextNumber).padStart(3, '0')}`;
                    const orderIdGenerated = crypto.randomUUID();

                    await addOrder({
                        id: orderIdGenerated,
                        number: orderNumber,
                        clientId: selectedOrder!.clientId,
                        clientName: selectedOrder!.clientName,
                        sellerId: selectedOrder!.sellerId,
                        sellerName: selectedOrder!.sellerName,
                        items: warrantyItems.map((item, i) => ({
                            id: `ni${i}`, product: item.product, description: item.description, quantity: item.quantity, unitPrice: 0, discount: 0, discountType: 'value', total: 0, sensorType: item.sensorType
                        })),
                        subtotal: 0, taxes: 0, total: 0,
                        status: 'aguardando_financeiro',
                        notes: `PEDIDO DE GARANTIA REFERENTE AO ${selectedOrder!.number}\n\nMotivo: ${reason}\n\nDetalhes: ${description}`,
                        createdAt: now, updatedAt: now,
                        statusHistory: [{ status: 'aguardando_financeiro' as any, timestamp: now, user: user?.name || 'Vendedor', note: `Garantia do ${selectedOrder!.number} (Edição - Novo Pedido) - Enviado para Financeiro` }],
                        carrier: carrier,
                        isWarranty: true,
                        orderType,
                        installationDate,
                        installationTime,
                        scheduledDate: (orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') ? installationDate : undefined,
                    });

                    if (orderType === 'instalacao' || orderType === 'manutencao') {
                        await saveInstallation({
                            order_id: orderIdGenerated,
                            seller_id: selectedOrder!.sellerId,
                            client_name: selectedOrder!.clientName,
                            date: installationDate,
                            time: installationTime,
                            payment_type: 'pago',
                            type: orderType as any
                        });
                    }

                    await editWarranty(editingWarranty.id, {
                        description: fullDescription,
                        receiptUrls,
                        carrier,
                        orderId: orderIdGenerated,
                        orderNumber: orderNumber,
                        updatedAt: now,
                        orderType,
                        installationDate,
                        installationTime,
                    });
                    toast.success(`Editado e Gerado novo pedido: ${orderNumber}`);
                } else {
                    await editWarranty(editingWarranty.id, {
                        description: fullDescription,
                        receiptUrls,
                        carrier,
                        updatedAt: now,
                    });

                    const existingWarrantyOrder = orders.find(o => o.notes?.includes(`PEDIDO DE GARANTIA REFERENTE AO ${selectedOrder!.number}`));
                    if (existingWarrantyOrder) {
                        await editOrderFull({
                            ...existingWarrantyOrder,
                            items: warrantyItems.map((item, i) => ({
                                id: item.product + i, product: item.product, description: item.description, quantity: item.quantity, unitPrice: 0, discount: 0, discountType: 'value', total: 0, sensorType: item.sensorType
                            })),
                            notes: `PEDIDO DE GARANTIA REFERENTE AO ${selectedOrder!.number}\n\nMotivo: ${reason}\n\nDetalhes: ${description}`,
                            updatedAt: now,
                            orderType,
                            installationDate,
                            installationTime,
                            scheduledDate: (orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') ? installationDate : undefined,
                        });

                        if (orderType === 'instalacao' || orderType === 'manutencao') {
                            await deleteInstallationByOrder(existingWarrantyOrder.id);
                            await saveInstallation({
                                order_id: existingWarrantyOrder.id,
                                seller_id: selectedOrder!.sellerId,
                                client_name: selectedOrder!.clientName,
                                date: installationDate,
                                time: installationTime,
                                payment_type: 'pago',
                                type: orderType as any
                            });
                        } else {
                            await deleteInstallationByOrder(existingWarrantyOrder.id);
                        }
                        toast.success(`Pedido ${existingWarrantyOrder.number} atualizado com sucesso!`);
                    }
                }
            } else {
                const nextNumber = getNextOrderNumber(orders);
                const orderNumber = `PED-${String(nextNumber).padStart(3, '0')}`;
                const orderIdGenerated = crypto.randomUUID();

                await addOrder({
                    id: orderIdGenerated,
                    number: orderNumber,
                    clientId: selectedOrder!.clientId,
                    clientName: selectedOrder!.clientName,
                    sellerId: selectedOrder!.sellerId,
                    sellerName: selectedOrder!.sellerName,
                    items: warrantyItems.map((item, i) => ({
                        id: `ni${i}`, product: item.product, description: item.description, quantity: item.quantity, unitPrice: 0, discount: 0, discountType: 'value', total: 0, sensorType: item.sensorType
                    })),
                    subtotal: 0, taxes: 0, total: 0,
                    status: 'aguardando_financeiro',
                    notes: `PEDIDO DE GARANTIA REFERENTE AO ${selectedOrder!.number}\n\nMotivo: ${reason}\n\nDetalhes: ${description}`,
                    createdAt: now, updatedAt: now,
                    statusHistory: [{ status: 'aguardando_financeiro' as any, timestamp: now, user: user?.name || 'Vendedor', note: `Garantia do ${selectedOrder!.number} - Aguardando aprovação do financeiro` }],
                    carrier: carrier,
                    isWarranty: true,
                    orderType,
                    installationDate,
                    installationTime,
                    scheduledDate: (orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') ? installationDate : undefined,
                });

                if (orderType === 'instalacao' || orderType === 'manutencao') {
                    await saveInstallation({
                        order_id: orderIdGenerated,
                        seller_id: selectedOrder!.sellerId,
                        client_name: selectedOrder!.clientName,
                        date: installationDate,
                        time: installationTime,
                        payment_type: 'pago',
                        type: orderType as any
                    });
                }

                await addWarranty({
                    orderId: orderIdGenerated,
                    orderNumber: orderNumber,
                    clientId: selectedOrder!.clientId,
                    clientName: selectedOrder!.clientName,
                    sellerId: selectedOrder!.sellerId,
                    sellerName: selectedOrder!.sellerName,
                    product: selectedOrder!.items[0]?.product || 'Produto não especificado',
                    description: fullDescription,
                    status: 'Garantia criada' as WarrantyStatus,
                    receiptUrls,
                    carrier,
                    orderType,
                    installationDate,
                    installationTime,
                    history: [{ status: 'Garantia criada' as WarrantyStatus, timestamp: now, user: user?.name || 'Vendedor', note: `Garantia aberta (Origem: ${selectedOrder!.number})` }]
                });
                toast.success(`Garantia aberta e pedido gerado: ${orderNumber}`);
            }

            // Reset state
            setShowCreate(false);
            setEditingWarranty(null);
            setSelectedOrder(null);
            setDescription('');
            setReason('');
            setReceiptUrls([]);
            setWarrantyItems([]);
            setCarrier('');
            setIsManual(false);
            setManualOrderNumber('');
            setManualClientId('');
            setManualClientName('');
            setOrderType('entrega');
            setInstallationDate('');
            setInstallationTime('');
            setShowChoiceModal(false);
        } catch (err: any) {
            toast.error('Erro ao processar alteração');
        } finally {
            setLoading(false);
        }
    };

    if (showCreate) {
        return (
            <div className="min-h-screen pb-12 animate-in fade-in duration-500">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header Moderno do Formulário */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                {editingWarranty ? 'Editar Assistência' : 'Abrir Assistência'}
                            </h2>
                            <p className="text-sm font-bold text-slate-400">Preencha os detalhes técnicos para validação</p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowCreate(false);
                                setEditingWarranty(null);
                                setIsManual(false);
                            }}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Coluna Esquerda: Dados Principais */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Seção: Identificação do Legado (Apenas Manual) */}
                            {isManual && (
                                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                            <HistoryIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800">Identificação do Legado</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dados do sistema antigo</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nº Pedido Antigo</label>
                                            <input 
                                                type="text"
                                                placeholder="Ex: D.3232"
                                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                value={manualOrderNumber}
                                                onChange={e => setManualOrderNumber(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Buscar Cliente</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsClientDropdownOpen(true)}
                                                className="w-full h-12 px-5 bg-slate-50 border-none rounded-2xl text-sm font-bold flex items-center justify-between hover:bg-slate-100 transition-all group"
                                            >
                                                <span className={manualClientName ? 'text-slate-900' : 'text-slate-400'}>
                                                    {manualClientName || 'Selecionar cliente...'}
                                                </span>
                                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Search className="w-4 h-4 text-primary" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Card de Resumo do Pedido */}
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 p-8 shadow-2xl border border-white/10">
                                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                    <ShieldCheck className="w-32 h-32 text-white" />
                                </div>
                                <div className="relative z-10 grid grid-cols-2 gap-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Pedido Origem</p>
                                        <p className="text-2xl font-black text-white">{selectedOrder?.number || manualOrderNumber || '---'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Vendedor</p>
                                        <p className="text-sm font-bold text-slate-200">{selectedOrder?.sellerName || user?.name || '---'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Cliente Solicitante</p>
                                        <p className="text-lg font-black text-white">{selectedOrder?.clientName || manualClientName || '---'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Seção: Motivo */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                        <ShieldAlert className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">Diagnóstico Técnico</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relatório de defeito</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Motivo Resumido</label>
                                        <input 
                                            type="text"
                                            placeholder="Ex: Sensor com infiltração"
                                            className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relato Completo</label>
                                        <textarea 
                                            placeholder="Descreva o problema em detalhes..."
                                            className="w-full min-h-[150px] p-6 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seção: Itens em Garantia */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                            <Factory className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800">Peças para Reposição</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Itens que serão enviados</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setWarrantyItems([...warrantyItems, { product: '', description: '', quantity: 1 }])}
                                        className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-primary transition-all shadow-lg"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {warrantyItems.map((item, idx) => (
                                        <div key={idx} className="relative p-6 rounded-3xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:border-primary/10">
                                            <button 
                                                onClick={() => setWarrantyItems(warrantyItems.filter((_, i) => i !== idx))}
                                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                <div className="md:col-span-8 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Produto / Peça</label>
                                                    <div className="relative">
                                                        <button 
                                                            onClick={() => setOpenProductIdx(openProductIdx === idx ? null : idx)}
                                                            className="w-full h-11 px-4 bg-white rounded-xl text-xs font-bold border border-slate-100 text-left flex items-center justify-between"
                                                        >
                                                            <span className="truncate">{item.product || 'Selecione o item...'}</span>
                                                            <Search className="w-3.5 h-3.5 opacity-20" />
                                                        </button>
                                                        {openProductIdx === idx && (
                                                            <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 animate-in zoom-in-95">
                                                                <input 
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Buscar..."
                                                                    className="w-full h-10 px-4 bg-slate-50 rounded-lg text-xs outline-none mb-2"
                                                                    value={productSearch}
                                                                    onChange={e => setProductSearch(e.target.value)}
                                                                />
                                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                                                        <button 
                                                                            key={p.id}
                                                                            onClick={() => {
                                                                                const ni = [...warrantyItems];
                                                                                ni[idx] = { ...ni[idx], product: p.name };
                                                                                setWarrantyItems(ni);
                                                                                setOpenProductIdx(null);
                                                                            }}
                                                                            className="w-full text-left p-2.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                                                                        >
                                                                            {p.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-4 space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qtd</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full h-11 px-4 bg-white rounded-xl text-xs font-black border border-slate-100 focus:ring-2 focus:ring-primary/10 outline-none"
                                                        value={item.quantity}
                                                        onChange={e => {
                                                            const ni = [...warrantyItems];
                                                            ni[idx].quantity = Number(e.target.value);
                                                            setWarrantyItems(ni);
                                                        }}
                                                    />
                                                </div>

                                                {/* Seleção de Sensor para KITS */}
                                                {item.product.toUpperCase().includes('KIT') && (
                                                    <div className="md:col-span-12 mt-2 pt-3 border-t border-slate-100 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração do Kit:</span>
                                                        <div className="flex gap-2">
                                                            {[
                                                                { id: 'com_sensor', label: 'Com Sensor' },
                                                                { id: 'sem_sensor', label: 'Sem Sensor' }
                                                            ].map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => {
                                                                        const ni = [...warrantyItems];
                                                                        ni[idx].sensorType = opt.id as 'com_sensor' | 'sem_sensor';
                                                                        setWarrantyItems(ni);
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${
                                                                        item.sensorType === opt.id
                                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                                            : 'bg-white border border-slate-100 text-slate-400 hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Logística e Fotos */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Seção: Logística */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">Meio de Envio</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escolha a transportadora</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {['JADLOG', 'MOTOBOY', 'LALAMOVE', 'KLEYTON'].map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setCarrier(c)}
                                            className={`h-14 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${carrier === c 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Seção: Agendamento */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">Agendamento</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data para assistência</p>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-100 p-2">
                                    <InstallationCalendar 
                                        selectedDate={installationDate}
                                        selectedTime={installationTime}
                                        currentOrderId={editingWarranty?.orderId}
                                        onSelect={(d, t) => {
                                            setInstallationDate(d);
                                            setInstallationTime(t);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Seção: Fotos */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800">Comprovantes</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fotos do defeito / Nota</p>
                                    </div>
                                </div>

                                <ComprovanteUpload 
                                    values={receiptUrls}
                                    onChange={setReceiptUrls}
                                />
                            </div>

                            {/* Botão de Ação */}
                            <button 
                                onClick={() => {
                                    if (editingWarranty) setShowChoiceModal(true);
                                    else handleSave(true);
                                }}
                                disabled={loading}
                                className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-primary hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>Sincronizando...</>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" /> {editingWarranty ? 'Confirmar Edição' : 'Gerar Pedido de Garantia'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal de Escolha de Edição */}
                {showChoiceModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in">
                        <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 space-y-8 animate-in zoom-in-95">
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
                                    <HistoryIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">Tipo de Atualização</h3>
                                <p className="text-sm font-medium text-slate-500">Deseja gerar um novo número de pedido ou apenas atualizar os dados técnicos da assistência atual?</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={() => handleSave(true)}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-primary transition-all"
                                >
                                    Gerar Novo Pedido
                                </button>
                                <button 
                                    onClick={() => handleSave(false)}
                                    className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all"
                                >
                                    Atualizar Existente
                                </button>
                                <button 
                                    onClick={() => setShowChoiceModal(false)}
                                    className="text-[10px] font-black uppercase text-slate-300 hover:text-slate-600 transition-colors mt-2"
                                >
                                    Cancelar e Revisar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE BUSCA DE CLIENTES (Substitui o Dropdown) */}
                {isClientDropdownOpen && (
                    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/40 backdrop-blur-md p-4 md:p-20 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-12 duration-500">
                            {/* Header do Modal */}
                            <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selecionar Cliente</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Busca rápida na base de dados</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsClientDropdownOpen(false);
                                        setClientSearch('');
                                    }}
                                    className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Campo de Busca Gigante */}
                            <div className="p-8 py-6">
                                <div className="relative group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text"
                                        autoFocus
                                        placeholder="Digite o nome, CPF/CNPJ ou Cidade..."
                                        className="w-full h-20 pl-16 pr-8 bg-slate-50 border-none rounded-[1.5rem] text-lg font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={clientSearch}
                                        onChange={e => setClientSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Lista de Resultados */}
                            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-2 custom-scrollbar">
                                {clients
                                    .filter(c => 
                                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                        c.cpfCnpj?.includes(clientSearch) ||
                                        c.city?.toLowerCase().includes(clientSearch.toLowerCase())
                                    )
                                    .sort((a,b) => a.name.localeCompare(b.name))
                                    .map(c => (
                                        <button 
                                            key={c.id}
                                            onClick={() => {
                                                setManualClientId(c.id);
                                                setManualClientName(c.name);
                                                setIsClientDropdownOpen(false);
                                                setClientSearch('');
                                            }}
                                            className="w-full flex items-center gap-6 p-6 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                                        >
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                {c.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h4 className="text-lg font-black text-slate-900 leading-tight">{c.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{c.city ? `${c.city}/${c.state}` : 'Sem localidade'}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{c.cpfCnpj || 'Sem documento'}</span>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-200 group-hover:border-primary group-hover:text-primary transition-all">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                        </button>
                                    ))}
                                
                                {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                    <div className="py-20 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Search className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Nenhum cliente encontrado</h3>
                                        <p className="text-sm text-slate-400 mt-2">Tente buscar por um termo diferente</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // MAIN LISTING VIEW
    return (
        <div className="min-h-screen pb-12">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header Superior */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Central de Garantias</h1>
                            {isErica && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Admin Mode</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm font-bold text-slate-400">Gestão inteligente de assistência técnica e SAC</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                        {[
                            { id: 'garantias', label: 'Consultar Garantias', icon: HistoryIcon },
                            { id: 'pedidos', label: 'Consultar Pedidos', icon: Search },
                            { id: 'sistema_antigo', label: 'Sistema Antigo', icon: Plus, adminOnly: true }
                        ].filter(t => !t.adminOnly || isErica).map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.id
                                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, pedido ou motivo..."
                            className="w-full h-14 pl-12 pr-6 bg-white border-none rounded-2xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab === 'garantias' && (
                        <div className="flex gap-2">
                            {['all', 'pendente', 'em_analise', 'concluido'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s as any)}
                                    className={`px-4 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterStatus === s
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    {s === 'all' ? 'Tudo' : s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {activeTab === 'garantias' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredWarranties.length > 0 ? (
                            filteredWarranties.map(w => (
                                <div key={w.id} className="group relative bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/10 transition-all duration-300">
                                    <div className="absolute top-6 right-6">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                                            w.status === 'Garantia finalizada' ? 'bg-emerald-100 text-emerald-600' :
                                            w.status === 'rejeitado' ? 'bg-rose-100 text-rose-600' :
                                            w.status === 'Garantia criada' ? 'bg-amber-100 text-amber-600' :
                                            'bg-indigo-100 text-indigo-600'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-current ${w.status !== 'Garantia finalizada' && w.status !== 'rejeitado' ? 'animate-pulse' : ''}`} />
                                            {w.status}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center text-slate-400 group-hover:from-primary/10 group-hover:to-primary/5 transition-all">
                                                <User className="w-6 h-6 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-slate-800 text-lg leading-tight truncate">{w.clientName}</h3>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Pedido {w.orderNumber}</p>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-primary/5 transition-all">
                                            <p className="text-xs font-bold text-slate-600 line-clamp-2 italic">
                                                "{w.description?.split(' - ')[0] || 'Sem motivo detalhado'}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(w.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {isErica && (
                                                    <button 
                                                        onClick={() => {
                                                            setEditingWarranty(w);
                                                            const orig = orders.find(o => o.id === w.orderId);
                                                            setSelectedOrder(orig || null);
                                                            const [extReason, ...rest] = w.description.split(' - ');
                                                            setReason(extReason || '');
                                                            setDescription(rest.join(' - ').split('\n\nITENS EM GARANTIA:')[0] || '');
                                                            setReceiptUrls(w.receiptUrls || []);
                                                            setCarrier(w.carrier || '');
                                                            setWarrantyItems([]);
                                                            setShowCreate(true);
                                                        }}
                                                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setViewingWarranty(w)}
                                                    className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all"
                                                >
                                                    Histórico
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <Search className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest">Nenhuma garantia encontrada</p>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'pedidos' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                        {filteredOrders.map(order => {
                            const g = getWarrantyStatus(order.id);
                            return (
                                <div key={order.id} className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900">{order.number}</h3>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate max-w-[200px]">{order.clientName}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                                <Truck className="w-6 h-6" />
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 rounded-2xl bg-slate-50 space-y-2 border border-slate-100">
                                            <p className={`text-[10px] font-black uppercase text-center ${g.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {g.label}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleCreateForOrder(order)}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Iniciar Assistência
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="lg:col-span-8 flex flex-col justify-center bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/60 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group min-h-[400px]">
                        <div className="relative z-10 max-w-lg">
                            <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 text-primary shadow-inner">
                                <Plus className="w-10 h-10" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter">Entrada Manual</h2>
                            <p className="text-lg text-slate-500 mb-10 font-medium leading-relaxed">
                                Ferramenta especializada para Erica processar pedidos do legado que ainda não constam na base atual.
                            </p>
                            <button
                                onClick={() => {
                                    setIsManual(true);
                                    setShowCreate(true);
                                }}
                                className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[13px] hover:bg-primary transition-all shadow-xl"
                            >
                                <Plus className="w-5 h-5" /> Abrir Pedido Externo
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal: Histórico */}
                {viewingWarranty && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-4 border border-slate-100">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <HistoryIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Timeline</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingWarranty.orderNumber}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingWarranty(null)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {(viewingWarranty.history || []).map((h, i) => (
                                    <div key={i} className="relative flex gap-6 pb-2">
                                        {i !== (viewingWarranty.history || []).length - 1 && (
                                            <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-100" />
                                        )}
                                        <div className="w-12 h-12 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center shrink-0 z-10">
                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black uppercase text-slate-800">{h.status}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium italic">"{h.note}"</p>
                                            <p className="text-[9px] font-black text-primary uppercase">{h.user}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100">
                                <button 
                                    onClick={() => handleCopyTracking(viewingWarranty.id)}
                                    className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" /> Copiar Link de Rastreio
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GarantiasPage;
