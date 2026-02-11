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
  Settings,
  LogOut,
  Menu,
  X,
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

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base text-sidebar-primary-foreground tracking-tight">ERP System</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {items.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item ${active ? 'sidebar-item-active bg-sidebar-accent text-sidebar-primary-foreground' : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-muted truncate">{user.email}</p>
            </div>
            <button onClick={logout} className="text-sidebar-muted hover:text-destructive transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
