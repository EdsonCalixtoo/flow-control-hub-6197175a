import React, { useState, useEffect } from 'react';
import { fetchRawRewardSettings, saveRewardSettings, deleteClientRewardSettings, DEFAULT_REWARD_SETTINGS } from '@/lib/rewardSettingsService';
import { toast } from 'sonner';
import { Settings, Save, Loader2, X, AlertTriangle } from 'lucide-react';
import type { RewardSettings } from '@/types/erp';
import { updateClientRewardsAuto } from '@/lib/rewardServiceSupabase';

interface ClientRewardSettingsModalProps {
    clientId: string;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const ClientRewardSettingsModal: React.FC<ClientRewardSettingsModalProps> = ({ clientId, isOpen, onClose, onSaved }) => {
    const [settings, setSettings] = useState<RewardSettings['settings']>(DEFAULT_REWARD_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isCustom, setIsCustom] = useState(false);

    useEffect(() => {
        if (isOpen) loadSettings();
    }, [isOpen]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const raw = await fetchRawRewardSettings(clientId);
            if (raw && raw.settings) {
                setSettings(raw.settings);
                setIsCustom(true);
            } else {
                // Se não tem regra exclusiva, carrega a global apenas para mostrar os defaults no form
                const globalRaw = await fetchRawRewardSettings(null);
                setSettings(globalRaw?.settings || DEFAULT_REWARD_SETTINGS);
                setIsCustom(false);
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
            if (isCustom) {
                await saveRewardSettings(settings, clientId);
                toast.success('Regra exclusiva salva com sucesso!');
            } else {
                await deleteClientRewardSettings(clientId);
                toast.success('Regra exclusiva removida! O cliente agora segue a regra Global.');
            }
            
            // Recalcula as premiações com a nova regra
            await updateClientRewardsAuto(clientId);
            onSaved();
            onClose();
        } catch (error: any) {
            toast.error('Erro ao salvar as configurações: ' + error.message);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tight">Regras de Premiação Exclusivas</h2>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">Defina limites personalizados apenas para este cliente.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                            <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Carregando...</p>
                        </div>
                    ) : (
                        <>
                            {/* Toggle Ativação */}
                            <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox" 
                                        id="useCustom"
                                        checked={isCustom}
                                        onChange={(e) => setIsCustom(e.target.checked)}
                                        className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-background border-border"
                                    />
                                    <label htmlFor="useCustom" className="text-sm font-bold text-foreground cursor-pointer">
                                        Usar regra exclusiva para este cliente
                                    </label>
                                </div>
                                {!isCustom && (
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                        Usando Regra Global
                                    </span>
                                )}
                            </div>

                            <div className={`space-y-6 transition-opacity duration-300 ${isCustom ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                {[
                                    { id: 'tier_1', label: 'Tier 1 (Básico)' },
                                    { id: 'tier_2', label: 'Tier 2 (Intermediário)' }
                                ].map((tier) => {
                                    const tConfig = settings[tier.id as 'tier_1' | 'tier_2'];
                                    return (
                                        <div key={tier.id} className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-4">
                                                {tier.label}
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                                                        Kits Necessários
                                                    </label>
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        value={tConfig.required_kits}
                                                        onChange={(e) => handleUpdateTier(tier.id as any, 'required_kits', parseInt(e.target.value) || 0)}
                                                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
                                                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
                                                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isCustom && (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium leading-relaxed">
                                        Ao salvar, o sistema irá recalcular o histórico deste cliente aplicando esta nova regra imediatamente. As premiações pendentes ou liberadas podem mudar.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-foreground bg-background hover:bg-muted border border-border transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Salvar Regras'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientRewardSettingsModal;
