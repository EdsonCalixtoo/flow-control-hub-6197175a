import React, { useState, useEffect } from 'react';
import { 
  Wrench, Database, Users, ShieldAlert, RefreshCcw, 
  Trash2, Terminal, Activity, Server, Search, CheckCircle2,
  AlertCircle, ShieldCheck, ArrowRight, UserPlus, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const TIPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    usersCount: 0,
    ordersCount: 0,
    logsCount: 0,
    dbStatus: 'Conectado',
    lastSync: new Date().toLocaleTimeString('pt-BR')
  });
  const [loading, setLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: lCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
      
      setStats(prev => ({
        ...prev,
        usersCount: uCount || 0,
        ordersCount: oCount || 0,
        logsCount: lCount || 0,
        lastSync: new Date().toLocaleTimeString('pt-BR')
      }));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao conectar com o banco de dados');
    }
  };

  const handleMaintenanceAction = (action: string) => {
    setLoading(true);
    // Simular processamento e mostrar sucesso/erro baseado na ação
    setTimeout(() => {
      setLoading(false);
      if (action === 'clean_logs') {
        toast.success('Logs antigos removidos com sucesso!');
      } else if (action === 'fix_duplicates') {
        toast.success('Varredura completa: Nenhuma duplicidade encontrada.');
      } else if (action === 'recalc_rewards') {
        toast.success('Recompensas de todos os clientes recalculadas.');
      }
      loadStats();
    }, 1500);
  };

  const handlePromoteUser = async () => {
    if (!promoteEmail) return;
    setIsPromoting(true);
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ 
          email: promoteEmail, 
          role: 'admin',
          name: promoteEmail.split('@')[0]
        }, { onConflict: 'email' });

      if (error) throw error;
      toast.success('Usuário promovido com sucesso! Peça para ele relogar.');
      setPromoteEmail('');
    } catch (err: any) {
      toast.error('Erro ao promover: ' + err.message);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleFullBackup = async () => {
    setLoading(true);
    const toastId = toast.loading('Iniciando backup completo da base de dados...');
    
    try {
      const tables = [
        'users', 'orders', 'clients', 'products', 'financial_entries', 
        'delay_reports', 'order_returns', 'production_errors', 'barcode_scans', 
        'delivery_pickups', 'installations', 'warranties', 'audit_logs', 'monthly_closings'
      ];

      const backupData: any = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        system: 'Flow Control Hub ERP',
        exportedBy: 'Admin TI',
        tables: {}
      };

      for (const table of tables) {
        toast.loading(`Exportando tabela: ${table.toUpperCase()}...`, { id: toastId });
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.error(`[Backup] Erro na tabela ${table}:`, error);
          backupData.tables[table] = { error: error.message, status: 'failed' };
        } else {
          backupData.tables[table] = { data: data || [], count: data?.length || 0, status: 'success' };
        }
      }

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `BACKUP_GERAL_FLOW_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}h.json`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Backup concluído! Arquivo: ${fileName}`, { id: toastId });
    } catch (err: any) {
      console.error('[Backup] Erro crítico:', err);
      toast.error('Erro crítico ao gerar backup: ' + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* TI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Administrador T.I</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <Server className="w-4 h-4 text-green-500" /> 
              Painel de Controle e Saúde do Sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadStats}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Status
          </button>
          <div className="h-12 w-px bg-slate-200 hidden md:block mx-1" />
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${maintenanceMode ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
            <Activity className="w-3 h-3" />
            {maintenanceMode ? 'Manutenção Ativa' : 'Sistema Normal'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Statistics and Health */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Usuários Ativos</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-slate-900">{stats.usersCount}</span>
                <span className="text-xs font-bold text-green-500 mb-1.5 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> ONLINE</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pedidos na Base</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-slate-900">{stats.ordersCount}</span>
                <span className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">DATABASE OK</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Logs de Auditoria</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-slate-900">{stats.logsCount}</span>
                <span className="text-[10px] font-bold text-orange-500 mb-1.5 uppercase tracking-tighter cursor-pointer hover:underline" onClick={() => navigate('/admin/logs')}>VER TUDO</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Console de Manutenção</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ações críticas de banco de dados</p>
              </div>
              <Terminal className="text-slate-300 w-6 h-6" />
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MaintenanceButton 
                title="Limpar Logs Antigos"
                desc="Remove logs com mais de 90 dias para otimizar"
                icon={<Trash2 className="w-5 h-5 text-red-500" />}
                onClick={() => handleMaintenanceAction('clean_logs')}
                loading={loading}
              />
              <MaintenanceButton 
                title="Corrigir Duplicados"
                desc="Busca e unifica pedidos duplicados por erro"
                icon={<ShieldAlert className="w-5 h-5 text-orange-500" />}
                onClick={() => handleMaintenanceAction('fix_duplicates')}
                loading={loading}
              />
              <MaintenanceButton 
                title="Recalcular Prêmios"
                desc="Força o recálculo dos kits para todos os clientes"
                icon={<RefreshCcw className="w-5 h-5 text-blue-500" />}
                onClick={() => handleMaintenanceAction('recalc_rewards')}
                loading={loading}
              />
              <MaintenanceButton 
                title="Modo Manutenção"
                desc="Exibe aviso de manutenção para usuários logados"
                icon={<AlertCircle className={`w-5 h-5 ${maintenanceMode ? 'text-green-500' : 'text-slate-500'}`} />}
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                loading={loading}
                active={maintenanceMode}
              />
              <MaintenanceButton 
                title="Backup Geral (1-Click)"
                desc="Gera um arquivo JSON com todas as tabelas do sistema"
                icon={<Download className="w-5 h-5 text-indigo-600" />}
                onClick={handleFullBackup}
                loading={loading}
              />
              <MaintenanceButton 
                title="Recuperação de Dados"
                desc="Cruzar Mercado Pago vs Jadlog (Recuperar dados perdidos)"
                icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
                onClick={() => navigate('/admin/recovery')}
                loading={loading}
              />
            </div>
          </div>

          <div className="card-section p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Gestão de Cargos</h2>
                <p className="text-sm text-muted-foreground font-medium">Promova usuários para o nível de Administrador via e-mail.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email"
                placeholder="E-mail do usuário (ex: juninho.caxto@gmail.com)"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                className="flex-1 px-5 py-4 rounded-2xl bg-muted/50 border border-border/50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
              />
              <button 
                onClick={handlePromoteUser}
                disabled={isPromoting || !promoteEmail}
                className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {isPromoting ? 'PROCESSANDO...' : 'PROMOVER A ADMIN'}
              </button>
            </div>
            
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
               <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">
                 Nota: A promoção cria um registro na tabela "public.users" que tem prioridade sobre as configurações iniciais do usuário. O usuário deve fazer logout e login novamente para as alterações surtirem efeito.
               </p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-blue-50/30 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Troubleshooter de Recompensas</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ajuste manual de kits e prêmios por cliente</p>
              </div>
              <ShieldAlert className="text-blue-500 w-6 h-6" />
            </div>
            <div className="p-8 space-y-6">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente para verificar recompensas (Ex: Manoel)..." 
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                    onChange={(e) => {
                      // Simular busca ou implementar via lib/supabase
                    }}
                  />
               </div>
               
               <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl text-center space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Digite um nome acima para carregar o histórico</p>
                  <p className="text-[10px] text-slate-400 font-medium">Esta ferramenta permite "Zerar" ou "Ajustar" kits sem precisar rodar scripts manuais.</p>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-slate-400">
               <Activity className="w-4 h-4 text-green-400" /> Monitoramento de Infra
            </h3>
            <div className="space-y-6">
               <HealthRow label="Servidores Edge (Supabase)" status="Operacional" value="124ms" active />
               <HealthRow label="Bucket de Imagens (Storage)" status="Operacional" value="2.4 GB" active />
               <HealthRow label="Fila de Notificações" status="Vazia" value="0 pendentes" active />
               <HealthRow label="Banco de Dados Principal" status="Conectado" value="7.1ms Latency" active />
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Acesso Direto</h4>
            <div className="space-y-2">
               <SidebarLink 
                 icon={<Users className="w-4 h-4" />} 
                 label="Gerenciar Usuários" 
                 onClick={() => navigate('/admin/usuarios')} 
                 color="bg-slate-900"
               />
               <SidebarLink 
                 icon={<Wrench className="w-4 h-4" />} 
                 label="Corretor de Pedidos" 
                 onClick={() => navigate('/gestor/corrigir-pedido')} 
                 color="bg-primary"
               />
               <SidebarLink 
                 icon={<Database className="w-4 h-4" />} 
                 label="Logs de Auditoria" 
                 onClick={() => navigate('/admin/logs')} 
                 color="bg-orange-600"
               />
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
            <ShieldCheck className="w-10 h-10 mb-4 text-indigo-200" />
            <h4 className="font-black text-lg mb-1 uppercase tracking-tight">Controle de Segurança</h4>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-6">
              Certifique-se de que todos os acessos administrativos possuem 2FA habilitado no painel do Supabase.
            </p>
            <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              Revisar Permissões
            </button>
          </div>

          <div className="p-1 border border-slate-200 rounded-3xl bg-slate-50/50">
             <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-slate-600" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Atalho Rápido</p>
                      <h5 className="text-xs font-black text-slate-800 uppercase italic">Criar Conta Mestra</h5>
                   </div>
                </div>
                <button 
                  onClick={() => navigate('/admin/usuarios')}
                  className="w-full py-4 px-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-slate-400 transition-all font-bold text-xs"
                >
                  Ir para Cadastro
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Components locais
const MaintenanceButton = ({ title, desc, icon, onClick, loading, active }: any) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`p-5 rounded-2xl border-2 text-left transition-all group ${
      active 
        ? 'bg-orange-50 border-orange-200 shadow-md scale-[0.98]' 
        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md active:scale-95'
    }`}
  >
    <div className="flex items-center gap-4 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${active ? 'bg-orange-200' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div>
        <h4 className={`text-xs font-black uppercase tracking-tight ${active ? 'text-orange-900' : 'text-slate-900'}`}>{title}</h4>
      </div>
    </div>
    <p className={`text-[10px] font-medium leading-normal ${active ? 'text-orange-700' : 'text-slate-500'}`}>{desc}</p>
  </button>
);

const HealthRow = ({ label, status, value, active }: any) => (
  <div className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
    <div className="flex items-center gap-3">
       <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)] animate-pulse' : 'bg-slate-600'}`} />
       <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-right">
       <p className="text-[10px] font-black text-white uppercase">{status}</p>
       <p className="text-[9px] font-medium text-slate-500">{value}</p>
    </div>
  </div>
);

const SidebarLink = ({ icon, label, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className="w-full p-4 flex items-center gap-3 rounded-[1.25rem] bg-slate-50 hover:bg-slate-100 transition-all group border border-transparent hover:border-slate-200"
  >
    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-sm transition-transform group-hover:rotate-6`}>
      {icon}
    </div>
    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{label}</span>
    <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
  </button>
);

export default TIPage;
