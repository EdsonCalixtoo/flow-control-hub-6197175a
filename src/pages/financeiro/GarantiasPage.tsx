import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, ArrowLeft, Send, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import type { Warranty } from '@/types/erp';
import { formatCurrency } from '@/components/shared/StatusBadge';

const GarantiasPage: React.FC = () => {
    const { warranties, updateWarrantyStatus } = useERP();
    const { user } = useAuth();
    const [selectedW, setSelectedW] = useState<Warranty | null>(null);
    const [resolution, setResolution] = useState('');
    const [loading, setLoading] = useState(false);

    const pendentes = warranties.filter(w => w.status === 'pendente');
    const aprovadas = warranties.filter(w => w.status === 'aprovado' || w.status === 'concluido');

    const handleUpdate = async (status: Warranty['status']) => {
        if (!selectedW) return;
        try {
            setLoading(true);
            await updateWarrantyStatus(selectedW.id, status, resolution);
            setSelectedW(null);
            setResolution('');
            alert(`Garantia ${status} com sucesso.`);
        } catch (err: any) {
            alert('Erro ao atualizar garantia: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (selectedW) {
        return (
            <div className="space-y-6 animate-scale-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="page-header">Análise de Garantia</h1>
                        <p className="page-subtitle">{selectedW.orderNumber} - {selectedW.clientName}</p>
                    </div>
                    <button onClick={() => setSelectedW(null)} className="btn-modern bg-muted text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                </div>

                <div className="card-section p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Pedido</span>
                            <span className="text-sm font-semibold">{selectedW.orderNumber}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Cliente</span>
                            <span className="text-sm font-semibold">{selectedW.clientName}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Produto</span>
                            <span className="text-sm font-semibold">{selectedW.product || '—'}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Data</span>
                            <span className="text-sm font-semibold">{new Date(selectedW.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição do Problema</label>
                        <div className="p-4 rounded-xl bg-muted/10 border border-border/30 text-sm italic">
                            {selectedW.description}
                        </div>
                    </div>

                    {selectedW.receiptUrls && selectedW.receiptUrls.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comprovantes/Fotos</label>
                            <ComprovanteUpload
                                values={selectedW.receiptUrls}
                                onChange={() => { }}
                                readOnly
                            />
                        </div>
                    )}

                    {selectedW.status === 'pendente' ? (
                        <div className="space-y-4 pt-4 border-t border-border/40">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolução/Observações</label>
                                <textarea
                                    className="input-modern min-h-[100px]"
                                    placeholder="Descreva a resolução ou motivo da rejeição..."
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleUpdate('aprovado')}
                                    disabled={loading}
                                    className="btn-primary flex-1 justify-center bg-success text-success-foreground hover:bg-success/90"
                                >
                                    <CheckCircle className="w-4 h-4" /> Aprovar Garantia
                                </button>
                                <button
                                    onClick={() => handleUpdate('rejeitado')}
                                    disabled={loading}
                                    className="btn-modern bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none flex-1 justify-center"
                                >
                                    <XCircle className="w-4 h-4" /> Rejeitar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 pt-4 border-t border-border/40">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolução</label>
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm font-medium">
                                {selectedW.resolution || 'Sem resolução registrada.'}
                            </div>
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
                    <h1 className="page-header">Gestão de Garantias</h1>
                    <p className="page-subtitle">{pendentes.length} solicitações aguardando análise</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Pendentes
                    </h2>
                    {pendentes.length === 0 ? (
                        <div className="card-section p-8 text-center text-muted-foreground text-sm italic">
                            Nenhuma solicitação pendente.
                        </div>
                    ) : (
                        pendentes.map(w => (
                            <div key={w.id} className="card-section p-5 flex items-center justify-between stagger-item border-l-4 border-l-warning">
                                <div>
                                    <p className="font-bold text-sm">{w.orderNumber} - {w.clientName}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.description}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase mt-2">{new Date(w.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <button onClick={() => setSelectedW(w)} className="btn-modern bg-primary/10 text-primary shadow-none text-xs hover:bg-primary/20">
                                    <Eye className="w-3.5 h-3.5" /> Analisar
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Histórico / Finalizadas
                    </h2>
                    {aprovadas.length === 0 ? (
                        <div className="card-section p-8 text-center text-muted-foreground text-sm italic">
                            Nenhum histórico de garantias.
                        </div>
                    ) : (
                        aprovadas.map(w => (
                            <div key={w.id} className="card-section p-5 flex items-center justify-between stagger-item opacity-80">
                                <div>
                                    <p className="font-bold text-sm text-foreground/80">{w.orderNumber} - {w.clientName}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${w.status === 'aprovado' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                                            }`}>
                                            {w.status}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedW(w)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
                                    <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GarantiasPage;
