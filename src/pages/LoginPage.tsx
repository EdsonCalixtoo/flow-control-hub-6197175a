import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/erp';
import { ROLE_LABELS } from '@/types/erp';
import { Package, ShoppingCart, DollarSign, BarChart3, Factory, ArrowRight, Sparkles } from 'lucide-react';

const roles: { role: UserRole; icon: React.ElementType; desc: string; gradient: string; iconBg: string }[] = [
  { role: 'vendedor', icon: ShoppingCart, desc: 'Orçamentos, clientes e vendas', gradient: 'from-vendedor/10 to-vendedor/5', iconBg: 'bg-vendedor' },
  { role: 'financeiro', icon: DollarSign, desc: 'Pagamentos, aprovações e DRE', gradient: 'from-financeiro/10 to-financeiro/5', iconBg: 'bg-financeiro' },
  { role: 'gestor', icon: BarChart3, desc: 'Conferência e indicadores', gradient: 'from-gestor/10 to-gestor/5', iconBg: 'bg-gestor' },
  { role: 'producao', icon: Factory, desc: 'Produção e liberação', gradient: 'from-producao/10 to-producao/5', iconBg: 'bg-producao' },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-bg opacity-90" />
      
      {/* Decorative blobs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-[hsl(var(--gestor))]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Glass card */}
        <div className="bg-card/80 backdrop-blur-2xl rounded-3xl border border-border/20 shadow-2xl shadow-primary/10 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-flex">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--gestor))] flex items-center justify-center shadow-lg shadow-primary/25">
                <Package className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center shadow-sm">
                <Sparkles className="w-3 h-3 text-success-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-black mt-5 tracking-tight text-foreground">
              ERP <span className="gradient-text">System</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">Selecione seu perfil para acessar o painel</p>
          </div>

          {/* Role cards */}
          <div className="space-y-3 stagger-children">
            {roles.map(({ role, icon: Icon, desc, gradient, iconBg }) => (
              <button
                key={role}
                onClick={() => login(role)}
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

          <div className="mt-6 pt-5 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground/70">
              Demonstração • Selecione um perfil acima
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
