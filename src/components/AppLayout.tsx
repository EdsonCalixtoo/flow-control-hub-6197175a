import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/erp';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  CheckSquare,
  Package,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const NAV_ITEMS: Record<string, { label: string; icon: React.ElementType; path: string }[]> = {
  vendedor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/vendedor' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes' },
    { label: 'Orçamentos', icon: FileText, path: '/vendedor/orcamentos' },
  ],
  financeiro: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/financeiro' },
    { label: 'Aprovações', icon: CheckSquare, path: '/financeiro/aprovacoes' },
    { label: 'Pagamentos', icon: DollarSign, path: '/financeiro/pagamentos' },
    { label: 'Lançamentos', icon: BarChart3, path: '/financeiro/lancamentos' },
  ],
  gestor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/gestor' },
    { label: 'Conferência', icon: CheckSquare, path: '/gestor/conferencia' },
    { label: 'Relatórios', icon: BarChart3, path: '/gestor/relatorios' },
  ],
  producao: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/producao' },
    { label: 'Pedidos', icon: Package, path: '/producao/pedidos' },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  vendedor: 'from-vendedor to-vendedor/70',
  financeiro: 'from-financeiro to-financeiro/70',
  gestor: 'from-gestor to-gestor/70',
  producao: 'from-producao to-producao/70',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];
  const roleGradient = ROLE_COLORS[user.role] || 'from-primary to-primary/70';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ease-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center shadow-lg`}>
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-extrabold text-[15px] text-sidebar-primary-foreground tracking-tight">ERP System</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-muted mt-0.5">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted px-3 mb-3">Menu</p>
          {items.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item group ${active 
                  ? 'sidebar-item-active bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-primary-foreground shadow-sm' 
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/40'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  active ? `bg-gradient-to-br ${roleGradient} shadow-sm` : 'bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
                }`}>
                  <item.icon className={`w-4 h-4 ${active ? 'text-primary-foreground' : ''}`} />
                </div>
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-sidebar-muted" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 mx-4 mb-4 rounded-2xl bg-sidebar-accent/50 border border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm`}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-primary-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-sidebar-muted truncate">{user.email}</p>
            </div>
            <button onClick={logout} className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-all duration-200" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center px-4 md:px-6 gap-4 shrink-0 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input type="text" placeholder="Buscar..." className="input-modern pl-10 py-2.5 bg-muted/50 border-transparent focus:bg-card" />
            </div>
          </div>
          
          <div className="flex-1 md:flex-none" />
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button className="relative w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
