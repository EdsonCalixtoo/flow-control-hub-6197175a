import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Key, ShieldCheck, UserPlus, Trash2, Edit2, 
  Search, ArrowLeft, Loader2, UserX, AlertTriangle, 
  CheckCircle2, RefreshCcw, Copy, Check, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: 'bg-slate-900/10 dark:bg-slate-100/10', text: 'text-slate-900 dark:text-slate-100', label: 'Admin T.I' },
  super_admin: { bg: 'bg-rose-500/10', text: 'text-rose-600', label: 'Super Admin' },
  vendedor: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Vendedor' },
  financeiro: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Financeiro' },
  gestor: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Gestor' },
  producao: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Produção Geral' },
  producao_carenagem: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', label: 'Carenagem' },
  garantia: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Garantia' },
};

const UsuariosPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modals state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('vendedor');
  const [creatingUser, setCreatingUser] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  const [showSqlInstruction, setShowSqlInstruction] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlScript = `-- CRIE ESTAS FUNÇÕES NO SQL EDITOR DO SUPABASE PARA PERMITIR A GESTÃO DE SENHAS E CONTAS
-- 1. Função para trocar senhas de outros usuários
CREATE OR REPLACE FUNCTION admin_change_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID AS $$
DECLARE
  hashed_password TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem alterar senhas.';
  END IF;

  hashed_password := crypt(new_password, gen_salt('bf', 10));

  UPDATE auth.users
  SET encrypted_password = hashed_password, updated_at = NOW()
  WHERE id = target_user_id;

  UPDATE public.users
  SET password = hashed_password
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para criar novos usuários de forma segura
CREATE OR REPLACE FUNCTION admin_create_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem criar usuários.';
  END IF;

  hashed_password := crypt(user_password, gen_salt('bf', 10));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', user_email, hashed_password,
    NOW(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', user_name, 'role', user_role),
    NOW(), NOW(), '', '', '', ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO public.users (id, email, name, role, password)
  VALUES (new_user_id, user_email, user_name, user_role, hashed_password);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para excluir usuários
CREATE OR REPLACE FUNCTION admin_delete_user(
  target_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    toast.success('Script SQL copiado com sucesso!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Chama a RPC criada no Supabase
      const { error } = await supabase.rpc('admin_change_user_password', {
        target_user_id: selectedUser.id,
        new_password: newPassword
      });

      if (error) {
        if (error.message.includes('function admin_change_user_password')) {
          setShowSqlInstruction(true);
          throw new Error('As funções de banco de dados do Admin não foram encontradas. Siga as instruções para instalá-las primeiro.');
        }
        throw error;
      }

      toast.success(`Senha do usuário ${selectedUser.name} alterada com sucesso!`);
      setPasswordModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) return;
    if (newUserPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        user_email: newUserEmail.trim(),
        user_password: newUserPassword,
        user_name: newUserName.trim(),
        user_role: newUserRole
      });

      if (error) {
        if (error.message.includes('function admin_create_user')) {
          setShowSqlInstruction(true);
          throw new Error('As funções de banco de dados do Admin não foram encontradas. Siga as instruções para instalá-las primeiro.');
        }
        throw error;
      }

      toast.success('Usuário criado com sucesso!');
      setCreateModalOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('vendedor');
      loadUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: selectedUser.id
      });

      if (error) {
        if (error.message.includes('function admin_delete_user')) {
          setShowSqlInstruction(true);
          throw new Error('As funções de banco de dados do Admin não foram encontradas. Siga as instruções para instalá-las primeiro.');
        }
        throw error;
      }

      toast.success(`Usuário ${selectedUser.name} foi removido com sucesso.`);
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingUser(false);
    }
  };

  // Filtragem local dos usuários
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const getStats = () => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
      vendedores: users.filter(u => u.role === 'vendedor').length,
      producao: users.filter(u => u.role === 'producao' || u.role === 'producao_carenagem').length,
      financeiro: users.filter(u => u.role === 'financeiro').length,
    };
  };

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/admin')}
            className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200/50 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-indigo-600" />
              Gestão de Usuários e Acessos
            </h1>
            <p className="text-slate-500 font-medium">Controle de senhas, criação e cargos sem e-mail de ativação</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSqlInstruction(!showSqlInstruction)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs uppercase tracking-wider transition-all border border-amber-200/50 active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            Configuração Inicial SQL
          </button>
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* SQL Setup Alert Banner */}
      <AnimatePresence>
        {showSqlInstruction && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50/80 backdrop-blur border-2 border-amber-200 rounded-[2rem] p-8 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-amber-900 uppercase tracking-tight">Instalação das Funções do Admin (SQL)</h3>
                <p className="text-sm text-amber-700 font-medium">
                  Para alterar senhas e criar usuários diretamente do painel sem e-mail real, o Supabase precisa de funções do PostgreSQL com permissões de Administrador. Execute o script abaixo uma única vez no editor de código do seu painel do Supabase.
                </p>
              </div>
            </div>

            <div className="relative rounded-2xl bg-slate-900 p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Passos no Supabase: SQL Editor &gt; New Query &gt; Colar e Rodar</span>
                <button 
                  onClick={handleCopySql}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copiado!' : 'Copiar Script'}
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                {sqlScript}
              </pre>
            </div>
            <div className="text-right">
              <button 
                onClick={() => setShowSqlInstruction(false)}
                className="px-6 py-2.5 bg-amber-900 text-white text-xs font-bold uppercase rounded-xl hover:bg-amber-800 transition-all"
              >
                Fechar Instruções
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total de Contas</p>
          <p className="text-3xl font-black text-slate-950">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Administradores</p>
          <p className="text-3xl font-black text-slate-950">{stats.admins}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Vendedores</p>
          <p className="text-3xl font-black text-slate-950">{stats.vendedores}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fábrica & Carenagem</p>
          <p className="text-3xl font-black text-slate-950">{stats.producao}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Financeiro</p>
          <p className="text-3xl font-black text-slate-950">{stats.financeiro}</p>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/30">
          
          {/* Search */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Role filter tabs */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-2 md:pb-0">
            {['all', 'admin', 'vendedor', 'financeiro', 'gestor', 'producao', 'producao_carenagem', 'garantia'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedRoleFilter === role 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                }`}
              >
                {role === 'all' ? 'Ver Todos' : ROLE_COLORS[role]?.label || role}
              </button>
            ))}
          </div>
        </div>

        {/* User list table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">E-mail</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nível de Acesso</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações de TI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6">
                      <div className="h-5 bg-slate-100 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const roleStyle = ROLE_COLORS[u.role] || { bg: 'bg-slate-100', text: 'text-slate-600', label: u.role };
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-medium text-slate-600">{u.email}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${roleStyle.bg} ${roleStyle.text}`}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 group-hover:opacity-100 transition-opacity">
                          
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setPasswordModalOpen(true);
                            }}
                            title="Trocar Senha"
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-200/50 hover:border-amber-200 transition-all"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Remover Conta"
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/50 hover:border-rose-200 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-400 font-medium italic">
                    Nenhum usuário encontrado na pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Alterar Senha */}
      <AnimatePresence>
        {passwordModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-md p-8 overflow-hidden relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Alterar Senha de TI</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Usuário: {selectedUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Você está forçando a alteração da senha desta conta. A nova senha será aplicada no Supabase Auth e o usuário deve logar de novo usando essa nova credencial.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all pr-14 placeholder:text-slate-300"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordModalOpen(false);
                      setNewPassword('');
                    }}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        SALVANDO...
                      </>
                    ) : 'REDEFINIR SENHA'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Criar Novo Usuário */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-lg p-8 overflow-hidden relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Criar Nova Conta Administrativa</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sem necessidade de confirmação via e-mail real</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Carlos Vendedor"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso (Cargo)</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="gestor">Gestor</option>
                      <option value="producao">Produção Geral</option>
                      <option value="producao_carenagem">Carenagem</option>
                      <option value="garantia">Garantia</option>
                      <option value="admin">Administrador TI</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="ex: vendedor@suaempresa.com"
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all pr-14 placeholder:text-slate-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      setNewUserName('');
                      setNewUserEmail('');
                      setNewUserPassword('');
                    }}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {creatingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        CRIANDO...
                      </>
                    ) : 'CRIAR CONTA'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Confirmar Exclusão */}
      <AnimatePresence>
        {deleteConfirmOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-md p-8 overflow-hidden relative"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-600 uppercase tracking-tight">Cuidado: Remover Usuário</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Esta ação é irreversível</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-700 font-semibold leading-relaxed">
                    Você está prestes a excluir permanentemente o usuário <strong className="uppercase">{selectedUser.name}</strong> ({selectedUser.email}). Ele perderá acesso imediato e a conta será apagada do banco de dados (public.users e auth.users).
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setSelectedUser(null);
                    }}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deletingUser}
                    className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {deletingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        DELETANDO...
                      </>
                    ) : 'DELETAR PERMANENTEMENTE'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default UsuariosPage;
