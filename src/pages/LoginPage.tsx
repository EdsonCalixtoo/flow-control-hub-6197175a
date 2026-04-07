import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/erp';
import { ROLE_LABELS } from '@/types/erp';
import {
  ShoppingCart, DollarSign, BarChart3, Factory,
  ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle,
  Trash2, UserPlus, LogIn, CheckCircle2, User, Truck,
} from 'lucide-react';

const roles: { role: UserRole; icon: React.ElementType; desc: string; gradient: string; iconBg: string }[] = [
  { role: 'vendedor', icon: ShoppingCart, desc: 'Orçamentos, clientes e vendas', gradient: 'from-vendedor/10 to-vendedor/5', iconBg: 'bg-vendedor' },
  { role: 'financeiro', icon: DollarSign, desc: 'Pagamentos, aprovações e DRE', gradient: 'from-financeiro/10 to-financeiro/5', iconBg: 'bg-financeiro' },
  { role: 'gestor', icon: BarChart3, desc: 'Conferência e indicadores', gradient: 'from-gestor/10 to-gestor/5', iconBg: 'bg-gestor' },
  { role: 'producao', icon: Factory, desc: 'Produção e liberação', gradient: 'from-producao/10 to-producao/5', iconBg: 'bg-producao' },
  { role: 'producao_carenagem', icon: Truck, desc: 'Pedidos de carenagem e side skirt', gradient: 'from-indigo-600/10 to-indigo-500/5', iconBg: 'bg-indigo-600' },
];

type Step = 'select' | 'auth';
type AuthMode = 'login' | 'register';

const LoginPage: React.FC = () => {
  const { login, register, clearSessionCompletely } = useAuth();

  const [step, setStep] = useState<Step>('select');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // campos compartilhados
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClearSessionOption, setShowClearSessionOption] = useState(false);

  const selectedRoleData = roles.find(r => r.role === selectedRole);

  const resetFields = () => {
    setName(''); setEmail(''); setPassword('');
    setError(null); setSuccess(null); setShowPw(false);
  };

  const handleSelectRole = (role: UserRole) => {
    console.log('[Login] Perfil selecionado:', role);
    setSelectedRole(role);
    setAuthMode('login');
    setStep('auth');
    resetFields();
  };

  const handleBack = () => {
    setStep('select');
    resetFields();
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    resetFields();
  };

  // ── LOGIN ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError(null); setSuccess(null); setLoading(true);

    try {
      console.log('[Login] Tentando login para:', email, 'como', selectedRole);
      await login(email, password);
      console.log('[Login] Login enviado com sucesso');
      setLoading(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg);
      if (msg.toLowerCase().includes('refresh') || msg.toLowerCase().includes('invalid')) {
        setShowClearSessionOption(true);
      }
      setLoading(false);
    }
  };

  // ── CADASTRO (somente vendedor) ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Informe o nome completo.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }

    setError(null); setSuccess(null); setLoading(true);

    try {
      await register(email, password, name.trim(), 'vendedor');
      setSuccess(`✅ Conta de "${name.trim()}" criada com sucesso! Fazendo login...`);
      setTimeout(() => setLoading(false), 4000);
    } catch (err: any) {
      const msg: string = err?.message || 'Erro ao criar conta.';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('Este e-mail já está cadastrado. Faça login.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg opacity-90 z-0 pointer-events-none" />
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse z-0 pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-[hsl(var(--gestor))]/20 rounded-full blur-3xl animate-pulse z-0 pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-card/80 backdrop-blur-2xl rounded-3xl border border-border/20 shadow-2xl shadow-primary/10 p-8">

          {/* Logo */}
          <div className="text-center mb-7">
            <img src="/Automatiza-logo-rgb-01.jpg" alt="Automatiza Vans" className="mx-auto max-w-[240px] w-full h-auto object-contain rounded-2xl" />
          </div>

          {/* Banner: token expirado */}
          {showClearSessionOption && (
            <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-600 space-y-1">
                  <p className="font-semibold">Token de sessão expirado</p>
                  <p>Isso acontece quando você ficou muito tempo sem usar ou mudou de computador. Limpe a sessão e faça login novamente.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (confirm('Limpar todos os dados de sessão e recarregar a página?')) clearSessionCompletely(); }}
                className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar sessão e fazer login novamente
              </button>
            </div>
          )}

          {/* ════════ STEP 1: Seleção de perfil ════════ */}
          {step === 'select' && (
            <>
              <p className="text-center text-sm text-muted-foreground mb-5">Selecione seu perfil para continuar</p>
              <div className="space-y-3 stagger-children">
                {roles.map(({ role, icon: Icon, desc, gradient, iconBg }) => (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${gradient} border border-border/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300 group text-left`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm">{ROLE_LABELS[role]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ════════ STEP 2: Login / Cadastro ════════ */}
          {step === 'auth' && selectedRoleData && (
            <div className="animate-scale-in">

              {/* Header do perfil */}
              <div className="flex items-center gap-3 mb-5">
                <button onClick={handleBack} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className={`w-9 h-9 rounded-xl ${selectedRoleData.iconBg} flex items-center justify-center shadow-md`}>
                  <selectedRoleData.icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{ROLE_LABELS[selectedRole!]}</p>
                  <p className="text-xs text-muted-foreground">{selectedRoleData.desc}</p>
                </div>
              </div>

              {/* Abas Login / Cadastrar — somente para vendedor */}
              {selectedRole === 'vendedor' && (
                <div className="flex rounded-xl overflow-hidden border border-border/30 mb-5">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all duration-200 ${authMode === 'login'
                      ? `${selectedRoleData.iconBg} text-primary-foreground shadow-md`
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <LogIn className="w-3.5 h-3.5" /> Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all duration-200 ${authMode === 'register'
                      ? `${selectedRoleData.iconBg} text-primary-foreground shadow-md`
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Cadastrar vendedor
                  </button>
                </div>
              )}

              {/* Mensagem de sucesso */}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-green-600 text-xs font-medium">{success}</p>
                </div>
              )}

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-xs font-medium">{error}</p>
                </div>
              )}

              {/* ── FORMULÁRIO: LOGIN ── */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-modern"
                      placeholder="seu@email.com"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Senha</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-modern pr-11"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full btn-modern bg-gradient-to-r justify-center ${selectedRoleData.iconBg} text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed mt-2`}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</> : <><ArrowRight className="w-4 h-4" /> Entrar no sistema</>}
                  </button>
                </form>
              )}

              {/* ── FORMULÁRIO: CADASTRO (vendedor) ── */}
              {authMode === 'register' && selectedRole === 'vendedor' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nome completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="input-modern pr-11"
                        placeholder="Ex: João Silva"
                        required
                        autoFocus
                      />
                      <User className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-modern"
                      placeholder="vendedor@email.com"
                      required
                    />
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Senha <span className="text-muted-foreground/60 font-normal">(mín. 6 caracteres)</span></label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-modern pr-11"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full btn-modern bg-gradient-to-r justify-center ${selectedRoleData.iconBg} text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed mt-2`}
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                      : <><UserPlus className="w-4 h-4" /> Criar conta de vendedor</>
                    }
                  </button>

                  <p className="text-center text-[10px] text-muted-foreground/50">
                    Após criar a conta, o login será feito automaticamente.
                  </p>
                </form>
              )}

              <p className="text-center text-[11px] text-muted-foreground/60 mt-5">
                Grupo Automatiza Vans • Sistema ERP
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
