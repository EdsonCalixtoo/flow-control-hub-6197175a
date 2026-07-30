import React, { useState, useEffect } from 'react';
import { fetchRawRewardSettings, saveRewardSettings, DEFAULT_REWARD_SETTINGS } from '@/lib/rewardSettingsService';
import { toast } from 'sonner';
import { Settings, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RewardSettings } from '@/types/erp';

const AdminRewardRulesPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<RewardSettings['settings']>(DEFAULT_REWARD_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const raw = await fetchRawRewardSettings(null); // NULL = Global
            if (raw && raw.settings) {
                setSettings(raw.settings);
            }
        } catch (error: any) {
            toast.error('Erro ao carregar configurações: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const success = await saveRewardSettings(settings, null);
            if (success) {
                toast.success('Regras globais de premiação salvas com sucesso!');
            } else {
                toast.error('Ocorreu um erro ao salvar as configurações.');
            }
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTier = (tier: 'tier_1' | 'tier_2', field: string, value: number) => {
        setSettings(prev => ({
            ...prev,
            [tier]: {
                ...prev[tier],
                [field]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Carregando Regras Globais...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <button 
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para o Painel
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                        <Settings className="w-8 h-8 text-amber-500" /> 
                        Regras de Premiação
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">Configure as regras padrão para todos os clientes do sistema.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors shadow-lg disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="grid gap-6">
                {[
                    { id: 'tier_1', label: 'Tier 1 (Básico)' },
                    { id: 'tier_2', label: 'Tier 2 (Intermediário)' }
                ].map((tier) => {
                    const tConfig = settings[tier.id as 'tier_1' | 'tier_2'];
                    return (
                        <div key={tier.id} className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
                            <h2 className="text-lg font-black uppercase tracking-tight text-foreground mb-6 pb-4 border-b border-border/50">
                                {tier.label}
                            </h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                                        Kits Necessários
                                    </label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={tConfig.required_kits}
                                        onChange={(e) => handleUpdateTier(tier.id as any, 'required_kits', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                                        Preço Mínimo (R$)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={tConfig.min_price}
                                        onChange={(e) => handleUpdateTier(tier.id as any, 'min_price', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                                        Preço Máximo (R$)
                                    </label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={tConfig.max_price}
                                        onChange={(e) => handleUpdateTier(tier.id as any, 'max_price', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-700 dark:text-amber-400">
                <p className="text-sm font-medium">
                    <strong>Atenção:</strong> Ao salvar, estas regras passarão a valer imediatamente para todos os clientes que não possuírem uma regra exclusiva configurada nos seus respectivos perfis.
                </p>
            </div>
        </div>
    );
};

export default AdminRewardRulesPage;
