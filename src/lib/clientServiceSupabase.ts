import { supabase } from './supabase';
import type { Client } from '@/types/erp';

/**
 * Converter da estrutura TypeScript para estrutura do Supabase
 */
const clientToSupabase = (client: Client, userId: string) => ({
  id: client.id !== 'temp' ? client.id : undefined,
  user_id: userId,
  name: client.name,
  cpf_cnpj: client.cpfCnpj,
  phone: client.phone,
  email: client.email,
  address: client.address,
  bairro: client.bairro || null,
  city: client.city,
  state: client.state,
  cep: client.cep,
  notes: client.notes,
  consignado: client.consignado || false,
});

/**
 * Converter da estrutura do Supabase para TypeScript
 */
const supabaseToClient = (data: any): Client => ({
  id: data.id,
  name: data.name,
  cpfCnpj: data.cpf_cnpj,
  phone: data.phone,
  email: data.email,
  address: data.address,
  bairro: data.bairro,
  city: data.city,
  state: data.state,
  cep: data.cep,
  notes: data.notes,
  consignado: data.consignado,
  createdBy: data.user_id,
  createdAt: data.created_at,
});

/**
 * Buscar todos os clientes do usuário
 */
export const fetchClients = async (): Promise<Client[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[Clients] ❌ Erro ao obter usuário:', userError?.message);
      return [];
    }

    console.log('[Clients] 📝 Buscando clientes para usuário:', user.id);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Clients] ❌ Erro ao buscar clientes:', error.message);
      return [];
    }

    const clients = (data || []).map(supabaseToClient);
    console.log('[Clients] ✅ Clientes carregados:', clients.length);
    return clients;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes:', err.message);
    return [];
  }
};

/**
 * Crear novo cliente
 */
export const createClient = async (client: Omit<Client, 'id' | 'createdAt' | 'createdBy'>): Promise<Client | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('[Clients] 📝 Criando novo cliente:', client.name);

    const clientData = clientToSupabase(
      {
        ...client,
        id: 'temp',
        createdAt: new Date().toISOString(),
      },
      user.id
    );

    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const newClient = supabaseToClient(data);
    console.log('[Clients] ✅ Cliente criado:', newClient.id, newClient.name);
    return newClient;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao criar cliente:', err.message);
    throw err;
  }
};

/**
 * Atualizar cliente
 */
export const updateClient = async (client: Client): Promise<Client | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('[Clients] 📝 Atualizando cliente:', client.id);

    const clientData = clientToSupabase(client, user.id);

    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', client.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updatedClient = supabaseToClient(data);
    console.log('[Clients] ✅ Cliente atualizado:', updatedClient.id);
    return updatedClient;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao atualizar cliente:', err.message);
    throw err;
  }
};

/**
 * Deletar cliente
 */
export const deleteClient = async (clientId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('[Clients] 🗑️ Deletando cliente:', clientId);

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Clients] ✅ Cliente deletado:', clientId);
    return true;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao deletar cliente:', err.message);
    throw err;
  }
};

/**
 * Buscar cliente por ID
 */
export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[Clients] ❌ Usuário não autenticado');
      return null;
    }

    console.log('[Clients] 🔍 Buscando cliente:', clientId);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[Clients] ❌ Cliente não encontrado:', error.message);
      return null;
    }

    return supabaseToClient(data);
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar cliente:', err.message);
    return null;
  }
};

/**
 * Buscar clientes por email
 */
export const searchClientsByEmail = async (email: string): Promise<Client[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[Clients] ❌ Usuário não autenticado');
      return [];
    }

    console.log('[Clients] 🔍 Buscando clientes por email:', email);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .ilike('email', `%${email}%`);

    if (error) {
      console.error('[Clients] ❌ Erro ao buscar por email:', error.message);
      return [];
    }

    return (data || []).map(supabaseToClient);
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes:', err.message);
    return [];
  }
};

/**
 * Buscar clientes por nome
 */
export const searchClientsByName = async (name: string): Promise<Client[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[Clients] ❌ Usuário não autenticado');
      return [];
    }

    console.log('[Clients] 🔍 Buscando clientes por nome:', name);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`)
      .limit(10);

    if (error) {
      console.error('[Clients] ❌ Erro ao buscar por nome:', error.message);
      return [];
    }

    return (data || []).map(supabaseToClient);
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes:', err.message);
    return [];
  }
};

/**
 * Sincronizar clientes locais para Supabase (para migração de dados)
 */
export const syncClientsToSupabase = async (localClients: Client[]): Promise<{ synced: number; failed: number }> => {
  let synced = 0;
  let failed = 0;

  for (const client of localClients) {
    try {
      const { createdAt, createdBy, ...clientData } = client;
      await createClient(clientData as Omit<Client, 'id' | 'createdAt' | 'createdBy'>);
      synced++;
    } catch (err) {
      console.error('[Clients] Erro ao sincronizar cliente:', client.name, err);
      failed++;
    }
  }

  console.log('[Clients] ✅ Sincronização concluída:', { synced, failed });
  return { synced, failed };
};
