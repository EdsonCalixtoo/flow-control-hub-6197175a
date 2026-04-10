import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, ArrowLeft, Send, CheckCircle, Clock, XCircle, ShieldCheck, ShieldAlert, History as HistoryIcon, User, X, Truck, Share2, Factory, Info } from 'lucide-react';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import type { Warranty, Order, WarrantyStatus, OrderStatus } from '@/types/erp';
import { STATUS_LABELS } from '@/types/erp';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { addMonths, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { InstallationCalendar } from '@/components/shared/InstallationCalendar';
import { checkInstallationConflict, saveInstallation, deleteInstallationByOrder } from '@/lib/installationServiceSupabase';

type Tab = 'pedidos' | 'solicitacoes' | 'sistema_antigo';

const getNextOrderNumber = (existingOrders: Order[]): number => {
    if (existingOrders.length === 0) return 1;
    const numbers = existingOrders
        .map(o => parseInt(o.number.replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
    return Math.max(...numbers, 0) + 1;
};

const GarantiasPage: React.FC = () => {
    const { orders, warranties, addWarranty, deliveryPickups, products, addOrder, editWarranty, editOrderFull } = useERP();
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
    const { clients } = useERP();

    const isErica = user?.email === 'ericasousa@gmail.com';
    const isVendedor = user?.role === 'vendedor';

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

            // Validação de agendamento
            if (orderType === 'instalacao' || orderType === 'manutencao') {
                if (!installationDate || !installationTime) {
                    toast.error(`Informe a data e o horário da ${orderType === 'manutencao' ? 'manutenção' : 'instalação'}.`);
                    setLoading(false);
                    return;
                }

                const hasConflict = await checkInstallationConflict(installationDate, installationTime);
                if (hasConflict) {
                    toast.error('❌ Este horário já está ocupado na agenda.');
                    setLoading(false);
                    return;
                }
            }

            if (isManual) {
                // CRIANDO GARANTIA MANUAL (SISTEMA ANTIGO)
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
                // MODO EDIÇÃO
                if (generateNew) {
                    // GERA NOVO PEDIDO
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
                        await deleteInstallationByOrder(orderIdGenerated); // Caso estivessemos editando algo que já existia ( improvável aqui mas por segurança )
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
                    // TENTA LOCALIZAR PEDIDO EXISTENTE DESTA GARANTIA PARA ATUALIZAR
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
                    } else {
                        toast.info("Pedido vinculado não encontrado, as alterações foram salvas apenas no histórico da garantia.");
                    }
                }
            } else {
                // NOVA GARANTIA (SISTEMA ATUAL)
                const nextNumber = getNextOrderNumber(orders);
                const orderNumber = `PED-${String(nextNumber).padStart(3, '0')}`;
                const orderIdGenerated = crypto.randomUUID();

                if (isErica || isVendedor) {
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
        } catch (err: any) {
            toast.error('Erro ao processar alteração');
        } finally {
            setLoading(false);
            setShowChoiceModal(false);
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
                    <button onClick={() => { 
                        setShowCreate(false); 
                        setEditingWarranty(null); 
                        setIsManual(false);
                        setManualOrderNumber('');
                        setManualClientId('');
                        setManualClientName('');
                        setOrderType('entrega');
                        setInstallationDate('');
                        setInstallationTime('');
                    }} className="btn-modern bg-muted text-foreground">
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
                            
                            {isErica && (
                                <div className="col-span-2 mt-4 p-4 rounded-xl bg-white/50 border border-primary/20">
                                    <p className="text-[10px] font-bold text-primary uppercase mb-2">Itens do Pedido Original (Visualização)</p>
                                    <div className="space-y-2">
                                        {selectedOrder.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs font-medium border-b border-dashed pb-1">
                                                <span>{item.product}</span>
                                                <span className="font-bold">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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

                                    {item.product.toUpperCase().includes('KIT') && (
                                        <div className="flex gap-4 p-2 bg-slate-50 rounded-lg">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`sensor-${idx}`}
                                                    checked={item.sensorType === 'com_sensor'}
                                                    onChange={() => {
                                                        const newItems = [...warrantyItems];
                                                        newItems[idx].sensorType = 'com_sensor';
                                                        setWarrantyItems(newItems);
                                                    }}
                                                    className="w-3 h-3 text-primary"
                                                />
                                                <span className="text-[10px] font-bold uppercase">Com Sensor</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`sensor-${idx}`}
                                                    checked={item.sensorType === 'sem_sensor'}
                                                    onChange={() => {
                                                        const newItems = [...warrantyItems];
                                                        newItems[idx].sensorType = 'sem_sensor';
                                                        setWarrantyItems(newItems);
                                                    }}
                                                    className="w-3 h-3 text-primary"
                                                />
                                                <span className="text-[10px] font-bold uppercase">Sem Sensor</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {warrantyItems.length === 0 && (
                                <p className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                                    Nenhuma peça selecionada. Clique em "Adicionar Peça".
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Se for manual, campos extras */}
                    {isManual && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-scale-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número do Pedido Antigo</label>
                                <input
                                    type="text"
                                    value={manualOrderNumber}
                                    onChange={e => setManualOrderNumber(e.target.value)}
                                    placeholder="Ex: D.3232"
                                    className="input-modern"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selecionar Cliente</label>
                                <select
                                    value={manualClientId}
                                    onChange={e => {
                                        const c = clients.find(cl => cl.id === e.target.value);
                                        setManualClientId(e.target.value);
                                        setManualClientName(c?.name || '');
                                    }}
                                    className="input-modern"
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {clients.slice().sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* TIPO DE SERVIÇO E AGENDAMENTO (NOVO) */}
                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Tipo de Garantia / Serviço
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                    { id: 'entrega', label: 'Entrega' },
                                    { id: 'instalacao', label: 'Instalação' },
                                    { id: 'manutencao', label: 'Manutenção' },
                                    { id: 'retirada', label: 'Retirada' }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setOrderType(type.id as any)}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            orderType === type.id 
                                                ? 'bg-primary text-white shadow-md' 
                                                : 'bg-white text-muted-foreground border border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 mb-3">
                                    <Clock className="w-3 h-3" /> Selecionar Horário na Agenda
                                </label>
                                <InstallationCalendar
                                    selectedDate={installationDate}
                                    selectedTime={installationTime}
                                    onSelect={(date, time) => {
                                        setInstallationDate(date);
                                        setInstallationTime(time);
                                    }}
                                />
                            </div>
                        )}
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
                            {['JADLOG', 'MOTOBOY', 'KLEYTON', 'LALAMOVE'].map(c => (
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
                            if (editingWarranty) {
                                setShowChoiceModal(true);
                            } else {
                                handleSave(true);
                            }
                        }}
                        disabled={loading}
                        className={`btn-primary w-full h-12 justify-center font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                    >
                        <Send className="w-4 h-4" /> {loading ? 'Sincronizando...' : editingWarranty ? 'Confirmar Edição' : 'Enviar para Financeiro'}
                    </button>

                    {/* Modal de Escolha - NOVO PEDIDO OU MANTER */}
                    {showChoiceModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                            <div className="card-section p-8 w-full max-w-md space-y-6 shadow-2xl border-primary/20 animate-in zoom-in-95">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <HistoryIcon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black text-foreground">Atenção na Edição</h3>
                                    <p className="text-sm text-muted-foreground">Você está editando uma garantia aberta. Deseja gerar um novo número de pedido ou atualizar o pedido já existente?</p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => handleSave(true)}
                                        className="btn-primary w-full h-14 justify-center text-sm font-black uppercase tracking-wider"
                                    >
                                        <Plus className="w-4 h-4" /> Gerar Novo Pedido
                                    </button>
                                    <button
                                        onClick={() => handleSave(false)}
                                        className="btn-modern w-full h-14 justify-center text-sm font-black uppercase tracking-wider bg-muted/50 border-2 hover:bg-muted"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Manter/Atualizar Atual
                                    </button>
                                    <button
                                        onClick={() => setShowChoiceModal(false)}
                                        className="text-[10px] font-black uppercase text-muted-foreground hover:text-foreground mt-2"
                                    >
                                        Voltar e revisar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative min-h-[600px] animate-in fade-in duration-700">
            {/* Header com Gradiente Moderno */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 p-8 shadow-2xl border border-white/10">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                    <ShieldCheck className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/20 rounded-xl backdrop-blur-md border border-white/10">
                                <ShieldAlert className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tighter">Central de Garantias</h1>
                        </div>
                        <p className="text-slate-400 text-sm font-medium max-w-md">Gestão avançada de assistência técnica, validação de prazos e fluxo de produção.</p>
                    </div>
                    {isErica && (
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Administração</p>
                                <p className="text-sm font-bold text-white">Painel da Erica</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs com Estilo Moderno */}
            <div className="flex p-1.5 gap-2 bg-slate-100 rounded-[1.5rem] border border-slate-200/60 w-fit mx-auto md:mx-0 shadow-sm">
                {[
                    { id: 'pedidos', label: 'Consultar Pedidos', icon: Search },
                    { id: 'solicitacoes', label: isErica ? 'Todas as Garantias' : 'Minhas Solicitações', icon: HistoryIcon },
                    { id: 'sistema_antigo', label: 'Sistema Antigo', icon: Plus, adminOnly: true }
                ].filter(t => !t.adminOnly || isErica).map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${isActive 
                                ? 'bg-white text-primary shadow-lg shadow-primary/5 border border-primary/10' 
                                : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar por número do pedido ou nome do cliente..."
                    className="input-modern pl-12 h-14 bg-white border-slate-200/60 rounded-2xl shadow-sm focus:shadow-md transition-all text-sm font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {activeTab === 'pedidos' ? (
                <div className="card-section overflow-hidden rounded-[2rem] shadow-xl border-slate-200/60">
                    <table className="modern-table border-none">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                                <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                                {isErica && <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Vendedor</th>}
                                <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Validade do Prazo</th>
                                <th className="py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 pr-8">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={isErica ? 5 : 4} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                                                <Search className="w-8 h-8" />
                                            </div>
                                            <p className="text-slate-400 font-bold text-sm">Nenhum pedido encontrado com estes termos.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => {
                                    const g = getWarrantyStatus(order.id);
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-5 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                                        #{order.number.replace('PED-', '')}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{order.number}</span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-sm font-bold text-slate-800">{order.clientName}</p>
                                            </td>
                                            {isErica && (
                                                <td className="py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-slate-500" />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600">{order.sellerName}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-5 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm border ${g.isValid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {g.label}
                                                </span>
                                            </td>
                                            <td className="py-5 text-right pr-6 px-4">
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
                                                        className="btn-modern bg-primary text-white hover:shadow-lg hover:shadow-primary/20 p-3 px-5 text-[10px] font-black uppercase border-none rounded-2xl transition-all hover:-translate-y-0.5"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-2" /> Abrir Garantia
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">Somente Erica</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'solicitacoes' ? (
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
                                             <div className="flex flex-col">
                                                 <span className="font-black text-foreground">
                                                     {(() => {
                                                         const linkedOrderId = orders.find(o => o.id === w.orderId);
                                                         const linkedOrderNotes = orders.find(o => o.notes?.includes(`REFERENTE AO ${w.orderNumber}`));
                                                         const activeOrder = linkedOrderId || linkedOrderNotes;

                                                         if (activeOrder && activeOrder.number !== w.orderNumber) {
                                                              return (
                                                                  <>
                                                                      {activeOrder.number}
                                                                      <span className="text-[9px] text-primary ml-2 font-black uppercase">
                                                                          (Garantia do {w.orderNumber})
                                                                      </span>
                                                                  </>
                                                              );
                                                         }
                                                         
                                                         // Verifica se na descrição existe "Referente ao" (para legados)
                                                         const match = w.description.match(/REFERENTE AO ([A-Z0-9-]+)/i);
                                                         if (match) {
                                                             return (
                                                                 <>
                                                                     {w.orderNumber}
                                                                     <span className="text-[9px] text-primary ml-2 font-black uppercase">
                                                                         (Garantia do {match[1]})
                                                                     </span>
                                                                 </>
                                                             );
                                                         }

                                                         return w.orderNumber;
                                                     })()}
                                                 </span>
                                                 {(() => {
                                                     const activeOrder = orders.find(o => o.id === w.orderId || o.notes?.includes(`REFERENTE AO ${w.orderNumber}`));
                                                     if (activeOrder) {
                                                         return (
                                                             <span className="text-[8px] font-bold text-producao uppercase">
                                                                 Status Produção: {STATUS_LABELS[activeOrder.status as OrderStatus] || activeOrder.status.replace('_', ' ')}
                                                             </span>
                                                         );
                                                     }
                                                     return null;
                                                 })()}
                                             </div>
                                             <span className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-0.5 bg-muted rounded-full ml-auto">
                                                 {w.status}
                                             </span>
                                             {w.history && w.history.length > 0 && (
                                                 <HistoryIcon className="w-3.5 h-3.5 text-primary opacity-40 ml-1" />
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
                                        <div className="flex flex-col items-end gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                                {format(new Date(w.createdAt), "dd 'de' MMM", { locale: ptBR })}
                                            </p>
                                             <div className="flex gap-2">
                                                 {isErica && (
                                                     <>
                                                         <button
                                                             onClick={() => {
                                                                 setEditingWarranty(w);
                                                                 const originalOrder = orders.find(o => o.id === w.orderId);
                                                                 setSelectedOrder(originalOrder || null);
                                                                 const [extReason, ...rest] = w.description.split(' - ');
                                                                 setReason(extReason || '');
                                                                 setDescription(rest.join(' - ').split('\n\nITENS EM GARANTIA:')[0] || '');
                                                                 setWarrantyItems([]); 
                                                                 setReceiptUrls(w.receiptUrls || []);
                                                                 setCarrier(w.carrier || '');
                                                                 setShowCreate(true);
                                                                 window.scrollTo({ top: 0, behavior: 'smooth' });
                                                             }}
                                                             className="btn-modern bg-primary/10 text-primary hover:bg-primary/20 p-2 text-[10px] font-black uppercase"
                                                         >
                                                             Editar
                                                         </button>
                                                         <button
                                                             onClick={() => handleCopyTracking(w.id)}
                                                             className="btn-modern bg-primary/10 text-primary hover:bg-primary/20 p-2 text-[10px] font-black uppercase flex items-center gap-1"
                                                         >
                                                             <Share2 className="w-3 h-3" /> Rastreio
                                                         </button>
                                                     </>
                                                 )}
                                                 <button
                                                     onClick={() => setViewingWarranty(w)}
                                                     className="btn-modern bg-muted text-foreground p-2 text-[10px] font-bold hover:bg-primary/5 hover:text-primary"
                                                 >
                                                     Ver Histórico
                                                 </button>
                                             </div>
                                        </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : activeTab === 'sistema_antigo' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="lg:col-span-8 flex flex-col justify-center bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/60 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400 group-hover:h-3 transition-all" />
                        <div className="absolute top-10 right-10 opacity-5 rotate-12 flex -z-0">
                            <Plus className="w-64 h-64 text-primary" />
                        </div>
                        
                        <div className="relative z-10 max-w-lg">
                            <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 text-primary shadow-inner">
                                <Plus className="w-10 h-10" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter">Entrada Manual de Garantia</h2>
                            <p className="text-lg text-slate-500 mb-10 font-medium leading-relaxed">
                                Ferramenta especializada para Erica processar pedidos do <span className="text-primary font-bold">legado (Sistema Antigo)</span> que ainda não constam na base atual.
                            </p>
                            <button
                                onClick={() => {
                                    setIsManual(true);
                                    setSelectedOrder({ id: 'manual', number: 'MANUAL', clientName: '', clientId: '', sellerId: '', sellerName: '', items: [], subtotal: 0, taxes: 0, total: 0, status: 'rascunho', notes: '', createdAt: '', updatedAt: '', statusHistory: [] });
                                    setShowCreate(true);
                                }}
                                className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[13px] hover:bg-primary hover:shadow-2xl hover:shadow-primary/40 transition-all duration-500 hover:-translate-y-1"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                Abrir Pedido Externo
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-xl">
                            <h3 className="text-[12px] font-black text-slate-900 uppercase mb-8 tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" /> Protocolo de Uso
                            </h3>
                            <ul className="space-y-6">
                                {[
                                    { text: "Identifique o número exato do pedido antigo (Ex: D.3232)", color: "primary" },
                                    { text: "Vincule ao cadastro correto do cliente no novo sistema", color: "blue-500" },
                                    { text: "O pedido entrará direto na fila de produção da fábrica", color: "emerald-500" },
                                    { text: "Assistências não afetam métricas de faturamento do comercial", color: "amber-500" }
                                ].map((item, idx) => (
                                    <li key={idx} className="flex gap-4 group">
                                        <div className={`w-8 h-8 rounded-xl bg-${item.color}/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                                            <CheckCircle className={`w-4 h-4 text-${item.color}`} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 leading-snug">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute -bottom-4 -right-4 opacity-10">
                                <Factory className="w-24 h-24" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest mb-2 text-primary">Status Produção</h4>
                            <p className="text-sm text-slate-300 font-medium">Pedidos externos são processados com prioridade padrão de assistência.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card-section p-20 text-center text-muted-foreground font-medium">
                    Selecione uma aba para visualizar o conteúdo.
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
