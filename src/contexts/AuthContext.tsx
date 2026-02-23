import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/types/erp';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Constrói o objeto User a partir dos dados disponíveis
function buildUser(
  id: string,
  email: string,
  meta: Record<string, unknown>,
  profileData?: { name: string; role: string; avatar_url?: string }
): User {
  return {
    id,
    name: profileData?.name || (meta?.name as string) || email.split('@')[0] || 'Usuário',
    email,
    role: ((profileData?.role || meta?.role) as UserRole) ?? 'vendedor',
    avatar: profileData?.avatar_url ?? undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança: após 4s, libera a tela mesmo sem resposta
    const fallbackTimer = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 4000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const au = session.user;
          const meta = au.user_metadata ?? {};

          // Tenta carregar perfil do banco (silencia erros se tabela não existe)
          try {
            const { data } = await supabase
              .from('profiles').select('*').eq('id', au.id).single();
            if (mounted && data) {
              setUser(buildUser(au.id, au.email ?? '', meta, data));
              return;
            }
          } catch { /* tabela não existe ainda */ }

          // Fallback: usa metadados da sessão (disponíveis imediatamente)
          if (mounted) {
            setUser(buildUser(au.id, au.email ?? '', meta));
          }
        }
      } catch { /* ignore */ }
      finally {
        clearTimeout(fallbackTimer);
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    // Listener para mudanças em tempo real (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (!session?.user) {
          setUser(null);
          return;
        }
        const au = session.user;
        const meta = au.user_metadata ?? {};

        // Usa metadados imediatamente (sem aguardar DB) → sem spinner
        setUser(buildUser(au.id, au.email ?? '', meta));

        // Tenta enriquecer com dados da tabela profiles em background
        try {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', au.id).single();
          if (mounted && data) {
            setUser(buildUser(au.id, au.email ?? '', meta, data));
          }
        } catch { /* ignora se tabela não existe */ }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  // ── LOGIN ─────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  // ── REGISTER ──────────────────────────────────────────────
  // name e role nos metadados → trigger handle_new_user() cria o perfil no banco
  const register = useCallback(async (
    name: string, email: string, password: string, role: UserRole
  ): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role } },
    });
    return error ? error.message : null;
  }, []);

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
