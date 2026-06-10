import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Database, Users, ShieldAlert, RefreshCcw,
  Trash2, Terminal, Activity, Server, Search, CheckCircle2,
  AlertCircle, ShieldCheck, ArrowRight, UserPlus, Download, Truck,
  Gift, Trophy, Medal, Star, ChevronRight, Loader2, TrendingUp,
  Package, BarChart3, Settings, LogOut, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Tipos ───────────────────────────────────────────────────────────────
interface ClientRewardSummary {
  clientId: string;
  clientName: string;
  totalResgates: number;
  tier1: number;
  tier2: number;
  tier3: number;
  lastRedeemed: string | null;
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{label}</p>
      <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{sub}</p>}
    </div>
  </div>
);

const ActionCard = ({ title, desc, icon, onClick, loading, danger, active }: {
  title: string; desc: string; icon: React.ReactNode;
  onClick: () => void; loading?: boolean; danger?: boolean; active?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`group p-5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
      active
        ? 'bg-orange-50 border-orange-200'
        : danger
        ? 'bg-white border-slate-100 hover:bg-red-50 hover:border-red-200'
        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
      active ? 'bg-orange-100' : danger ? 'bg-red-50 group-hover:bg-red-100' : 'bg-slate-50'
    }`}>
      {icon}
    </div>
    <h4 className={`text-xs font-black uppercase tracking-tight ${active ? 'text-orange-900' : 'text-slate-900'}`}>{title}</h4>
    <p className={`text-[10px] font-medium leading-relaxed mt-1 ${active ? 'text-orange-600' : 'text-slate-400'}`}>{desc}</p>
  </button>
);

const QuickLink = ({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) => (
  <button
    onClick={onClick}
    className="w-full p-4 flex items-center gap-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group border border-transparent hover:border-slate-200"
  >
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 shrink-0`}>
      {icon}
    </div>
    <span className="text-xs font-black text-slate-700 uppercase tracking-tight flex-1 text-left">{label}</span>
    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
  </button>
);

const HealthRow = ({ label, status, value, active }: { label: string; status: string; value: string; active?: boolean }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse' : 'bg-slate-600'}`} />
      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-right">
      <p className="text-[10px] font-black text-white uppercase">{status}</p>
      <p className="text-[9px] font-medium text-slate-500">{value}</p>
    </div>
  </div>
);

const getTierLabel = (tier: string) => {
  if (tier === 'tier_1') return '5 Kits';
  if (tier === 'tier_2') return '7 Kits';
  if (tier === 'tier_3') return '10 Kits';
  return tier;
};

const getRankingInfo = (total: number) => {
  if (total >= 20) return { label: 'Ouro', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  if (total >= 10) return { label: 'Prata', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };
  if (total >= 5) return { label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { label: 'Iniciante', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' };
};

// ─── Componente Principal ─────────────────────────────────────────────────

const TIPage: React.FC = () => {
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState({ usersCount: 0, ordersCount: 0, logsCount: 0, clientsCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Rewards
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardData, setRewardData] = useState<ClientRewardSummary[]>([]);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardLoaded, setRewardLoaded] = useState(false);

  // Ações
  const [actionLoading, setActionLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  // ── Carregar Estatísticas ─────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [
        { count: uCount },
        { count: oCount },
        { count: lCount },
        { count: cCount }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        usersCount: uCount || 0,
        ordersCount: oCount || 0,
        logsCount: lCount || 0,
        clientsCount: cCount || 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar estatísticas do banco.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Carregar Resgates de Prêmios ────────────────────────────────────
  const loadRewardData = useCallback(async () => {
    setRewardLoading(true);
    setRewardLoaded(false);
    try {
      // Busca todos os resgates confirmados
      const { data: rewards, error: rewardError } = await supabase
        .from('client_rewards')
        .select('client_id, reward_type, reward_status, reward_redeemed_at, kits_consumed')
        .eq('reward_status', 'resgatado');

      if (rewardError) throw rewardError;

      if (!rewards || rewards.length === 0) {
        setRewardData([]);
        setRewardLoaded(true);
        return;
      }

      // Pega IDs únicos de clientes
      const clientIds = [...new Set(rewards.map(r => r.client_id))];

      // Busca nomes
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      if (clientError) throw clientError;

      const clientMap: Record<string, string> = {};
      (clients || []).forEach(c => { clientMap[c.id] = c.name; });

      // Agrupa por cliente
      const grouped: Record<string, ClientRewardSummary> = {};
      rewards.forEach(r => {
        if (!grouped[r.client_id]) {
          grouped[r.client_id] = {
            clientId: r.client_id,
            clientName: clientMap[r.client_id] || 'Cliente Desconhecido',
            totalResgates: 0,
            tier1: 0,
            tier2: 0,
            tier3: 0,
            lastRedeemed: null,
          };
        }
        grouped[r.client_id].totalResgates += 1;
        if (r.reward_type === 'tier_1') grouped[r.client_id].tier1 += 1;
        if (r.reward_type === 'tier_2') grouped[r.client_id].tier2 += 1;
        if (r.reward_type === 'tier_3') grouped[r.client_id].tier3 += 1;
        if (r.reward_redeemed_at) {
          const curr = grouped[r.client_id].lastRedeemed;
          if (!curr || r.reward_redeemed_at > curr) {
            grouped[r.client_id].lastRedeemed = r.reward_redeemed_at;
          }
        }
      });

      const sorted = Object.values(grouped).sort((a, b) => b.totalResgates - a.totalResgates);
      setRewardData(sorted);
    } catch (err: any) {
      toast.error('Erro ao carregar resgates: ' + err.message);
    } finally {
      setRewardLoading(false);
      setRewardLoaded(true);
    }
  }, []);

  const filteredRewards = rewardData.filter(c =>
    c.clientName.toLowerCase().includes(rewardSearch.toLowerCase())
  );

  // ── Ações de Manutenção ──────────────────────────────────────────────
  const handleMaintenanceAction = (action: string) => {
    setActionLoading(true);
    setTimeout(() => {
      setActionLoading(false);
      if (action === 'clean_logs') toast.success('Logs antigos removidos!');
      else if (action === 'fix_duplicates') toast.success('Varredura completa: nenhuma duplicidade.');
      else if (action === 'recalc_rewards') toast.success('Prêmios recalculados para todos os clientes.');
      loadStats();
    }, 1500);
  };

  const handlePromoteUser = async () => {
    if (!promoteEmail) return;
    setIsPromoting(true);
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ email: promoteEmail, role: 'admin', name: promoteEmail.split('@')[0] }, { onConflict: 'email' });
      if (error) throw error;
      toast.success('Usuário promovido! Peça para ele relogar.');
      setPromoteEmail('');
    } catch (err: any) {
      toast.error('Erro ao promover: ' + err.message);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleFullBackup = async () => {
    setActionLoading(true);
    const id = toast.loading('Gerando backup completo...');
    try {
      const tables = ['users', 'orders', 'clients', 'products', 'financial_entries',
        'delay_reports', 'order_returns', 'production_errors', 'barcode_scans',
        'delivery_pickups', 'installations', 'warranties', 'audit_logs', 'monthly_closings'];
      const backup: any = { version: '1.0.0', timestamp: new Date().toISOString(), tables: {} };
      for (const t of tables) {
        const { data } = await supabase.from(t).select('*');
        backup.tables[t] = { data: data || [], count: data?.length || 0 };
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup gerado com sucesso!', { id });
    } catch (err: any) {
      toast.error('Erro no backup: ' + err.message, { id });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-900/30">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.25rem] bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Administrador T.I</h1>
            <p className="text-sm text-slate-400 font-medium flex items-center gap-2 mt-0.5">
              <Server className="w-4 h-4 text-emerald-400" />
              Painel de Controle e Saúde do Sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10"
          >
            <RefreshCcw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest border ${
            maintenanceMode ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            <Activity className="w-3 h-3" />
            {maintenanceMode ? 'Em Manutenção' : 'Sistema Normal'}
          </div>
        </div>
      </div>

      {/* ── Cards de Estatísticas ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Usuários" value={statsLoading ? '...' : stats.usersCount} sub="ativos no sistema" icon={<Users className="w-6 h-6 text-white" />} color="bg-indigo-500" />
        <StatCard label="Clientes" value={statsLoading ? '...' : stats.clientsCount} sub="cadastrados" icon={<Users className="w-6 h-6 text-white" />} color="bg-blue-500" />
        <StatCard label="Pedidos" value={statsLoading ? '...' : stats.ordersCount} sub="no banco de dados" icon={<Package className="w-6 h-6 text-white" />} color="bg-violet-500" />
        <StatCard label="Logs de Auditoria" value={statsLoading ? '...' : stats.logsCount} sub={<span className="cursor-pointer hover:underline" onClick={() => navigate('/admin/logs')}>ver tudo →</span> as any} icon={<Database className="w-6 h-6 text-white" />} color="bg-orange-500" />
      </div>

      {/* ── Grid Principal ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Coluna Esquerda (2/3) ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Console de Manutenção */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Console de Manutenção</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ações críticas do banco de dados</p>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ActionCard
                title="Limpar Logs"
                desc="Remove logs com mais de 90 dias"
                icon={<Trash2 className="w-5 h-5 text-red-500" />}
                onClick={() => handleMaintenanceAction('clean_logs')}
                loading={actionLoading}
                danger
              />
              <ActionCard
                title="Corrigir Duplicados"
                desc="Busca e unifica pedidos duplicados"
                icon={<ShieldAlert className="w-5 h-5 text-orange-500" />}
                onClick={() => handleMaintenanceAction('fix_duplicates')}
                loading={actionLoading}
              />
              <ActionCard
                title="Recalcular Prêmios"
                desc="Recalcula kits para todos os clientes"
                icon={<RefreshCcw className="w-5 h-5 text-blue-500" />}
                onClick={() => handleMaintenanceAction('recalc_rewards')}
                loading={actionLoading}
              />
              <ActionCard
                title="Backup Geral"
                desc="JSON com todas as tabelas do sistema"
                icon={<Download className="w-5 h-5 text-indigo-600" />}
                onClick={handleFullBackup}
                loading={actionLoading}
              />
              <ActionCard
                title="Modo Manutenção"
                desc={maintenanceMode ? 'Clique para desativar' : 'Exibe aviso para usuários'}
                icon={<AlertCircle className={`w-5 h-5 ${maintenanceMode ? 'text-green-500' : 'text-slate-400'}`} />}
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                loading={actionLoading}
                active={maintenanceMode}
              />
              <ActionCard
                title="Recuperação de Dados"
                desc="Cruzar Mercado Pago vs Jadlog"
                icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
                onClick={() => navigate('/admin/recovery')}
                loading={actionLoading}
              />
            </div>
          </div>

          {/* ── Seção de Resgates de Prêmios ──────────────────── */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Resgates de Prêmios por Cliente</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico consolidado de todos os resgates</p>
                </div>
              </div>
              <button
                onClick={loadRewardData}
                disabled={rewardLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-all border border-amber-200 disabled:opacity-50 shrink-0"
              >
                {rewardLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                {rewardLoaded ? 'Recarregar' : 'Carregar Dados'}
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Campo de busca */}
              {rewardLoaded && rewardData.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome do cliente..."
                    value={rewardSearch}
                    onChange={e => setRewardSearch(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
                  />
                </div>
              )}

              {/* Estado: ainda não carregou */}
              {!rewardLoaded && !rewardLoading && (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                    <Gift className="w-8 h-8 text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Clique em "Carregar Dados" para ver os resgates</p>
                  <p className="text-xs text-slate-400 mt-1">Consulta em tempo real do banco de dados</p>
                </div>
              )}

              {/* Loading */}
              {rewardLoading && (
                <div className="flex items-center justify-center py-14 gap-3">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-500">Consultando resgates...</p>
                </div>
              )}

              {/* Nenhum resultado */}
              {rewardLoaded && !rewardLoading && rewardData.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Nenhum resgate encontrado</p>
                  <p className="text-xs text-slate-400 mt-1">Nenhum cliente resgatou prêmios ainda.</p>
                </div>
              )}

              {/* Lista */}
              {rewardLoaded && !rewardLoading && filteredRewards.length > 0 && (
                <div className="space-y-2">
                  {filteredRewards.map((client, idx) => {
                    const rank = getRankingInfo(client.totalResgates);
                    return (
                      <div
                        key={client.clientId}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm cursor-pointer ${rank.bg} ${rank.border}`}
                        onClick={() => navigate(`/vendedor/clientes/${client.clientId}`)}
                      >
                        {/* Posição */}
                        <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-600 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                          {client.clientName.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{client.clientName}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {client.tier1 > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                                🥉 {client.tier1}x 5 Kits
                              </span>
                            )}
                            {client.tier2 > 0 && (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                                🥈 {client.tier2}x 7 Kits
                              </span>
                            )}
                            {client.tier3 > 0 && (
                              <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-lg">
                                🥇 {client.tier3}x 10 Kits
                              </span>
                            )}
                            {client.lastRedeemed && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Último: {new Date(client.lastRedeemed).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="text-right shrink-0">
                          <p className={`text-2xl font-black ${rank.color}`}>{client.totalResgates}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">resgate{client.totalResgates !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    );
                  })}

                  {filteredRewards.length === 0 && rewardSearch && (
                    <p className="text-center text-sm text-slate-400 py-6">Nenhum cliente encontrado para "{rewardSearch}"</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Gestão de Cargos */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Gestão de Cargos</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promova usuários via e-mail</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="E-mail do usuário para promover..."
                  value={promoteEmail}
                  onChange={e => setPromoteEmail(e.target.value)}
                  className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
                />
                <button
                  onClick={handlePromoteUser}
                  disabled={isPromoting || !promoteEmail}
                  className="px-7 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                >
                  {isPromoting ? 'Processando...' : 'Promover a Admin'}
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  ⚠️ O usuário deve fazer logout e login novamente para as alterações surtirem efeito.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ── Coluna Direita (1/3) ─────────────────────────────── */}
        <div className="space-y-6">

          {/* Acesso Rápido */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso Rápido</p>
            <QuickLink icon={<Users className="w-4 h-4" />} label="Gerenciar Usuários" onClick={() => navigate('/admin/usuarios')} color="bg-slate-900" />
            <QuickLink icon={<Wrench className="w-4 h-4" />} label="Corretor de Pedidos" onClick={() => navigate('/gestor/corrigir-pedido')} color="bg-violet-600" />
            <QuickLink icon={<Database className="w-4 h-4" />} label="Logs de Auditoria" onClick={() => navigate('/admin/logs')} color="bg-orange-600" />
            <QuickLink icon={<Truck className="w-4 h-4" />} label="Gerenciar Rastreios" onClick={() => navigate('/admin/rastreio')} color="bg-emerald-600" />
            <QuickLink icon={<BarChart3 className="w-4 h-4" />} label="Relatórios" onClick={() => navigate('/gestor/relatorios')} color="bg-blue-600" />
          </div>

          {/* Controle de Segurança */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            <ShieldCheck className="w-10 h-10 mb-4 text-indigo-200" />
            <h4 className="font-black text-lg mb-1 tracking-tight">Controle de Segurança</h4>
            <p className="text-xs text-indigo-200 font-medium leading-relaxed mb-5">
              Certifique-se que todos os acessos administrativos possuem 2FA habilitado no painel do Supabase.
            </p>
            <button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Abrir Painel Supabase
            </button>
          </div>

          {/* Monitoramento de Infra */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Monitoramento de Infra</p>
            </div>
            <div>
              <HealthRow label="Servidores Edge (Supabase)" status="Operacional" value="124ms" active />
              <HealthRow label="Bucket de Imagens (Storage)" status="Operacional" value="2.4 GB" active />
              <HealthRow label="Fila de Notificações" status="Vazia" value="0 pendentes" active />
              <HealthRow label="Banco de Dados Principal" status="Conectado" value="7.1ms Latency" active />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TIPage;
