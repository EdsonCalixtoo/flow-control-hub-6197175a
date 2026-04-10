import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, UserPlus, Shield, Edit2, Trash2, 
  Search, ArrowLeft, Loader2, Mail, User as UserIcon,
  ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLE_COLORS } from '@/types/erp';

const UsersManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('vendedor');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // 1. Criar no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { name: newName, role: newRole }
        }
      });

      if (authError) throw authError;

      // 2. Criar na tabela users (caso a trigger não funcione ou para garantir)
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: authData.user?.id,
          name: newName,
          email: newEmail,
          role: newRole
        });

      if (dbError) throw dbError;

      toast.success(`Usuário ${newName} criado com sucesso!`);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (err: any) {
      toast.error('Erro ao criar usuário: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso de ${name}?`)) return;
    
    try {
      // Note: Supabase doesn't allow deleting from auth.users via client SDK for security.
      // We only disable them in our 'users' table or use an Edge Function.
      // For now, we update their role to 'blocked' (need to add this to types if wanted) 
      // or just remove from our table.
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Usuário removido da listagem.');
      loadUsers();
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    }
  };

  const resetForm = () => {
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('vendedor');
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Gestão de Usuários</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Controle de acessos e perfis</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-modern bg-slate-900 text-white shadow-lg shadow-slate-900/20"
        >
          <UserPlus className="w-4 h-4" /> Novo Administrador / Usuário
        </button>
      </div>

      <div className="card-section p-4 bg-white/50 border-border/40 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="input-modern pl-12 h-12 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card-section overflow-hidden shadow-xl border-border/60">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr className="bg-muted/30">
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Nível de Acesso</th>
                <th>Criado em</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="py-4 px-6"><div className="h-4 bg-muted rounded"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {u.name?.charAt(0)}
                        </div>
                        <span className="text-xs font-black text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-medium text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="py-4 px-6">
                       <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-white ${ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] || 'bg-slate-400'}`}>
                         {u.role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                         {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase">
                       {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                           <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           onClick={() => handleDeleteUser(u.id, u.name)}
                           className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                         >
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-card w-full max-w-lg rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-border/20 bg-muted/20 flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                 <ShieldPlus className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Novo Acesso</h2>
                 <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Defina as credenciais do novo usuário</p>
               </div>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Nome Completo</label>
                 <div className="relative">
                   <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <input 
                     required className="input-modern pl-11" placeholder="Ex: Edson Calixto" 
                     value={newName} onChange={e => setNewName(e.target.value)}
                   />
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">E-mail de Acesso</label>
                 <div className="relative">
                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <input 
                     required type="email" className="input-modern pl-11" placeholder="admin@autovans.com.br"
                     value={newEmail} onChange={e => setNewEmail(e.target.value)}
                   />
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Senha Temporária</label>
                 <input 
                   required type="password" className="input-modern" placeholder="••••••••" minLength={6}
                   value={newPassword} onChange={e => setNewPassword(e.target.value)}
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Nível de Permissão</label>
                 <div className="grid grid-cols-2 gap-2">
                    {['vendedor', 'financeiro', 'gestor', 'producao', 'admin'].map(role => (
                      <button
                        key={role} type="button"
                        onClick={() => setNewRole(role)}
                        className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                          newRole === role 
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                            : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/60'
                        }`}
                      >
                        {role === 'admin' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                      </button>
                    ))}
                 </div>
               </div>

               <div className="pt-4 border-t border-border/20 flex gap-3">
                  <button 
                    type="button" onClick={() => setShowCreateModal(false)}
                    className="flex-1 btn-modern bg-muted text-foreground"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" disabled={creating}
                    className="flex-[2] btn-modern bg-slate-900 text-white shadow-xl shadow-slate-900/20"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e Criar'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ShieldPlus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export default UsersManagementPage;
