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
    const initAuth = async () => {
      try {
        console.log('[Auth] Inicializando autenticação...');
        
        // Verifica se há sessão ativa
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('[Auth] Erro ao obter sessão:', error.message);
          setAuthLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[Auth] ✅ Sessão ativa para:', session.user.email);
          
          // Busca dados completos do usuário
          const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', session.user.id)
            .single();

          if (fetchError || !userData) {
            console.warn('[Auth] Usuário não encontrado na tabela, usando dados da sessão');
            const appUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
              role: 'vendedor',
            };
            setUser(appUser);
          } else {
            const appUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: (userData.role || 'vendedor') as User['role'],
            };
            setUser(appUser);
            console.log('[Auth] ✅ Usuário carregado:', appUser.email);
          }
        }
      } catch (err: any) {
        console.error('[Auth] Erro ao inicializar:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Estado de autenticação mudou:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Busca dados do usuário
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, name, role')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          const appUser: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: (userData.role || 'vendedor') as User['role'],
          };
          setUser(appUser);
          console.log('[Auth] ✅ Usuário atualizado após login:', appUser.email);
        } else {
          const appUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            role: 'vendedor',
          };
          setUser(appUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        console.log('[Auth] Usuário desconectado');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] 🔐 Login com email:', email);
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.session) {
        throw new Error('Sem sessão mantida após login');
      }

      console.log('[Auth] ✅ Login bem-sucedido');

      // Busca dados do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', authData.session.user.id)
        .single();

      if (userData) {
        const appUser: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: (userData.role || 'vendedor') as User['role'],
        };
        setUser(appUser);
      } else {
        const appUser: User = {
          id: authData.session.user.id,
          email: authData.session.user.email || '',
          name: authData.session.user.user_metadata?.name || email.split('@')[0],
          role: 'vendedor',
        };
        setUser(appUser);
      }
    } catch (err: any) {
      console.error('[Auth] ❌ Erro ao fazer login:', err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('[Auth] 📝 Registrando novo usuário:', email);
      
      // Cria conta no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário');
      }

      console.log('[Auth] ✅ Usuário criado em Auth:', authData.user.id);

      // Insere dados do usuário na tabela
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        name,
        role: (role || 'vendedor') as User['role'],
      });

      if (insertError) {
        console.warn('[Auth] ⚠️ Erro ao inserir na tabela users:', insertError.message);
        // Continua mesmo com erro, o auth foi criado
      } else {
        console.log('[Auth] ✅ Usuário inserido na tabela');
      }

      // Faz login automático
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.warn('[Auth] ⚠️ Erro ao fazer login automático após registro');
      } else {
        const appUser: User = {
          id: authData.user.id,
          email,
          name,
          role: (role || 'vendedor') as User['role'],
        };
        setUser(appUser);
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
