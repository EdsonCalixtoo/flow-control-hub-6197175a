import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ERPProvider } from "@/contexts/ERPContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import VendedorDashboard from "@/pages/vendedor/VendedorDashboard";
import ClientesPage from "@/pages/vendedor/ClientesPage";
import OrcamentosPage from "@/pages/vendedor/OrcamentosPage";
import FinanceiroDashboard from "@/pages/financeiro/FinanceiroDashboard";
import AprovacoesPage from "@/pages/financeiro/AprovacoesPage";
import PagamentosPage from "@/pages/financeiro/PagamentosPage";
import LancamentosPage from "@/pages/financeiro/LancamentosPage";
import GestorDashboard from "@/pages/gestor/GestorDashboard";
import ConferenciaPage from "@/pages/gestor/ConferenciaPage";
import RelatoriosPage from "@/pages/gestor/RelatoriosPage";
import ProducaoDashboard from "@/pages/producao/ProducaoDashboard";
import PedidosProducaoPage from "@/pages/producao/PedidosProducaoPage";
import QRCodePage from "@/pages/QRCodePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ role: string; children: React.ReactNode }> = ({ role, children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== role) return <Navigate to={`/${user?.role}`} replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthGate: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) return <Navigate to={`/${user.role}`} replace />;
  return <LoginPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ERPProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthGate />} />
              
              {/* Vendedor */}
              <Route path="/vendedor" element={<ProtectedRoute role="vendedor"><VendedorDashboard /></ProtectedRoute>} />
              <Route path="/vendedor/clientes" element={<ProtectedRoute role="vendedor"><ClientesPage /></ProtectedRoute>} />
              <Route path="/vendedor/orcamentos" element={<ProtectedRoute role="vendedor"><OrcamentosPage /></ProtectedRoute>} />

              {/* Financeiro */}
              <Route path="/financeiro" element={<ProtectedRoute role="financeiro"><FinanceiroDashboard /></ProtectedRoute>} />
              <Route path="/financeiro/aprovacoes" element={<ProtectedRoute role="financeiro"><AprovacoesPage /></ProtectedRoute>} />
              <Route path="/financeiro/pagamentos" element={<ProtectedRoute role="financeiro"><PagamentosPage /></ProtectedRoute>} />
              <Route path="/financeiro/lancamentos" element={<ProtectedRoute role="financeiro"><LancamentosPage /></ProtectedRoute>} />

              {/* Gestor */}
              <Route path="/gestor" element={<ProtectedRoute role="gestor"><GestorDashboard /></ProtectedRoute>} />
              <Route path="/gestor/conferencia" element={<ProtectedRoute role="gestor"><ConferenciaPage /></ProtectedRoute>} />
              <Route path="/gestor/relatorios" element={<ProtectedRoute role="gestor"><RelatoriosPage /></ProtectedRoute>} />

              {/* Produção */}
              <Route path="/producao" element={<ProtectedRoute role="producao"><ProducaoDashboard /></ProtectedRoute>} />
              <Route path="/producao/pedidos" element={<ProtectedRoute role="producao"><PedidosProducaoPage /></ProtectedRoute>} />

              {/* QR Code */}
              <Route path="/qr/:orderId" element={<QRCodePage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ERPProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
