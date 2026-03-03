import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'vendedor' | 'gestor' | 'financeiro' | 'producao' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionCompletely: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Carrega usuário do localStorage na inicialização
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('[Auth] Erro ao carregar usuário:', err);
        localStorage.removeItem('auth_user');
      }
    }
    setAuthLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulação de login - sem backend
    console.log('[Auth] Login com:', email);
    
    const mockUser: User = {
      id: crypto.randomUUID(),
      name: email.split('@')[0],
      email,
      role: 'vendedor',
    };

    setUser(mockUser);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
  };

  const register = async (data: { name: string; email: string; password: string; role: string }) => {
    // Simulação de registro - sem backend
    console.log('[Auth] Registrando:', data.email);
    
    const newUser: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      role: (data.role || 'vendedor') as User['role'],
    };

    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    console.log('[Auth] Logout');
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const clearSessionCompletely = async () => {
    console.log('[Auth] Limpando sessão completamente');
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authLoading,
        login,
        register,
        logout,
        clearSessionCompletely,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
};
