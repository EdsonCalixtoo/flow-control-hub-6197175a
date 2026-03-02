import { supabase } from '@/lib/supabase';
import { Client } from '@/types/erp';

/**
 * Criar novo cliente
 */
export async function createClient(
  client: Omit<Client, 'id' | 'createdAt'> & { createdAt?: string }
): Promise<Client> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          name: client.name,
          cpf_cnpj: client.cpfCnpj,
          phone: client.phone,
          email: client.email,
          address: client.address,
          bairro: client.bairro,
          city: client.city,
          state: client.state,
          cep: client.cep,
          notes: client.notes,
          consignado: client.consignado || false,
          created_by: client.createdBy,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapClientFromDb(data);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }
}

/**
 * Obter cliente por ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return mapClientFromDb(data);
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    return null;
  }
}

/**
 * Listar clientes do vendedor logado
 */
export async function getMyClients(sellerId: string): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('created_by', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapClientFromDb);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    return [];
  }
}

/**
 * Listar todos os clientes (para financeiro, gestor, etc)
 */
export async function getAllClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapClientFromDb);
  } catch (error) {
    console.error('Erro ao listar todos os clientes:', error);
    return [];
  }
}

/**
 * Atualizar cliente
 */
export async function updateClient(
  clientId: string,
  updates: Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy'>>
): Promise<Client> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: updates.name,
        cpf_cnpj: updates.cpfCnpj,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        bairro: updates.bairro,
        city: updates.city,
        state: updates.state,
        cep: updates.cep,
        notes: updates.notes,
        consignado: updates.consignado,
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return mapClientFromDb(data);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }
}

/**
 * Deletar cliente
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    throw error;
  }
}

/**
 * Buscar clientes por nome (search)
 */
export async function searchClients(query: string, sellerId?: string): Promise<Client[]> {
  try {
    let queryBuilder = supabase
      .from('clients')
      .select('*')
      .ilike('name', `%${query}%`);

    if (sellerId) {
      queryBuilder = queryBuilder.eq('created_by', sellerId);
    }

    const { data, error } = await queryBuilder.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data.map(mapClientFromDb);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }
}

/**
 * Subscribe para mudanças em tempo real na lista de clientes
 */
export function subscribeToClients(
  sellerId: string,
  callback: (clients: Client[]) => void
) {
  const subscription = supabase
    .channel(`clients-${sellerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients' },
      async () => {
        const clients = await getMyClients(sellerId);
        callback(clients);
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Subscribe para mudanças em um cliente específico
 */
export function subscribeToClient(
  clientId: string,
  callback: (client: Client | null) => void
) {
  const subscription = supabase
    .channel(`client-${clientId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients' },
      async (payload: any) => {
        if (payload.new && payload.new.id === clientId) {
          callback(mapClientFromDb(payload.new));
        }
      }
    )
    .subscribe();

  return subscription;
}

// ─────────────────────────────────────────────────────────────────
// Função auxiliar para mapear dados do banco para o tipo Client
// ─────────────────────────────────────────────────────────────────

function mapClientFromDb(data: any): Client {
  return {
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
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}
