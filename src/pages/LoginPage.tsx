import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/erp';
import { ROLE_LABELS } from '@/types/erp';
import {
  ShoppingCart, DollarSign, BarChart3, Factory,
  ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle,
  Trash2, UserPlus, LogIn, CheckCircle2, User, Truck, ShieldCheck
} from 'lucide-react';

const roles: { role: UserRole; icon: React.ElementType; desc: string; color: string; bg: string; size: 'small' | 'large' }[] = [
  { role: 'vendedor', icon: ShoppingCart, desc: 'Vendas e Orçamentos', color: 'text-blue-500', bg: 'bg-blue-500/10', size: 'large' },
  { role: 'financeiro', icon: DollarSign, desc: 'Pagamentos e DRE', color: 'text-emerald-500', bg: 'bg-emerald-500/10', size: 'small' },
  { role: 'gestor', icon: BarChart3, desc: 'Indicadores', color: 'text-purple-500', bg: 'bg-purple-500/10', size: 'small' },
  { role: 'producao', icon: Factory, desc: 'Produção Geral', color: 'text-orange-500', bg: 'bg-orange-500/10', size: 'small' },
  { role: 'producao_carenagem', icon: Truck, desc: 'Carenagem', color: 'text-indigo-500', bg: 'bg-indigo-500/10', size: 'small' },
];

const LoginPage: React.FC = () => {
  const { login, register, clearSessionCompletely } = useAuth();
  const [step, setStep] = useState<'select' | 'auth'>('select');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showClearSessionOption, setShowClearSessionOption] = useState(false);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('auth');
    setAuthMode('login');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Erro ao entrar');
      if (err?.message?.includes('expirado')) setShowClearSessionOption(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Animated Aura Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-gradient-to-br from-emerald-400/10 to-blue-400/20 rounded-full blur-[120px]" 
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {step === 'select' ? (
            <motion.div 
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              {/* Premium Logo */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12 relative group"
              >
                <img src="/Automatiza-logo-rgb-01.jpg" alt="Logo" className="h-16 w-auto object-contain filter drop-shadow-2xl" />
                <div className="absolute -inset-x-4 -inset-y-4 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full -z-10" />
              </motion.div>

              <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Bem-vindo ao Futuro</h1>
                <p className="text-slate-500 font-medium">Selecione seu portal de acesso para continuar</p>
              </div>

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
                {roles.map((item, idx) => (
                  <motion.button
                    key={item.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 + 0.3 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectRole(item.role)}
                    className={`relative overflow-hidden group p-6 rounded-[32px] bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(59,130,246,0.12)] transition-all flex flex-col justify-between text-left ${
                      item.size === 'large' ? 'md:col-span-2 aspect-[2/1] md:aspect-auto' : 'aspect-square md:aspect-auto'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-50/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className={`p-4 rounded-2xl ${item.bg} border border-white/50 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                        <item.icon className={`w-8 h-8 ${item.color}`} />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">{ROLE_LABELS[item.role]}</h3>
                      <p className="text-sm font-medium text-slate-400 mt-1">{item.desc}</p>
                    </div>

                    {/* Background Detail */}
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                      <item.icon className="w-32 h-32 rotate-12" />
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-16 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]"
              >
                Automatiza Vans • High Performance System
              </motion.p>
            </motion.div>
          ) : (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center"
            >
              <div className="w-full max-w-md bg-white/80 backdrop-blur-3xl rounded-[48px] border border-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-12 relative">
                
                <button 
                  onClick={() => setStep('select')}
                  className="absolute top-8 left-8 p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all active:scale-90"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="text-center mb-10">
                  <div className={`mx-auto w-20 h-20 rounded-3xl mb-6 flex items-center justify-center ${roles.find(r => r.role === selectedRole)?.bg} border border-white shadow-xl`}>
                    {selectedRole && React.createElement(roles.find(r => r.role === selectedRole)!.icon, { className: `w-10 h-10 ${roles.find(r => r.role === selectedRole)!.color}` })}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ROLE_LABELS[selectedRole!]}</h2>
                  <p className="text-sm font-medium text-slate-400 mt-1">Insira suas credenciais corporativas</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                      <p className="text-rose-700 text-xs font-bold">{error}</p>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all placeholder:text-slate-300"
                      placeholder="usuario@automatiza.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                    <div className="relative group">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all pr-14 placeholder:text-slate-300"
                        placeholder="••••••••"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full h-16 bg-slate-900 hover:bg-blue-600 rounded-[24px] text-white font-black text-sm tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-slate-900/20 hover:shadow-blue-500/40"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        ENTRAR NO PORTAL
                      </>
                    )}
                  </button>
                </form>

                {showClearSessionOption && (
                  <button
                    onClick={() => clearSessionCompletely()}
                    className="w-full mt-6 text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Resetar sessão local
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage;
