import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'vendedor' | 'gestor' | 'financeiro' | 'producao' | 'admin';
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

  // Carrega usuário da sessão do Supabase na inicialização
  useEffect(() => {
    console.log('[Auth] Inicializando autenticação...');

    // onAuthStateChange com INITIAL_SESSION é a forma correta de inicializar:
    // dispara imediatamente com a sessão do storage local (sem chamada de rede),
    // resolvendo o authLoading antes de qualquer fetch adicional.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Estado de autenticação mudou:', event);

      if (event === 'INITIAL_SESSION') {
        // Primeira leitura da sessão local — resolve o loading
        if (session?.user) {
          loadUserProfile(session.user); // não await para não bloquear
        }
        setAuthLoading(false); // sempre libera o loading aqui
      } else if (event === 'SIGNED_IN' && session?.user) {
        loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        console.log('[Auth] Usuário desconectado');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Sessão renovada — atualiza silenciosamente
        loadUserProfile(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ── Carrega o perfil do usuário a partir da tabela public.users ──
  // Se não encontrar (ex: novo usuário antes do trigger existir), usa dados do JWT
  const loadUserProfile = async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', authUser.id)
      .single();

    const appUser: User = userData
      ? {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: (userData.role || 'vendedor') as User['role'],
      }
      : {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        role: 'vendedor',
      };

    setUser(appUser);
    console.log('[Auth] ✅ Perfil carregado:', appUser.email, '| role:', appUser.role);
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Login com email:', email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.session) throw new Error('Sem sessão mantida após login');

      console.log('[Auth] ✅ Login bem-sucedido');
      // O onAuthStateChange vai chamar loadUserProfile automaticamente
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao fazer login:', err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('[Auth] 📝 Registrando novo usuário:', email);

      // Cria conta no Supabase Auth.
      // O trigger on_auth_user_created cuida de inserir em public.users automaticamente.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: role || 'vendedor' },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!authData.user) throw new Error('Falha ao criar usuário');

      console.log('[Auth] ✅ Usuário criado em Auth:', authData.user.id);

      // Aguarda o trigger executar (breve delay) e faz login
      await new Promise(r => setTimeout(r, 500));

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        console.warn('[Auth] ⚠️ Erro ao fazer login automático:', loginError.message);
      } else {
        console.log('[Auth] ✅ Registro e login automático bem-sucedidos');
        // onAuthStateChange vai chamar loadUserProfile automaticamente
      }
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao registrar:', err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[Auth] 🔓 Logout');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      console.log('[Auth] ✅ Logout bem-sucedido');
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao fazer logout:', err.message);
      throw err;
    }
  }, []);

  const clearSessionCompletely = useCallback(async () => {
    console.log('[Auth] 🗑️ Limpando sessão completamente');
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      console.log('[Auth] ✅ Sessão limpa');
    } catch (err: any) {
      console.error('[Auth] ⚠️ Erro ao limpar sessão:', err.message);
    }
  }, []);

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
