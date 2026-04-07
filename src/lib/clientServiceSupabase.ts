import { supabase } from './supabase';
import type { Client } from '@/types/erp';

/**
 * Converter da estrutura TypeScript para estrutura do Supabase
 */
const clientToSupabase = (client: Client, userId: string) => {
  const data: any = {
    user_id: userId,
    name: client.name,
    cpf_cnpj: client.cpfCnpj,
    phone: client.phone || null,
    email: client.email || null,
    address: client.address || null,
    bairro: client.bairro || null,
    city: client.city || null,
    state: client.state || null,
    cep: client.cep || null,
    notes: client.notes || null,
    consignado: client.consignado || false,
    is_site: client.isSite || false,
  };

  // Só inclui ID em updates (nunca em inserts)
  if (client.id && client.id !== '' && client.id !== 'temp') {
    data.id = client.id;
  }

  return data;
};

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
  isSite: data.is_site,
  createdBy: data.user_id,
  createdAt: data.created_at,
});

/**
 * Obtém o user_id da sessão atual.
 * 
 * IMPORTANTE: Usamos getSession() em vez de getUser() porque:
 * - getUser() faz chamada remota à API do Supabase (pode retornar 406 com RLS)
 * - getSession() lê o JWT local — garante que o id é o mesmo que auth.users registrou
 * Isso resolve o erro "violates foreign key constraint clients_user_id_fkey"
 */
const getCurrentUserId = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }
  console.log('[Clients] 🔑 user_id da sessão:', session.user.id);
  return session.user.id;
};

/**
 * Buscar todos os clientes do usuário
 */
export const fetchClients = async (): Promise<Client[]> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user?.id) {
      console.error('[Clients] ❌ Sem sessão ativa');
      return [];
    }

    const userId = session.user.id;
    let userRole = session.user.user_metadata?.role;
    const userEmail = session.user.email;

    // Se o cargo não estiver no metadata, ou para garantir precisão, busca na tabela users
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
      
    if (profile?.role) {
      userRole = profile.role;
    }

    console.log('[Clients] 📝 Buscando clientes. User:', userId, 'Role:', userRole, 'Email:', userEmail);

    // ⚡ OTIMIZAÇÃO: Selecionamos apenas as colunas necessárias para as listagens
    const CLIENT_LIST_COLUMNS = 'id, name, cpf_cnpj, phone, email, address, bairro, city, state, cep, notes, consignado, is_site, user_id, created_at';

    let query = supabase.from('clients').select(CLIENT_LIST_COLUMNS);

    // ✅ Filtro de segurança: Se for vendedor, isola apenas os clientes dele
    // Exceção especial para a Erica que tem visibilidade total
    if (userRole === 'vendedor' && userEmail !== 'ericasousa@gmail.com') {
      console.log('[Clients] 🔒 Aplicando isolamento de vendedor');
      query = query.eq('user_id', userId);
    } else {
      console.log('[Clients] 🔓 Visibilidade total habilitada para:', userEmail || userRole);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[Clients] ❌ Erro ao buscar clientes no Supabase:', error.message);
      return [];
    }

    const clients = (data || []).map(supabaseToClient);
    console.log('[Clients] ✅ Clientes carregados:', clients.length);
    return clients;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro inesperado ao buscar clientes:', err.message);
    return [];
  }
};

/**
 * Criar novo cliente.
 * O campo "id" NUNCA é enviado — o Supabase gera via gen_random_uuid().
 */
export const createClient = async (client: Omit<Client, 'id' | 'createdAt' | 'createdBy'>): Promise<Client | null> => {
  try {
    const userId = await getCurrentUserId();
    console.log('[Clients] 📝 Criando novo cliente:', client.name, '| user_id:', userId);

    const clientData = {
      user_id: userId,
      name: client.name,
      cpf_cnpj: client.cpfCnpj,
      phone: client.phone || null,
      email: client.email || null,
      address: client.address || null,
      bairro: client.bairro || null,
      city: client.city || null,
      state: client.state || null,
      cep: client.cep || null,
      notes: client.notes || null,
      consignado: client.consignado || false,
      is_site: client.isSite || false,
    };

    const { data, error } = await Promise.race([
      supabase.from('clients').insert([clientData]).select().single(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido ao inserir no banco (10s)')), 10000))
    ]);

    if (error) {
      console.error('[Clients] ❌ Supabase insert error:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('O banco de dados não retornou o cliente criado.');
    }

    const newClient = supabaseToClient(data);
    console.log('[Clients] ✅ Cliente criado com SUCESSO:', newClient.id, newClient.name);
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
    const userId = await getCurrentUserId();
    console.log('[Clients] 📝 Atualizando cliente:', client.id);

    const clientData = clientToSupabase(client, userId);

    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', client.id)
      .eq('user_id', userId)
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
    const userId = await getCurrentUserId();
    console.log('[Clients] 🗑️ Deletando cliente:', clientId);

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('user_id', userId);

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
    const userId = await getCurrentUserId();

    console.log('[Clients] 🔍 Buscando cliente:', clientId);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
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
    const userId = await getCurrentUserId();

    console.log('[Clients] 🔍 Buscando clientes por email:', email);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
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
    const userId = await getCurrentUserId();

    console.log('[Clients] 🔍 Buscando clientes por nome:', name);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
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
 * Sincronizar clientes locais para Supabase (migração de dados)
 */
export const syncClientsToSupabase = async (localClients: Client[]): Promise<{ synced: number; failed: number }> => {
  let synced = 0;
  let failed = 0;

  for (const client of localClients) {
    try {
      const { createdAt, createdBy, id, ...clientData } = client;
      await createClient(clientData);
      synced++;
    } catch (err) {
      console.error('[Clients] Erro ao sincronizar cliente:', client.name, err);
      failed++;
    }
  }

  console.log('[Clients] ✅ Sincronização concluída:', { synced, failed });
  return { synced, failed };
};
