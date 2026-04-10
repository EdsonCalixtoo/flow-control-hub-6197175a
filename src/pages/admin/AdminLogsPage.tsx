import React, { useState, useEffect } from 'react';
import { getLogs, rollbackAction } from '@/lib/loggingService';
import { Search, History, RefreshCcw, ArrowLeft, Filter, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const AdminLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs(200);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRollback = async (logId: string) => {
    if (!confirm('Reverter esta ação agora?')) return;
    try {
      await rollbackAction(logId);
      toast.success('Ação revertida!');
      loadLogs();
    } catch (err: any) {
      toast.error('Erro no rollback: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Logs de Auditoria</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Rastreamento de todas as ações críticas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={loadLogs} className="btn-modern bg-muted text-foreground">
             <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
           </button>
           <button className="btn-modern bg-slate-900 text-white shadow-lg shadow-slate-900/20">
             <Download className="w-4 h-4" /> Exportar CSV
           </button>
        </div>
      </div>

      <div className="card-section p-4 bg-white/50 border-border/40 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por usuário, ação, tipo ou ID..." 
              className="input-modern pl-12 h-12 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-modern bg-muted/50 text-foreground text-xs h-12 px-6">
              <Filter className="w-4 h-4" /> Filtros Avançados
            </button>
          </div>
        </div>
      </div>

      <div className="card-section overflow-hidden shadow-xl border-border/60">
         <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr className="bg-muted/30">
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Módulo</th>
                  <th>Ação Realizada</th>
                  <th>Detalhes</th>
                  <th className="text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-6"><div className="h-4 bg-muted rounded"></div></td>
                    </tr>
                  ))
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                         <div className="flex flex-col">
                           <span className="text-xs font-black text-foreground">{log.user_name}</span>
                           <span className="text-[10px] text-muted-foreground uppercase font-bold">{log.user_role}</span>
                         </div>
                      </td>
                      <td className="py-4 px-6">
                         <span className="px-2 py-1 rounded-lg bg-muted text-[10px] font-black uppercase text-muted-foreground">
                           {log.entity_type}
                         </span>
                      </td>
                      <td className="py-4 px-6">
                         <span className="text-xs font-medium text-foreground">{log.action}</span>
                      </td>
                      <td className="py-4 px-6">
                         <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                           ID: {log.entity_id?.slice(0, 8)}
                         </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                           {log.old_data && (
                             <button 
                               onClick={() => handleRollback(log.id)}
                               className="p-2 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all scale-0 group-hover:scale-100"
                               title="Desfazer"
                             >
                               <RefreshCcw className="w-3.5 h-3.5" />
                             </button>
                           )}
                           <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                             <History className="w-3.5 h-3.5" />
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                       <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                       <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Nenhum log encontrado para a busca</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default AdminLogsPage;
