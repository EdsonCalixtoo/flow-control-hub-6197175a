import React, { useState, useEffect } from 'react';
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
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useThemeContext } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useERP } from '@/contexts/ERPContext';
import { NotificationDropdown } from './shared/NotificationDropdown';

const NAV_ITEMS: Record<string, { label: string; icon: React.ElementType; path: string }[]> = {
  vendedor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/vendedor' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes' },
    { label: 'Orçamentos', icon: FileText, path: '/vendedor/orcamentos' },
    { label: 'Calendário', icon: Calendar, path: '/vendedor/calendario' },
  ],
  financeiro: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/financeiro' },
    { label: 'Controle por Vendedor', icon: Users2, path: '/financeiro/vendedores' },
    { label: 'Pedidos', icon: Package, path: '/pedidos' },
    { label: 'Pagamentos', icon: DollarSign, path: '/financeiro/pagamentos' },
    { label: 'Fluxo de Caixa', icon: TrendingUp, path: '/financeiro/fluxo' },
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
    { label: 'Painel de Produção', icon: Factory, path: '/producao/pedidos' },
    { label: 'Instalação', icon: Wrench, path: '/producao/pedidos?tipo=instalacao' },
    { label: 'Retirada', icon: Package, path: '/producao/pedidos?tipo=retirada' },
    { label: 'Calendário', icon: Calendar, path: '/producao/pedidos?view=calendar' },
    { label: 'Histórico de Pedidos', icon: History, path: '/producao/pedidos?tipo=historico' },
    { label: 'Atrasados', icon: AlertTriangle, path: '/producao/pedidos?tipo=atrasado' },
  ],
  producao_carenagem: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/producao_carenagem' },
    { label: 'Painel Carenagem', icon: Truck, path: '/producao_carenagem/pedidos' },
    { label: 'Instalação', icon: Wrench, path: '/producao_carenagem/pedidos?tipo=instalacao' },
    { label: 'Retirada', icon: Truck, path: '/producao_carenagem/pedidos?tipo=retirada' },
    { label: 'Calendário', icon: Calendar, path: '/producao_carenagem/pedidos?view=calendar' },
    { label: 'Histórico Carenagem', icon: History, path: '/producao_carenagem/pedidos?tipo=historico' },
    { label: 'Atrasados', icon: AlertTriangle, path: '/producao_carenagem/pedidos?tipo=atrasado' },
  ],
  admin: [
    { label: 'Gestão Vendas', icon: LayoutDashboard, path: '/gestor' },
    { label: 'Clientes', icon: Users, path: '/vendedor/clientes' },
    { label: 'Orçamentos', icon: FileText, path: '/vendedor/orcamentos' },
    { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
    { label: 'Fluxo Caixa', icon: TrendingUp, path: '/financeiro/fluxo' },
    { label: 'Produção', icon: Factory, path: '/producao/pedidos' },
    { label: 'Entregadores', icon: Truck, path: '/gestor/entregadores' },
    { label: 'Calendário', icon: Calendar, path: '/vendedor/calendario' },
    { label: 'Relatórios', icon: BarChart3, path: '/gestor/relatorios' },
    { label: 'Produtos/Estoque', icon: Package, path: '/gestor/produtos' },
    { label: 'Administrador TI', icon: Wrench, path: '/admin/ti' },
    { label: 'Gestão de Usuários', icon: Users, path: '/admin/usuarios' },
    { label: 'Logs de Auditoria', icon: History, path: '/admin/logs' },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  vendedor: 'from-blue-600 to-indigo-600',
  financeiro: 'from-emerald-600 to-teal-600',
  gestor: 'from-purple-600 to-pink-600',
  producao: 'from-orange-600 to-red-600',
  producao_carenagem: 'from-indigo-600 to-blue-600',
  admin: 'from-slate-900 to-slate-700',
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { theme, toggleTheme } = useThemeContext();
  const { unreadDelayReports, overduePaymentsCount } = useERP();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const handleScroll = (e: any) => {
      setScrolled(e.target.scrollTop > 20);
    };
    const mainEl = document.getElementById('main-content');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];
  const roleGradient = ROLE_COLORS[user.role] || 'from-primary to-primary/70';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-500">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-md lg:hidden transition-all duration-500" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Hover to Expand Design */}
      <aside 
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`
          fixed inset-y-0 left-0 z-[70] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          lg:relative lg:translate-x-0 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-[100px]' : 'w-[290px]'}
        `}
      >
        <div className="flex flex-col h-full bg-[#0f172a] dark:bg-[#0f172a]/90 text-white shadow-[20px_0_60px_rgba(0,0,0,0.1)] lg:border-r border-white/5 relative overflow-hidden">
          
          {/* Logo Section */}
          <div className={`px-7 pt-10 pb-8 transition-all duration-500 ${isCollapsed ? 'px-5' : 'px-7'}`}>
            <div className="flex flex-col gap-1 cursor-pointer group" onClick={() => navigate(`/${user.role}`)}>
              <div className={`
                bg-white rounded-2xl p-3 shadow-lg shadow-black/20 group-hover:scale-105 transition-all duration-500 overflow-hidden flex items-center justify-center
                ${isCollapsed ? 'w-14 h-14' : 'w-full'}
              `}>
                <img 
                  src="/Automatiza-logo-rgb-01.jpg" 
                  alt="Automatiza VANS" 
                  className={`h-10 w-auto object-contain transition-all duration-500 ${isCollapsed ? 'scale-[2.5] translate-x-2' : ''}`}
                />
              </div>
              {!isCollapsed && (
                <div className="mt-4 px-1 animate-fade-in whitespace-nowrap">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Painel de Controle</p>
                  <p className="text-sm font-bold text-slate-200 mt-1">{ROLE_LABELS[user.role]}</p>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className={`px-6 mb-8 transition-all duration-500 ${isCollapsed ? 'px-4 flex justify-center' : 'px-6'}`}>
            <div className={`
              flex items-center gap-3 rounded-2xl transition-all duration-300
              ${isCollapsed ? 'w-12 h-12 justify-center bg-white/5 hover:bg-white/10' : 'px-4 py-3 bg-white/5 hover:bg-white/10'}
              ${searchFocused && !isCollapsed ? 'bg-white/10 ring-1 ring-white/20' : ''}
            `}>
              <Search className={`w-4 h-4 transition-colors ${searchFocused ? 'text-white' : 'text-slate-500'}`} />
              {!isCollapsed && (
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="bg-transparent border-none text-[13px] font-medium placeholder:text-slate-500 focus:outline-none w-full animate-fade-in"
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {items.map((item, idx) => {
              const [itemPath, itemQuery] = item.path.split('?');
              const currentQuery = location.search.replace('?', '');
              const active = itemQuery
                ? location.pathname === itemPath && currentQuery === itemQuery
                : location.pathname === item.path && !location.search;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setSidebarOpen(false);
                    setIsCollapsed(true);
                  }}
                  title={isCollapsed ? item.label : ''}
                  className={`
                    group flex items-center rounded-2xl transition-all duration-300 relative
                    ${isCollapsed ? 'justify-center p-0 h-[60px] w-full mb-1' : 'gap-4 px-4 py-3'}
                    ${active 
                      ? 'bg-white/10 text-white shadow-sm shadow-black/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                  `}
                >
                  <div className={`
                    rounded-xl flex items-center justify-center transition-all duration-300 shrink-0
                    ${isCollapsed ? 'w-12 h-12' : 'w-9 h-9'}
                    ${active ? `bg-white text-slate-900 shadow-xl shadow-white/10` : 'bg-slate-800/40 group-hover:bg-slate-800'}
                  `}>
                    <item.icon className={isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'} />
                  </div>
                  
                  {!isCollapsed && (
                    <span className={`flex-1 font-bold tracking-tight text-[13px] ${active ? 'translate-x-0.5' : ''} transition-transform duration-300 animate-fade-in whitespace-nowrap`}>
                      {item.label}
                    </span>
                  )}
                  
                  {active && (
                    <div className={`
                      rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]
                      ${isCollapsed ? 'absolute -right-1 w-1 h-8 rounded-r-none' : 'w-1.5 h-1.5'}
                    `} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className={`p-6 transition-all duration-500 ${isCollapsed ? 'p-2 flex justify-center' : 'p-6'}`}>
            <div className={`
              bg-white/5 rounded-3xl border border-white/5 flex items-center transition-all duration-500
              ${isCollapsed ? 'w-14 h-14 justify-center border-none' : 'p-4 gap-4 w-full'}
            `}>
              <div className={`
                rounded-2xl bg-gradient-to-br ${roleGradient} flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0
                ${isCollapsed ? 'w-12 h-12' : 'w-11 h-11'}
              `}>
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 animate-fade-in">
                  <p className="text-[13px] font-bold text-white truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
              )}
              {!isCollapsed && (
                <button 
                  onClick={logout} 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300" 
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
            {isCollapsed && (
              <button 
                onClick={logout} 
                className="mt-4 w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-300" 
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`
          h-20 flex items-center px-6 gap-4 sticky top-0 z-50 transition-all duration-300
          ${scrolled ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-border/40 shadow-sm' : 'bg-transparent'}
        `}>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-black/5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 dark:border-white/5">
            <div className="hidden sm:flex flex-col items-end px-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hoje</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              </span>
            </div>
            
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white transition-all duration-300"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white transition-all duration-300"
              >
                <Bell className="w-4 h-4" />
                {(() => {
                  const total = (user.role === 'financeiro' ? overduePaymentsCount : unreadDelayReports) || 0;
                  if (total > 0) return (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                      {total > 9 ? '9+' : total}
                    </span>
                  );
                  return <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />;
                })()}
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 animate-scale-in origin-top-right">
                  <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
          <div className="p-3 sm:p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
