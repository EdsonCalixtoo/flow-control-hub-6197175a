import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'vendedor' | 'gestor' | 'financeiro' | 'producao' | 'producao_carenagem' | 'admin' | 'garantia';

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

// Limpa chaves de sessão do Supabase do localStorage (tokens expirados/corrompidos)
function clearSupabaseStorage() {
  const keysToRemove = Object.keys(localStorage).filter(k =>
    k.startsWith('sb-') || k.includes('supabase')
  );
  keysToRemove.forEach(k => localStorage.removeItem(k));
  console.log('[Auth] 🗑️ Storage limpo:', keysToRemove);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const loadUserProfile = useCallback(async (authUser: { id: string; email?: string; user_metadata?: any }) => {
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
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('[Auth] Inicializando autenticação...');

    // Timeout de segurança: garante que o authLoading some em no máximo 5s
    const safetyTimer = setTimeout(() => {
      console.warn('[Auth] ⚠️ Timeout de segurança atingido — liberando loading');
      setAuthLoading(false);
    }, 5000);

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // Token inválido/expirado — limpa storage e pede novo login
          console.warn('[Auth] ⚠️ Sessão inválida, limpando storage:', error.message);
          clearSupabaseStorage();
          setUser(null);
        } else if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err: any) {
        console.error('[Auth] ❌ Erro ao inicializar sessão:', err.message);
        // Se falhar (ex: offline), limpa tokens corrompidos para não travar
        clearSupabaseStorage();
      } finally {
        clearTimeout(safetyTimer);
        setAuthLoading(false);
      }
    };

    init();

    // Escuta mudanças futuras APENAS para SIGNED_IN e SIGNED_OUT
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Evento:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        currentUserIdRef.current = null;
      }
    });

    return () => {
      subscription?.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Sem sessão após login');
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: role || 'vendedor' } },
    });
    if (signUpError) throw new Error(signUpError.message);
    if (!authData.user) throw new Error('Falha ao criar usuário');
    await new Promise(r => setTimeout(r, 500));
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) throw new Error(loginError.message);
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[Auth] Efetuando logout...');
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Auth] Erro ao deslogar da API:', err);
    } finally {
      setUser(null);
      currentUserIdRef.current = null;
      // Limpa storage por segurança
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
      });
      console.log('[Auth] Logout concluído (estado local limpo)');
    }
  }, []);

  const clearSessionCompletely = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (_) {}
    clearSupabaseStorage();
    setUser(null);
    currentUserIdRef.current = null;
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
