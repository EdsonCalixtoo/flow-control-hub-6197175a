import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, getStoredToken, setStoredToken, clearStoredToken } from '@/lib/api';
import { UserRole } from '@/types/erp';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionCompletely: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const initializedRef = useRef(false);

  const loadUserProfile = useCallback(async () => {
    try {
      const userData = await apiFetch('/auth/me');
      const ADMIN_EMAILS = ['juninho.caxto@gmail.com', 'edsoncalixto@gmail.com'];
      const isHardcodedAdmin = userData.email && ADMIN_EMAILS.includes(userData.email.toLowerCase());

      const appUser: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name || 'Usuário',
        role: (isHardcodedAdmin ? 'admin' : (userData.role || 'vendedor')) as User['role'],
      };

      setUser(appUser);
      console.log('[Auth] ✅ Perfil carregado:', appUser.email, '| role:', appUser.role);
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao carregar perfil do NestJS:', err.message);
      setUser(null);
      clearStoredToken();
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('[Auth] Inicializando autenticação local...');

    const safetyTimer = setTimeout(() => {
      console.warn('[Auth] ⚠️ Timeout de segurança atingido — liberando loading');
      setAuthLoading(false);
    }, 5000);

    const init = async () => {
      try {
        const token = getStoredToken();
        if (token) {
          await loadUserProfile();
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('[Auth] ❌ Erro ao inicializar sessão local:', err.message);
        clearStoredToken();
        setUser(null);
      } finally {
        clearTimeout(safetyTimer);
        setAuthLoading(false);
      }
    };

    init();

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Fazendo login na API local...');
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (!data.access_token) {
      throw new Error('Falha na autenticação: token não retornado.');
    }
    
    setStoredToken(data.access_token);
    await loadUserProfile();
  }, [loadUserProfile]);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    console.log('[Auth] Cadastrando novo usuário local...');
    await apiFetch('/auth/register', {
      method: 'POST',
      body: { email, password, name, role: role || 'vendedor' },
    });
    
    // Autentica automaticamente após registrar
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    console.log('[Auth] Efetuando logout...');
    clearStoredToken();
    setUser(null);
    console.log('[Auth] Logout concluído');
  }, []);

  const clearSessionCompletely = useCallback(async () => {
    clearStoredToken();
    setUser(null);
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      authLoading,
      login,
      register,
      logout,
      clearSessionCompletely,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
