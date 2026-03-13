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
  const currentUserIdRef = useRef<string | null>(null);

  const loadUserProfile = useCallback(async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    // Evita busca duplicada
    if (currentUserIdRef.current === authUser.id) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', authUser.id)
        .maybeSingle();

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
      console.error('[Auth] ❌ Erro no loadUserProfile:', err.message);
      // Fallback com dados do JWT para não travar
      const fallback: User = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || 'Usuário',
        role: (authUser.user_metadata?.role || 'vendedor') as User['role'],
      };
      currentUserIdRef.current = fallback.id;
      setUser(fallback);
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] Inicializando autenticação...');

    // 1. Leitura imediata da sessão local (não faz chamada de rede, é síncrono do storage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Carrega perfil em background, mas já libera o loading
        loadUserProfile(session.user);
      }
      // Sempre libera o loading após getSession — nunca trava
      setAuthLoading(false);
    }).catch(() => {
      // Se getSession falhar (ex: rede offline), libera o loading mesmo assim
      setAuthLoading(false);
    });

    // 2. Escuta mudanças futuras (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Evento:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        currentUserIdRef.current = null;
      }
      // TOKEN_REFRESHED e INITIAL_SESSION são ignorados — getSession() já cuidou da inicialização
    });

    return () => subscription?.unsubscribe();
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Login com email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Sem sessão após login');
      console.log('[Auth] ✅ Login bem-sucedido');
      // onAuthStateChange SIGNED_IN vai chamar loadUserProfile
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao fazer login:', err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('[Auth] 📝 Registrando:', email);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: role || 'vendedor' } },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!authData.user) throw new Error('Falha ao criar usuário');

      await new Promise(r => setTimeout(r, 500));

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) console.warn('[Auth] ⚠️ Login automático falhou:', loginError.message);
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao registrar:', err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    currentUserIdRef.current = null;
  }, []);

  const clearSessionCompletely = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) { /* ignora */ }
    localStorage.clear();
    setUser(null);
    currentUserIdRef.current = null;
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
