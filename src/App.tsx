import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ERPProvider } from "@/contexts/ERPContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import VendedorDashboard from "@/pages/vendedor/VendedorDashboard";
import ClientesPageNew from "@/pages/vendedor/ClientesPageNew";
import OrcamentosPage from "@/pages/vendedor/OrcamentosPage";
import ClienteDetalhesPage from "@/pages/vendedor/ClienteDetalhesPage";
import GarantiaVendedorPage from "@/pages/vendedor/GarantiasPage";
import FinanceiroDashboard from "@/pages/financeiro/FinanceiroDashboard";
import AprovacoesPage from "@/pages/financeiro/AprovacoesPage";
import PagamentosPage from "@/pages/financeiro/PagamentosPage";
import LancamentosPage from "@/pages/financeiro/LancamentosPage";
import FluxoCaixaPage from "@/pages/financeiro/FluxoCaixaPage";
import VendedoresControlPage from "@/pages/financeiro/VendedoresControlPage";
import GarantiaFinanceiroPage from "@/pages/financeiro/GarantiasPage";
import CronogramaVendedorPage from "@/pages/vendedor/CronogramaPage";
import CalendarioProducaoVendedorPage from "@/pages/vendedor/CalendarioProducaoPage";
import PedidosFinanceiroPage from "@/pages/financeiro/PedidosFinanceiroPage";
import GestorDashboard from "@/pages/gestor/GestorDashboard";
import ConferenciaPage from "@/pages/gestor/ConferenciaPage";
import RelatoriosPage from "@/pages/gestor/RelatoriosPage";
import EstoquePage from "@/pages/gestor/EstoquePage";
import ProdutosPage from "@/pages/gestor/ProdutosPage";
import EntregadoresPage from "@/pages/gestor/EntregadoresPage";
import CorrigirPedidoPage from "@/pages/gestor/CorrigirPedidoPage";
import ProducaoDashboard from "@/pages/producao/ProducaoDashboard";
import PedidosProducaoPage from "@/pages/producao/PedidosProducaoPage";
import TrackingPage from "@/pages/TrackingPage";
import WarrantyTrackingPage from "@/pages/WarrantyTrackingPage";
import QRCodePage from "@/pages/QRCodePage";
import NotFound from "./pages/NotFound";
import { lazy, Suspense } from "react";

const CronogramaProducaoPage = lazy(() => import('@/pages/producao/CronogramaPage'));

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ role: string; children: React.ReactNode }> = ({ role, children }) => {
  const { user, isAuthenticated, authLoading } = useAuth();
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== role) return <Navigate to={`/${user?.role}`} replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthGate: React.FC = () => {
  const { isAuthenticated, user, authLoading } = useAuth();
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (isAuthenticated && user) return <Navigate to={`/${user.role}`} replace />;
  return <LoginPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <ERPProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<AuthGate />} />

                {/* Vendedor */}
                <Route path="/vendedor" element={<ProtectedRoute role="vendedor"><VendedorDashboard /></ProtectedRoute>} />
                <Route path="/vendedor/clientes" element={<ProtectedRoute role="vendedor"><ClientesPageNew /></ProtectedRoute>} />
                <Route path="/vendedor/clientes/:id" element={<ProtectedRoute role="vendedor"><ClienteDetalhesPage /></ProtectedRoute>} />
                <Route path="/vendedor/orcamentos" element={<ProtectedRoute role="vendedor"><OrcamentosPage /></ProtectedRoute>} />
                <Route path="/vendedor/garantias" element={<ProtectedRoute role="vendedor"><GarantiaVendedorPage /></ProtectedRoute>} />
                <Route path="/vendedor/cronograma" element={<ProtectedRoute role="vendedor"><CronogramaVendedorPage /></ProtectedRoute>} />
                <Route path="/vendedor/calendario" element={<ProtectedRoute role="vendedor"><CalendarioProducaoVendedorPage /></ProtectedRoute>} />

                {/* Financeiro */}
                <Route path="/financeiro" element={<ProtectedRoute role="financeiro"><FinanceiroDashboard /></ProtectedRoute>} />
                <Route path="/financeiro/aprovacoes" element={<ProtectedRoute role="financeiro"><AprovacoesPage /></ProtectedRoute>} />
                <Route path="/financeiro/pagamentos" element={<ProtectedRoute role="financeiro"><PagamentosPage /></ProtectedRoute>} />
                <Route path="/financeiro/lancamentos" element={<ProtectedRoute role="financeiro"><LancamentosPage /></ProtectedRoute>} />
                <Route path="/financeiro/fluxo" element={<ProtectedRoute role="financeiro"><FluxoCaixaPage /></ProtectedRoute>} />
                <Route path="/financeiro/vendedores" element={<ProtectedRoute role="financeiro"><VendedoresControlPage /></ProtectedRoute>} />
                <Route path="/financeiro/garantias" element={<ProtectedRoute role="financeiro"><GarantiaFinanceiroPage /></ProtectedRoute>} />
                <Route path="/financeiro/pedidos" element={<ProtectedRoute role="financeiro"><PedidosFinanceiroPage /></ProtectedRoute>} />
                <Route path="/financeiro/carenagem" element={<ProtectedRoute role="financeiro"><FinanceiroDashboard defaultTab="carenagem" /></ProtectedRoute>} />

                {/* Gestor */}
                <Route path="/gestor" element={<ProtectedRoute role="gestor"><GestorDashboard /></ProtectedRoute>} />
                <Route path="/gestor/conferencia" element={<ProtectedRoute role="gestor"><ConferenciaPage /></ProtectedRoute>} />
                <Route path="/gestor/estoque" element={<ProtectedRoute role="gestor"><EstoquePage /></ProtectedRoute>} />
                <Route path="/gestor/produtos" element={<ProtectedRoute role="gestor"><ProdutosPage /></ProtectedRoute>} />
                <Route path="/gestor/relatorios" element={<ProtectedRoute role="gestor"><RelatoriosPage /></ProtectedRoute>} />
                <Route path="/gestor/entregadores" element={<ProtectedRoute role="gestor"><EntregadoresPage /></ProtectedRoute>} />
                <Route path="/gestor/corrigir-pedido" element={<ProtectedRoute role="gestor"><CorrigirPedidoPage /></ProtectedRoute>} />

                {/* Produção */}
                <Route path="/producao" element={<ProtectedRoute role="producao"><ProducaoDashboard /></ProtectedRoute>} />
                <Route path="/producao/pedidos" element={<ProtectedRoute role="producao"><PedidosProducaoPage /></ProtectedRoute>} />
                <Route path="/producao/cronograma" element={<ProtectedRoute role="producao"><Suspense fallback={null}><CronogramaProducaoPage /></Suspense></ProtectedRoute>} />
                <Route path="/producao/historico" element={<ProtectedRoute role="producao"><div className="p-8">Histórico da Produção</div></ProtectedRoute>} />

                {/* Produção Carenagem */}
                <Route path="/producao_carenagem" element={<ProtectedRoute role="producao_carenagem"><ProducaoDashboard /></ProtectedRoute>} />
                <Route path="/producao_carenagem/pedidos" element={<ProtectedRoute role="producao_carenagem"><PedidosProducaoPage /></ProtectedRoute>} />
                <Route path="/producao_carenagem/cronograma" element={<ProtectedRoute role="producao_carenagem"><Suspense fallback={null}><CronogramaProducaoPage /></Suspense></ProtectedRoute>} />
                <Route path="/producao_carenagem/historico" element={<ProtectedRoute role="producao_carenagem"><div className="p-8">Histórico da Produção Carenagem</div></ProtectedRoute>} />

                {/* Garantia */}
                <Route path="/garantia" element={<ProtectedRoute role="garantia"><GarantiaVendedorPage /></ProtectedRoute>} />
                <Route path="/garantia/pedidos" element={<ProtectedRoute role="garantia"><GarantiaVendedorPage /></ProtectedRoute>} />


                <Route path="/qr/:orderId" element={<QRCodePage />} />
                <Route path="/rastreio/:orderId" element={<TrackingPage />} />
                <Route path="/rastreio/garantia/:warrantyId" element={<WarrantyTrackingPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ERPProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
