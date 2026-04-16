import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShieldCheck, ShoppingCart, DollarSign, BarChart3, Factory, 
  Settings, Users, History, AlertTriangle, ArrowRight,
  Package, Truck, Clock, RefreshCcw, Database, Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLogs, rollbackAction } from '@/lib/loggingService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await getLogs(10);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRollback = async (logId: string) => {
    if (!confirm('Tem certeza que deseja reverter esta alteração? Esta ação modificará os dados atuais pelo estado anterior salvo no log.')) return;
    
    try {
      await rollbackAction(logId);
      toast.success('Rollback concluído com sucesso!');
      loadLogs();
    } catch (err: any) {
      toast.error('Erro ao realizar rollback: ' + err.message);
    }
  };

  const menuItems = [
    { label: 'Administrador T.I', icon: Wrench, path: '/admin/ti', color: 'bg-slate-900', desc: 'Saúde do sistema e ferramentas' },
    { label: 'Gestão de Pedidos', icon: ShoppingCart, path: '/gestor/corrigir-pedido', color: 'bg-vendedor', desc: 'Corrigir e unificar pedidos' },
    { label: 'Financeiro Total', icon: DollarSign, path: '/financeiro', color: 'bg-financeiro', desc: 'Controle de caixa e pagamentos' },
    { label: 'Logística', icon: Truck, path: '/gestor/entregadores', color: 'bg-indigo-600', desc: 'Entregas e transportadoras' },
    { label: 'Produção', icon: Factory, path: '/producao', color: 'bg-producao', desc: 'Status e cronograma de fábrica' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes', color: 'bg-gestor', desc: 'Base completa de clientes' },
    { label: 'Relatórios/Dashboard', icon: BarChart3, path: '/gestor/relatorios', color: 'bg-primary', desc: 'Indicadores e performance' },
    { label: 'Gestão de Usuários', icon: ShieldCheck, path: '/admin/usuarios', color: 'bg-slate-700', desc: 'Controlar quem acessa o quê' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-slate-900" />
            Painel Central Administrador
          </h1>
          <p className="text-muted-foreground font-medium">Controle total da operação e auditoria do sistema</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-900/20">
             ACESSO TOTAL ATIVO
           </div>
        </div>
      </div>

      {/* Grid de Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => navigate(item.path)}
            className="group relative overflow-hidden bg-card hover:bg-muted/50 border border-border/50 rounded-3xl p-6 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center text-white mb-4 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="font-black text-foreground uppercase tracking-tight text-sm mb-1">{item.label}</h3>
            <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
            <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Auditoria / Logs Recentes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase text-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Alterações (Audit Trail)
            </h2>
            <button 
              onClick={loadLogs}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title="Atualizar Logs"
            >
              <RefreshCcw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Data/Hora</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Usuário</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Ação</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loadingLogs ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-muted rounded w-full"></div></td>
                      </tr>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            <span className="text-[9px] text-muted-foreground uppercase">{log.entity_type} #{log.entity_id?.slice(0,8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {log.user_name?.charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-foreground">{log.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{log.action}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {log.old_data && (
                            <button
                              onClick={() => handleRollback(log.id)}
                              className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 text-[10px] font-black uppercase transition-all hover:text-white"
                            >
                              Desfazer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                        Nenhuma atividade registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-muted/10 p-4 border-t border-border/50 text-center">
               <button onClick={() => navigate('/admin/logs')} className="text-[10px] font-black uppercase text-primary hover:underline">Ver Histórico Completo</button>
            </div>
          </div>
        </div>

        {/* Status do Sistema e Alertas */}
        <div className="space-y-6">
           <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/30">
              <h3 className="font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Status do Core
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Database Supabase</span>
                    <span className="flex items-center gap-1.5 text-green-400 text-xs font-black uppercase">
                       <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Operacional
                    </span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Realtime Engine</span>
                    <span className="flex items-center gap-1.5 text-green-400 text-xs font-black uppercase">
                       <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Ativo
                    </span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Storage API</span>
                    <span className="flex items-center gap-1.5 text-green-400 text-xs font-black uppercase">
                       <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Ok
                    </span>
                 </div>
              </div>
           </div>

           <div className="bg-card border border-border/50 rounded-3xl p-6">
              <h3 className="font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Alertas Críticos
              </h3>
              <div className="space-y-3">
                 <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-[10px] font-bold text-orange-700">
                    Atenção: Existem 3 pedidos com atraso superior a 48h na produção.
                 </div>
                 <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-[10px] font-bold text-destructive">
                    Crítico: Falha na unificação de volumes no pedido #7122.
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
