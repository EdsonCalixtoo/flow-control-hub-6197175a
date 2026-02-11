import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/erp';
import { ROLE_LABELS } from '@/types/erp';
import { Package, ShoppingCart, DollarSign, BarChart3, Factory } from 'lucide-react';

const roles: { role: UserRole; icon: React.ElementType; desc: string; color: string }[] = [
  { role: 'vendedor', icon: ShoppingCart, desc: 'Orçamentos, clientes e vendas', color: 'bg-vendedor hover:bg-vendedor/90' },
  { role: 'financeiro', icon: DollarSign, desc: 'Pagamentos, aprovações e DRE', color: 'bg-financeiro hover:bg-financeiro/90' },
  { role: 'gestor', icon: BarChart3, desc: 'Conferência e indicadores', color: 'bg-gestor hover:bg-gestor/90' },
  { role: 'producao', icon: Factory, desc: 'Produção e liberação', color: 'bg-producao hover:bg-producao/90' },
];

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ERP System</h1>
          <p className="text-muted-foreground text-sm mt-1">Selecione seu perfil para entrar</p>
        </div>

        <div className="space-y-3">
          {roles.map(({ role, icon: Icon, desc, color }) => (
            <button
              key={role}
              onClick={() => login(role)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 group text-left"
            >
              <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{ROLE_LABELS[role]}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Demonstração • Clique em um perfil para acessar
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
