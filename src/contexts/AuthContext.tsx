import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  // Guard: rastreia qual userId está sendo carregado para evitar buscas duplicadas
  const loadingUserIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const loadUserProfile = useCallback(async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    // Se já está buscando esse usuário, ignora
    if (loadingUserIdRef.current === authUser.id || currentUserIdRef.current === authUser.id) {
      console.log('[Auth] ⏭️ Perfil já carregado/carregando para:', authUser.id);
      return;
    }
    loadingUserIdRef.current = authUser.id;

    try {
      console.log('[Auth] 🔍 Buscando perfil para:', authUser.id);
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] ⚠️ Erro ao buscar perfil:', error.message);
      }

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
            role: (authUser.user_metadata?.role || 'vendedor') as User['role'],
          };

      currentUserIdRef.current = appUser.id;
      setUser(appUser);
      console.log('[Auth] ✅ Perfil carregado:', appUser.email, '| role:', appUser.role);
    } catch (err: any) {
      console.error('[Auth] ❌ Erro crítico no loadUserProfile:', err.message);
      // Fallback mínimo para não travar o login
      const fallback: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || 'Usuário',
        role: (authUser.user_metadata?.role || 'vendedor') as User['role'],
      };
      currentUserIdRef.current = fallback.id;
      setUser(fallback);
    } finally {
      loadingUserIdRef.current = null;
    }
  }, []);

  // Carrega usuário da sessão do Supabase na inicialização
  useEffect(() => {
    console.log('[Auth] Inicializando autenticação...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Estado de autenticação mudou:', event);

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          await loadUserProfile(session.user);
        }
        setAuthLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Só recarrega se for um usuário diferente do já logado
        if (currentUserIdRef.current !== session.user.id) {
          await loadUserProfile(session.user);
        }
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        currentUserIdRef.current = null;
        loadingUserIdRef.current = null;
        setAuthLoading(false);
        console.log('[Auth] Usuário desconectado');
      } else if (event === 'TOKEN_REFRESHED') {
        // Token renovado silenciosamente — não precisa rebuscar perfil
        console.log('[Auth] 🔄 Token renovado silenciosamente');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Login com email:', email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.session) throw new Error('Sem sessão mantida após login');

      console.log('[Auth] ✅ Login bem-sucedido - perfil será carregado pelo onAuthStateChange');
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao fazer login:', err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('[Auth] 📝 Registrando novo usuário:', email);

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

      await new Promise(r => setTimeout(r, 500));

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        console.warn('[Auth] ⚠️ Erro ao fazer login automático:', loginError.message);
      } else {
        console.log('[Auth] ✅ Registro e login automático bem-sucedidos');
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
      currentUserIdRef.current = null;
      loadingUserIdRef.current = null;
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
      currentUserIdRef.current = null;
      loadingUserIdRef.current = null;
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
