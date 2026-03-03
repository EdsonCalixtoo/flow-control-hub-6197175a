import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, ArrowLeft, Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import type { Warranty, Order } from '@/types/erp';
import { formatCurrency } from '@/components/shared/StatusBadge';

const GarantiasPage: React.FC = () => {
    const { orders, warranties, addWarranty } = useERP();
    const { user } = useAuth();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [description, setDescription] = useState('');
    const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const myWarranties = warranties.filter(w =>
        orders.find(o => o.number === w.orderNumber)?.sellerId === user?.id
    );

    const handleCreate = async () => {
        if (!selectedOrder || !description) {
            alert('Selecione um pedido e descreva o problema.');
            return;
        }

        try {
            setLoading(true);
            await addWarranty({
                orderId: selectedOrder.id,
                orderNumber: selectedOrder.number,
                clientId: selectedOrder.clientId,
                clientName: selectedOrder.clientName,
                product: selectedOrder.items[0]?.product || 'Produto não especificado',
                description,
                status: 'pendente',
                receiptUrls,
            });
            setShowCreate(false);
            setSelectedOrder(null);
            setDescription('');
            setReceiptUrls([]);
            alert('Solicitação de garantia enviada com sucesso!');
        } catch (err: any) {
            alert('Erro ao enviar garantia: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (showCreate) {
        return (
            <div className="space-y-6 animate-scale-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-header">Abrir Garantia</h1>
                        <p className="page-subtitle">Selecione o pedido e descreva o problema</p>
                    </div>
                    <button onClick={() => setShowCreate(false)} className="btn-modern bg-muted text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                </div>

                <div className="card-section p-6 space-y-4">
                    {!selectedOrder ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar pedido por número ou cliente..."
                                    className="input-modern pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                {orders
                                    .filter(o =>
                                        (o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            o.clientName.toLowerCase().includes(searchTerm.toLowerCase())) &&
                                        o.sellerId === user?.id
                                    )
                                    .slice(0, 5)
                                    .map(order => (
                                        <button
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="w-full p-4 rounded-xl border border-border hover:border-primary/50 text-left transition-colors"
                                        >
                                            <p className="font-bold text-sm">{order.number}</p>
                                            <p className="text-xs text-muted-foreground">{order.clientName} • {formatCurrency(order.total)}</p>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-primary">Pedido Selecionado</p>
                                    <p className="text-sm font-semibold">{selectedOrder.number} - {selectedOrder.clientName}</p>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-xs text-primary hover:underline">Alterar</button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição do Problema</label>
                                <textarea
                                    className="input-modern min-h-[100px]"
                                    placeholder="Descreva o problema relatado pelo cliente..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fotos/Comprovantes (opcional)</label>
                                <ComprovanteUpload
                                    values={receiptUrls}
                                    onChange={setReceiptUrls}
                                />
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={loading || !description}
                                className="btn-primary w-full justify-center"
                            >
                                <Send className="w-4 h-4" /> {loading ? 'Enviando...' : 'Enviar Solicitação'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-header">Minhas Garantias</h1>
                    <p className="page-subtitle">Acompanhe as solicitações de garantia</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nova Garantia
                </button>
            </div>

            <div className="grid gap-4">
                {myWarranties.length === 0 ? (
                    <div className="card-section p-12 text-center text-muted-foreground">
                        Nenhuma garantia aberta.
                    </div>
                ) : (
                    myWarranties.map(w => (
                        <div key={w.id} className="card-section p-5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm">{w.orderNumber}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${w.status === 'pendente' ? 'bg-warning/10 text-warning' :
                                            w.status === 'aprovado' ? 'bg-success/10 text-success' :
                                                w.status === 'concluido' ? 'bg-primary/10 text-primary' :
                                                    'bg-destructive/10 text-destructive'
                                        }`}>
                                        {w.status}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground font-medium">{w.clientName}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{w.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground mb-2">
                                    {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GarantiasPage;
