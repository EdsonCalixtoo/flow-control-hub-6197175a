import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '@/types/erp';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
}

/**
 * Registrar novo usuário com role específico
 */
export async function signup(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
) {
  try {
    // 1. Criar usuário na auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não criado');

    // 2. Criar perfil na tabela profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (profileError) throw profileError;

    return {
      user: authData.user,
      profile: profileData,
    };
  } catch (error) {
    console.error('Erro ao registrar:', error);
    throw error;
  }
}

/**
 * Fazer login
 */
export async function login(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Buscar perfil completo
    const profile = await getProfileById(data.user.id);
    return { user: data.user, profile };
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
}

/**
 * Fazer logout
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) return null;

    const profile = await getProfileById(data.user.id);
    return { user: data.user, profile };
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Obter perfil por ID
 */
export async function getProfileById(userId: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      avatarUrl: data.avatar_url,
      isActive: data.is_active,
    };
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    return null;
  }
}

/**
 * Atualizar perfil do usuário
 */
export async function updateProfile(
  userId: string,
  updates: Partial<{
    fullName: string;
    avatarUrl: string;
  }>
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
}

/**
 * Listar todos os usuários (apenas admin)
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');

    if (error) throw error;

    return data.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role as UserRole,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
    }));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
}

/**
 * Listar usuários por role
 */
export async function getUsersByRole(role: UserRole): Promise<AuthUser[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role);

    if (error) throw error;

    return data.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role as UserRole,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
    }));
  } catch (error) {
    console.error('Erro ao listar usuários por role:', error);
    return [];
  }
}

/**
 * Subscribe para mudanças em tempo real no usuário
 */
export function subscribeToProfileChanges(
  userId: string,
  callback: (profile: AuthUser) => void
) {
  const subscription = supabase
    .channel(`profile-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload: any) => {
        if (payload.new && payload.new.id === userId) {
          callback({
            id: payload.new.id,
            email: payload.new.email,
            fullName: payload.new.full_name,
            role: payload.new.role as UserRole,
            avatarUrl: payload.new.avatar_url,
            isActive: payload.new.is_active,
          });
        }
      }
    )
    .subscribe();

  return subscription;
}
