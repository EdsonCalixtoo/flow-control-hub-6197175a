import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Trophy, CheckCircle2, Clock, Star, Medal, ChevronRight, Loader2, Package, RotateCcw } from 'lucide-react';
import {
    calculateClientRanking,
    fetchClientRewards,
    redeemReward,
    resetReward,
    updateClientRewardsAuto
} from '@/lib/rewardServiceSupabase';
import type { ClientReward, ClientRanking } from '@/types/erp';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ClientRewardTabProps {
    clientId: string;
}

const ClientRewardTab: React.FC<ClientRewardTabProps> = ({ clientId }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ranking, setRanking] = useState<ClientRanking | null>(null);
    const [rewards, setRewards] = useState<ClientReward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);
    const [redeemQuantities, setRedeemQuantities] = useState<Record<string, number>>({});
    const [resettingId, setResettingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Primeiro atualiza automaticamente para garantir que os dados estão sincronizados
            await updateClientRewardsAuto(clientId);

            const [rankingData, rewardsData] = await Promise.all([
                calculateClientRanking(clientId),
                fetchClientRewards(clientId)
            ]);
            setRanking(rankingData);
            setRewards(rewardsData);
        } catch (error) {
            console.error('Erro ao carregar dados de premiação:', error);
            toast.error('Erro ao carregar premiações');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clientId]);

    const handleRedeem = async (reward: ClientReward) => {
        const qty = redeemQuantities[reward.id] || 1;
        setRedeemingId(reward.id);
        try {
            const success = await redeemReward(reward.id, qty);
            if (success) {
                toast.success(`${qty} Prêmio(s) registrado(s)! Redirecionando para o orçamento...`);
                // Aguarda um pouco para o usuário ver a mensagem antes de redirecionar
                setTimeout(() => {
                    navigate('/vendedor/orcamentos', {
                        state: {
                            clientId,
                            reward: {
                                id: reward.id,
                                type: reward.rewardType,
                                quantity: qty
                            }
                        }
                    });
                }, 1000);
            } else {
                toast.error('Erro ao resgatar prêmio');
            }
        } finally {
            setRedeemingId(null);
        }
    };

    const handleReset = async (reward: ClientReward) => {
        if (user?.role === 'vendedor') {
            toast.error('Você não tem permissão para zerar premiações.');
            return;
        }

        if (!window.confirm('Tem certeza que deseja zerar a pontuação atual deste prêmio? Esta ação criará um ajuste negativo para compensar os kits atuais.')) {
            return;
        }

        setResettingId(reward.id);
        try {
            const success = await resetReward(reward.id, reward.kitsCompleted);
            if (success) {
                toast.success('Pontuação zerada com sucesso!');
                loadData(); // Recarregar dados
            } else {
                toast.error('Erro ao zerar pontuação');
            }
        } finally {
            setResettingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 className="w-10 h-10 text-vendedor animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Calculando premiações...</p>
            </div>
        );
    }

    const getRewardTitle = (type: string) => {
        switch (type) {
            case 'tier_1': return '1ª Premiação (5 Kits)';
            case 'tier_2': return '2ª Premiação (7 Kits - Valor Cheio)';
            case 'tier_3': return '3ª Premiação (10 Kits - Promoção)';
            default: return 'Premiação';
        }
    };

    const getRewardDescription = (type: string) => {
        switch (type) {
            case 'tier_1': return 'Prêmio: 1 Plaquinha de Nylon';
            case 'tier_2': return 'Prêmio: 1 Kit Completo';
            case 'tier_3': return 'Prêmio: 1 Kit Completo';
            default: return '';
        }
    };

    const getRankingIcon = (r: string) => {
        switch (r) {
            case 'Ouro': return <Trophy className="w-8 h-8 text-yellow-500" />;
            case 'Prata': return <Medal className="w-8 h-8 text-slate-400" />;
            case 'Bronze': return <Medal className="w-8 h-8 text-amber-700" />;
            default: return <Star className="w-8 h-8 text-muted-foreground/30" />;
        }
    };

    const getRankingColor = (r: string) => {
        switch (r) {
            case 'Ouro': return 'from-yellow-500/20 to-yellow-600/5 text-yellow-600 border-yellow-500/20';
            case 'Prata': return 'from-slate-400/20 to-slate-500/5 text-slate-600 border-slate-400/20';
            case 'Bronze': return 'from-amber-700/20 to-amber-800/5 text-amber-800 border-amber-700/20';
            default: return 'from-muted/50 to-muted/20 text-muted-foreground border-border/50';
        }
    };

    const isDeveloperOrGestor = user?.role === 'admin' || user?.role === 'gestor';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Ranking Header Card */}
            <div className={`p-6 rounded-[24px] border bg-gradient-to-br flex items-center gap-6 shadow-sm ${ranking ? getRankingColor(ranking.ranking) : ''}`}>
                <div className="w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    {ranking && getRankingIcon(ranking.ranking)}
                </div>
                <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">Ranking {ranking?.ranking || 'Nenhum'}</h3>
                    <p className="text-sm font-medium opacity-80">Total de Kits Comprados: <span className="font-bold">{ranking?.totalKits || 0}</span></p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase opacity-60">Próximo Nível</p>
                        <p className="text-xs font-bold">
                            {ranking?.ranking === 'Nenhum' ? 'Bronze (5 kits)' :
                                ranking?.ranking === 'Bronze' ? 'Prata (10 kits)' :
                                    ranking?.ranking === 'Prata' ? 'Ouro (20 kits)' : 'Nível Máximo Atingido!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Kit Breakdown */}
            {ranking && ranking.breakdown.length > 0 && (
                <div className="card-section p-6 space-y-4">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-vendedor" /> Detalhamento de Kits Comprados
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {ranking.breakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                                <span className="text-xs font-semibold text-foreground truncate mr-2" title={item.product}>
                                    {item.product}
                                </span>
                                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-vendedor/10 text-vendedor">
                                    {item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 gap-4">
                {rewards.map((reward) => {
                    const isLiberado = reward.rewardStatus === 'liberado';
                    const isResgatado = reward.rewardStatus === 'resgatado';
                    const progress = Math.min(100, (reward.kitsCompleted / reward.kitsRequired) * 100);

                    return (
                        <div
                            key={reward.id}
                            className={`card-section p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 ${isLiberado ? 'ring-2 ring-success/30 border-success/30 bg-success/5' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all ${isResgatado ? 'bg-muted text-muted-foreground' :
                                    isLiberado ? 'bg-success text-white scale-110' : 'bg-primary/10 text-primary'
                                    }`}>
                                    {isResgatado ? <CheckCircle2 className="w-7 h-7" /> : <Gift className="w-7 h-7" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground flex items-center gap-2">
                                        {getRewardTitle(reward.rewardType)}
                                        {isLiberado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success text-white animate-pulse">LIBERADO!</span>}
                                        {isResgatado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">RESGATADO</span>}
                                    </h4>
                                    <p className="text-xs text-muted-foreground font-medium italic">{getRewardDescription(reward.rewardType)}</p>

                                    {/* Progress Bar */}
                                    {!isResgatado && (
                                        <div className="mt-3 w-full md:w-64">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-1">
                                                <span>Progresso</span>
                                                <span>{reward.kitsCompleted} / {reward.kitsRequired} Kits</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${isLiberado ? 'bg-success' : 'bg-vendedor'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {isResgatado && (
                                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Resgatado em {new Date(reward.rewardRedeemedAt!).toLocaleDateString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {isLiberado && (
                                    <div className="flex flex-col gap-2">
                                        {(() => {
                                            const availableCount = Math.floor(reward.kitsCompleted / reward.kitsRequired);
                                            const currentQty = redeemQuantities[reward.id] || 1;
                                            
                                            if (availableCount <= 1) return null;

                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-success uppercase text-center">{availableCount} Prêmios Disponíveis</span>
                                                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-success/30 p-1 shadow-sm">
                                                        <button 
                                                            onClick={() => setRedeemQuantities(prev => ({ ...prev, [reward.id]: Math.max(1, (prev[reward.id] || 1) - 1) }))}
                                                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-foreground font-black transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <div className="w-10 text-center text-sm font-black text-foreground">
                                                            {currentQty}
                                                        </div>
                                                        <button 
                                                            onClick={() => setRedeemQuantities(prev => ({ ...prev, [reward.id]: Math.min(availableCount, (prev[reward.id] || 1) + 1) }))}
                                                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-foreground font-black transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        
                                        <button
                                            onClick={() => handleRedeem(reward)}
                                            disabled={redeemingId === reward.id}
                                            className="btn-primary bg-success hover:bg-success/90 border-none shadow-lg shadow-success/20 py-3 px-6 h-auto text-sm font-bold flex items-center gap-2"
                                        >
                                            {redeemingId === reward.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trophy className="w-4 h-4" />
                                            )}
                                            RESGATAR {redeemQuantities[reward.id] > 1 ? `${redeemQuantities[reward.id]} PRÊMIOS` : 'PRÊMIO'}
                                        </button>
                                    </div>
                                )}

                                {!isLiberado && !isResgatado && (
                                    <div className="flex items-center gap-3">
                                        <div className="px-4 py-2 rounded-xl bg-muted/50 text-muted-foreground text-[11px] font-black uppercase tracking-wider flex items-center gap-2">
                                            Faltam {Math.max(0, reward.kitsRequired - reward.kitsCompleted)} kits <ChevronRight className="w-3 h-3" />
                                        </div>
                                        {reward.kitsCompleted > 0 && isDeveloperOrGestor && (
                                            <button
                                                onClick={() => handleReset(reward)}
                                                disabled={resettingId === reward.id}
                                                className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-transparent hover:border-destructive/20"
                                                title="Zerar progressão atual"
                                            >
                                                {resettingId === reward.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="w-4 h-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ranking Tooltip/Info */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Bronze', kits: 5, color: 'text-amber-700', bg: 'bg-amber-700/10' },
                    { label: 'Prata', kits: 10, color: 'text-slate-400', bg: 'bg-slate-400/10' },
                    { label: 'Ouro', kits: 20, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                ].map(lvl => (
                    <div key={lvl.label} className={`p-4 rounded-2xl border ${lvl.bg} border-transparent flex flex-col items-center text-center gap-1`}>
                        <p className={`text-[10px] font-black uppercase ${lvl.color}`}>{lvl.label}</p>
                        <p className="text-sm font-bold text-foreground">{lvl.kits} Kits</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClientRewardTab;
