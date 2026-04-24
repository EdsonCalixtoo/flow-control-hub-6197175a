import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useERP } from '@/contexts/ERPContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
    ArrowLeft, User, Phone, Mail, MapPin, Star, ShoppingCart,
    History, ExternalLink, MessageCircle, Edit, FileUp, Loader2, CheckCircle2, Trophy, Medal
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ClientRewardTab from '@/components/Client/ClientRewardTab';
import { calculateClientRanking } from '@/lib/rewardServiceSupabase';
import type { ClientRanking } from '@/types/erp';
import { uploadToR2, generateR2Path } from '@/lib/storageServiceR2';

const ClienteDetalhesPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { clients, orders } = useERP();
    const { theme } = useThemeContext();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isDark = theme === 'dark';
    const { updateOrderStatus } = useERP();
    const [uploadingOrderId, setUploadingOrderId] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<'pedidos' | 'premiação'>('pedidos');
    const [ranking, setRanking] = React.useState<ClientRanking | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [fileInputKey, setFileInputKey] = React.useState(0);

    React.useEffect(() => {
        if (id) {
            calculateClientRanking(id).then(setRanking);
        }
    }, [id]);

    const client = clients.find(c => c.id === id);

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Cliente não encontrado</h2>
                <button onClick={() => navigate('/vendedor/clientes')} className="btn-modern bg-muted text-foreground mt-4">
                    <ArrowLeft className="w-4 h-4" /> Voltar para lista
                </button>
            </div>
        );
    }

    const handleFileUpload = async (orderId: string, file: File) => {
        setUploadingOrderId(orderId);
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            // ☁️ Upload para o R2 em vez de Base64 no banco de dados
            const path = generateR2Path(file, orderId);
            const publicUrl = await uploadToR2(file, path);

            const updatedReceipts = [...(order.receiptUrls || []), publicUrl];

            await updateOrderStatus(
                orderId,
                order.status, // manter status atual
                { receiptUrls: updatedReceipts },
                'Vendedor',
                'Comprovante adicionado via Detalhes do Cliente'
            );

            toast.success('Comprovante enviado com sucesso!');
            setFileInputKey(prev => prev + 1);
        } catch (err: any) {
            toast.error('Erro ao enviar comprovante: ' + (err.message || 'Verifique se você tem permissão para editar este pedido.'));
        } finally {
            setUploadingOrderId(null);
        }
    };

    const clientOrders = orders
        .filter(o => o.clientId === client.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <>
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            {/* Header com Navegação */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/vendedor/clientes')}
                        className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="page-header">{client.name}</h1>
                        <p className="page-subtitle">{client.cpfCnpj} • Cliente desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/vendedor/orcamentos', { state: { clientId: client.id } })}
                    >
                        <ShoppingCart className="w-4 h-4" /> Novo Orçamento
                    </button>
                    <button
                        onClick={() => window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank')}
                        className="btn-modern bg-[#25D366] text-white border-none"
                    >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Lateral: Dados do Cliente */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card-section p-6 space-y-6">
                        <div className="flex flex-col items-center text-center pb-6 border-b border-border/40">
                            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-vendedor to-vendedor/60 flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4">
                                {client.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-lg font-bold text-foreground">{client.name}</h2>
                            {client.consignado && (
                                <span className="mt-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-amber-500" /> Consignado
                                </span>
                            )}
                            {ranking && ranking.ranking !== 'Nenhum' && (
                                <span className={`mt-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${ranking.ranking === 'Ouro' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                    ranking.ranking === 'Prata' ? 'bg-slate-400/10 text-slate-500 border-slate-400/20' :
                                        'bg-amber-700/10 text-amber-700 border-amber-700/20'
                                    }`}>
                                    <Medal className="w-3 h-3" /> Cliente {ranking.ranking}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> Contato
                                </p>
                                <p className="text-sm font-semibold text-foreground">{client.phone || '—'}</p>
                                <p className="text-xs text-muted-foreground">{client.email || 'Sem e-mail'}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Endereço
                                </p>
                                <p className="text-sm font-semibold text-foreground leading-relaxed">
                                    {client.address}<br />
                                    {client.bairro && `${client.bairro}, `}{client.city}/{client.state}<br />
                                    {client.cep}
                                </p>
                            </div>

                            {client.notes && (
                                <div className="pt-4 border-t border-border/40">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Observações</p>
                                    <p className="text-xs text-muted-foreground italic leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                        "{client.notes}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs Navigation */}
                    <div className="flex items-center border-b border-border/40 gap-8">
                        <button
                            onClick={() => setActiveTab('pedidos')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'pedidos' ? 'text-vendedor' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4" /> Histórico de Pedidos
                            </div>
                            {activeTab === 'pedidos' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-vendedor rounded-t-full" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('premiação')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'premiação' ? 'text-vendedor' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4" /> Premiação do Cliente
                            </div>
                            {activeTab === 'premiação' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-vendedor rounded-t-full" />}
                        </button>
                    </div>

                    {activeTab === 'pedidos' ? (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-vendedor" /> Pedidos realizados
                                </h3>
                                <span className="text-xs text-muted-foreground font-medium">{clientOrders.length} pedido(s)</span>
                            </div>

                            {clientOrders.length === 0 ? (
                                <div className="card-section p-12 text-center border-dashed">
                                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                        <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Nenhum pedido realizado para este cliente ainda.</p>
                                    <button
                                        onClick={() => navigate('/vendedor/orcamentos', { state: { clientId: client.id } })}
                                        className="btn-modern bg-muted text-foreground mt-4 shadow-none"
                                    >
                                        Criar primeiro orçamento
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {clientOrders.map(order => (
                                        <div
                                            key={order.id}
                                            onClick={() => navigate(`/vendedor/orcamentos?view=${order.id}`)}
                                            className="card-section p-4 flex items-center justify-between group cursor-pointer hover:border-vendedor/40 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex flex-col items-center justify-center text-[10px] font-black group-hover:bg-vendedor/10 group-hover:text-vendedor transition-colors">
                                                    <span>{new Date(order.createdAt).getDate()}</span>
                                                    <span className="uppercase opacity-60">{new Date(order.createdAt).toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-foreground">#{order.number}</span>
                                                        <StatusBadge status={order.status} />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                                        {order.items.length} item(s) • Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col items-end mr-2">
                                                    {order.receiptUrls && order.receiptUrls.length > 0 && (
                                                        <div className="flex -space-x-2 mb-1">
                                                            {order.receiptUrls.slice(0, 3).map((url, idx) => (
                                                                <button 
                                                                    key={idx} 
                                                                    onClick={(e) => { e.stopPropagation(); setPreviewUrl(url); }}
                                                                    className="w-6 h-6 rounded-full bg-success flex items-center justify-center ring-2 ring-background hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                                                                    title="Clique para visualizar"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                                </button>
                                                            ))}
                                                            {order.receiptUrls.length > 3 && (
                                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-black ring-2 ring-background">
                                                                    +{order.receiptUrls.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const isOwner = user?.role !== 'vendedor' || order.sellerId === user.id;
                                                        return (
                                                            <>
                                                                <input
                                                                    key={fileInputKey}
                                                                    type="file"
                                                                    id={`file-${order.id}`}
                                                                    className="hidden"
                                                                    accept="image/*,.pdf"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleFileUpload(order.id, file);
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (!isOwner) {
                                                                            toast.error('Você só pode anexar comprovantes em seus próprios pedidos.');
                                                                            return;
                                                                        }
                                                                        document.getElementById(`file-${order.id}`)?.click();
                                                                    }}
                                                                    disabled={uploadingOrderId === order.id}
                                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${uploadingOrderId === order.id
                                                                        ? 'bg-muted animate-pulse'
                                                                        : isOwner
                                                                            ? 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                                                            : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                                                                        }`}
                                                                    title={isOwner ? "Anexar Comprovante" : "Somente o vendedor do pedido pode anexar comprovantes"}
                                                                >
                                                                    {uploadingOrderId === order.id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <FileUp className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </>
                                                        );
                                                    })()}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/vendedor/orcamentos?view=${order.id}`);
                                                        }}
                                                        className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-vendedor hover:text-white transition-all shadow-sm"
                                                        title="Ver Detalhes"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <ClientRewardTab clientId={client.id} />
                    )}
                </div>
            </div>
        </div>

        {/* Modal de Visualização Global */}
        {previewUrl && (
            <div 
                className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={() => setPreviewUrl(null)}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10" onClick={e => e.stopPropagation()}>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Visualização do Comprovante</h2>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = previewUrl;
                                a.download = previewUrl.includes('pdf') ? 'comprovante.pdf' : 'comprovante.jpg';
                                a.click();
                            }}
                            className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all font-inter"
                        >
                            Download
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }}
                            className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg"
                        >
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                    {previewUrl.startsWith('data:application/pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
                        <iframe src={previewUrl} title="Documento" className="w-full max-w-5xl h-full rounded-2xl bg-white border-none shadow-2xl" />
                    ) : (
                        <img src={previewUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    )}
                </div>
            </div>
        )}
        </>
    );
};

export default ClienteDetalhesPage;
