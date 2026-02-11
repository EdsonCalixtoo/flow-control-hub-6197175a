import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, UserRole } from '@/types/erp';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<UserRole, User> = {
  vendedor: { id: '1', name: 'Carlos Silva', email: 'carlos@erp.com', role: 'vendedor' },
  financeiro: { id: '2', name: 'Ana Oliveira', email: 'ana@erp.com', role: 'financeiro' },
  gestor: { id: '3', name: 'Roberto Santos', email: 'roberto@erp.com', role: 'gestor' },
  producao: { id: '4', name: 'Maria Costa', email: 'maria@erp.com', role: 'producao' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((role: UserRole) => {
    setUser(DEMO_USERS[role]);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
