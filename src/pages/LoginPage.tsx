import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/erp';
import { ROLE_LABELS } from '@/types/erp';
import { ShoppingCart, DollarSign, BarChart3, Factory, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, Trash2 } from 'lucide-react';

const roles: { role: UserRole; icon: React.ElementType; desc: string; gradient: string; iconBg: string }[] = [
  { role: 'vendedor', icon: ShoppingCart, desc: 'Orçamentos, clientes e vendas', gradient: 'from-vendedor/10 to-vendedor/5', iconBg: 'bg-vendedor' },
  { role: 'financeiro', icon: DollarSign, desc: 'Pagamentos, aprovações e DRE', gradient: 'from-financeiro/10 to-financeiro/5', iconBg: 'bg-financeiro' },
  { role: 'gestor', icon: BarChart3, desc: 'Conferência e indicadores', gradient: 'from-gestor/10 to-gestor/5', iconBg: 'bg-gestor' },
  { role: 'producao', icon: Factory, desc: 'Produção e liberação', gradient: 'from-producao/10 to-producao/5', iconBg: 'bg-producao' },
];

type Step = 'select' | 'auth';

const LoginPage: React.FC = () => {
  const { login, clearSessionCompletely } = useAuth();

  const [step, setStep] = useState<Step>('select');

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClearSessionOption, setShowClearSessionOption] = useState(false);

  const selectedRoleData = roles.find(r => r.role === selectedRole);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('auth');
    setError(null);
    setSuccess(null);
    setEmail(''); setPassword('');
  };

  const handleBack = () => {
    setStep('select');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const err = await login(email, password);
      if (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        // Se for erro de token, oferece opção de limpar sessão
        if (errorMessage.toLowerCase().includes('refresh') || errorMessage.toLowerCase().includes('invalid')) {
          setShowClearSessionOption(true);
        }
        setLoading(false);
      }
      // Se login ok: o onAuthStateChange vai redirecionar em até 3s.
      // Paramos o loading após 4s caso não redirecione.
      else {
        setTimeout(() => setLoading(false), 4000);
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg opacity-90" />
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-[hsl(var(--gestor))]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-card/80 backdrop-blur-2xl rounded-3xl border border-border/20 shadow-2xl shadow-primary/10 p-8">

          {/* ── Logo sempre visível ── */}
          <div className="text-center mb-7">
            <img src="/Automatiza-logo-rgb-01.jpg" alt="Automatiza Vans" className="mx-auto max-w-[240px] w-full h-auto object-contain rounded-2xl" />
          </div>

          {/* ── BANNER: Erro de token expirado ── */}
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
                onClick={() => {
                  if (confirm('Isso vai limpar todos os dados de sessão e recarregar a página. Continuar?')) {
                    clearSessionCompletely();
                  }
                }}
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

          {/* ════════ STEP 2: Login ════════ */}
          {step === 'auth' && selectedRoleData && (
            <div className="animate-scale-in">
              {/* Header do perfil selecionado */}
              <div className="flex items-center gap-3 mb-6">
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

              {/* Mensagem de sucesso */}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-medium">
                  {success}
                </div>
              )}

              {/* Mensagem de erro */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-xs font-medium">{error}</p>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
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
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                    : <><ArrowRight className="w-4 h-4" /> Entrar no sistema</>
                  }
                </button>
              </form>

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
