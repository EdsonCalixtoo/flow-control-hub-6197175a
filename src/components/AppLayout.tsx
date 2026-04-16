import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/erp';
import {
  LayoutDashboard,
  History,
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
  Sun,
  Moon,
  TrendingUp,
  Truck,
  Wrench,
  CalendarClock,
  AlertTriangle,
  Users2,
  Shield,
  Tag,
  Calendar,
  ShieldAlert,
  Factory,
} from 'lucide-react';
import { useThemeContext } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { NotificationDropdown } from './shared/NotificationDropdown';

const NAV_ITEMS: Record<string, { label: string; icon: React.ElementType; path: string }[]> = {
  vendedor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/vendedor' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes' },
    { label: 'Orçamentos', icon: FileText, path: '/vendedor/orcamentos' },
    { label: 'Garantias', icon: Shield, path: '/vendedor/garantias' },
    { label: 'Calendário', icon: Calendar, path: '/vendedor/calendario' },
  ],
  financeiro: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/financeiro' },
    { label: 'Controle por Vendedor', icon: Users2, path: '/financeiro/vendedores' },
    { label: 'Aprovações', icon: CheckSquare, path: '/financeiro/aprovacoes' },
    { label: 'Pagamentos', icon: DollarSign, path: '/financeiro/pagamentos' },
    { label: 'Lançamentos', icon: BarChart3, path: '/financeiro/lancamentos' },
    { label: 'Fluxo de Caixa', icon: TrendingUp, path: '/financeiro/fluxo' },
    { label: 'Garantias', icon: Shield, path: '/financeiro/garantias' },
    { label: 'Carenagem', icon: Package, path: '/financeiro/carenagem' },
  ],
  gestor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/gestor' },
    { label: 'Entregadores', icon: Truck, path: '/gestor/entregadores' },
    { label: 'Problemas na Produção', icon: AlertTriangle, path: '/gestor?tab=problemas' },
    { label: 'Pedidos Devolvidos', icon: BarChart3, path: '/gestor?tab=devolvidos' },
    { label: 'Relatórios de Erros', icon: CheckSquare, path: '/gestor?tab=erros' },
    { label: 'Produtos', icon: Tag, path: '/gestor/produtos' },
    { label: 'Estoque', icon: Package, path: '/gestor/estoque' },
    { label: 'Relatórios', icon: BarChart3, path: '/gestor/relatorios' },
    { label: 'Arrumar Pedido', icon: Wrench, path: '/gestor/corrigir-pedido' },
  ],
  producao: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/producao' },
    { label: 'Todos os Pedidos', icon: Package, path: '/producao/pedidos' },
    { label: 'Instalação', icon: Wrench, path: '/producao/pedidos?tipo=instalacao' },
    { label: 'Retirada', icon: Package, path: '/producao/pedidos?tipo=retirada' },
    { label: 'Calendário', icon: Calendar, path: '/producao/pedidos?view=calendar' },
    { label: 'Histórico de Pedidos', icon: History, path: '/producao/pedidos?tipo=historico' },
    { label: 'Garantias', icon: ShieldAlert, path: '/producao/pedidos?tipo=garantias' },
    { label: 'Atrasados', icon: AlertTriangle, path: '/producao/pedidos?tipo=atrasado' },
  ],
  producao_carenagem: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/producao_carenagem' },
    { label: 'Pedidos Carenagem', icon: Truck, path: '/producao_carenagem/pedidos' },
    { label: 'Instalação', icon: Wrench, path: '/producao_carenagem/pedidos?tipo=instalacao' },
    { label: 'Retirada', icon: Truck, path: '/producao_carenagem/pedidos?tipo=retirada' },
    { label: 'Calendário', icon: Calendar, path: '/producao_carenagem/pedidos?view=calendar' },
    { label: 'Histórico Carenagem', icon: History, path: '/producao_carenagem/pedidos?tipo=historico' },
    { label: 'Garantias', icon: ShieldAlert, path: '/producao_carenagem/pedidos?tipo=garantias' },
    { label: 'Atrasados', icon: AlertTriangle, path: '/producao_carenagem/pedidos?tipo=atrasado' },
  ],
  admin: [
    { label: 'Gestão Vendas', icon: LayoutDashboard, path: '/gestor' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes' },
    { label: 'Orçamentos', icon: FileText, path: '/vendedor/orcamentos' },
    { label: 'Aprovações', icon: CheckSquare, path: '/financeiro/aprovacoes' },
    { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
    { label: 'Fluxo Caixa', icon: TrendingUp, path: '/financeiro/fluxo' },
    { label: 'Produção', icon: Factory, path: '/producao/pedidos' },
    { label: 'Entregadores', icon: Truck, path: '/gestor/entregadores' },
    { label: 'Calendário', icon: Calendar, path: '/vendedor/calendario' },
    { label: 'Relatórios', icon: BarChart3, path: '/gestor/relatorios' },
    { label: 'Garantias', icon: Shield, path: '/vendedor/garantias' },
    { label: 'Produtos/Estoque', icon: Package, path: '/gestor/produtos' },
    { label: 'Administrador TI', icon: Wrench, path: '/admin/ti' },
    { label: 'Gestão de Usuários', icon: Users, path: '/admin/usuarios' },
    { label: 'Logs de Auditoria', icon: History, path: '/admin/logs' },
  ],
};


const ROLE_COLORS: Record<string, string> = {
  vendedor: 'from-vendedor to-vendedor/70',
  financeiro: 'from-financeiro to-financeiro/70',
  gestor: 'from-gestor to-gestor/70',
  producao: 'from-producao to-producao/70',
  producao_carenagem: 'from-indigo-600 to-indigo-500/70',
  admin: 'from-slate-900 to-slate-800/70',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useThemeContext();
  const { unreadDelayReports, overduePaymentsCount } = useERP();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
            // Compara pathname + query string para itens com ?tipo=...
            const [itemPath, itemQuery] = item.path.split('?');
            const currentQuery = location.search.replace('?', '');
            const active = itemQuery
              ? location.pathname === itemPath && currentQuery === itemQuery
              : location.pathname === item.path && !location.search;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item group ${active
                  ? 'sidebar-item-active bg-gradient-to-r from-sidebar-accent to-sidebar-accent/80 text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/40'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${active ? `bg-gradient-to-br ${roleGradient} shadow-sm` : 'bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
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

          {/* Busca global removida a pedido */}

          <div className="flex-1 md:flex-none" />

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block font-medium">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                title={(() => {
                  const total = user.role === 'financeiro' ? overduePaymentsCount : unreadDelayReports;
                  return total > 0 ? `${total} alerta(s) pendente(s)` : 'Notificações';
                })()}
              >
                <Bell className="w-4 h-4" />
                {(() => {
                  const total = (user.role === 'financeiro' ? overduePaymentsCount : unreadDelayReports) || 0;
                  if (total <= 0) return <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-muted-foreground/30" />;
                  return (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[9px] font-extrabold flex items-center justify-center px-1 animate-pulse">
                      {total > 9 ? '9+' : total}
                    </span>
                  );
                })()}
              </button>
              
              {notificationsOpen && (
                <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
              )}
            </div>
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
