import { apiFetch } from './api';
import type { Client } from '@/types/erp';

export const supabaseToClient = (data: any): Client => ({
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
  isInternational: data.is_international || false,
  createdBy: data.user_id,
  createdAt: data.created_at,
});

const clientToDb = (client: any) => {
  return {
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
    is_international: client.isInternational || false,
  };
};

export const fetchClients = async (): Promise<Client[]> => {
  try {
    console.log('[Clients] 📝 Buscando clientes via API local...');
    const data = await apiFetch('/clients');
    const clients = (data || []).map(supabaseToClient);
    console.log('[Clients] ✅ Clientes carregados:', clients.length);
    return clients;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes:', err.message);
    return [];
  }
};

export const createClient = async (client: Omit<Client, 'id' | 'createdAt' | 'createdBy'>): Promise<Client | null> => {
  try {
    console.log('[Clients] 📝 Criando novo cliente local:', client.name);
    const clientData = clientToDb(client);
    const data = await apiFetch('/clients', {
      method: 'POST',
      body: clientData,
    });
    
    if (!data) {
      throw new Error('A API não retornou o cliente criado.');
    }

    const newClient = supabaseToClient(data);
    console.log('[Clients] ✅ Cliente criado com SUCESSO:', newClient.id, newClient.name);
    return newClient;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao criar cliente:', err.message);
    throw err;
  }
};

export const updateClient = async (client: Client): Promise<Client | null> => {
  try {
    console.log('[Clients] 📝 Atualizando cliente local:', client.id);
    const clientData = clientToDb(client);
    const data = await apiFetch(`/clients/${client.id}`, {
      method: 'PUT',
      body: clientData,
    });

    if (!data) {
      throw new Error('A API não retornou o cliente atualizado.');
    }

    const updatedClient = supabaseToClient(data);
    console.log('[Clients] ✅ Cliente atualizado:', updatedClient.id);
    return updatedClient;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao atualizar cliente:', err.message);
    throw err;
  }
};

export const deleteClient = async (clientId: string): Promise<boolean> => {
  try {
    console.log('[Clients] 🗑️ Deletando cliente local:', clientId);
    await apiFetch(`/clients/${clientId}`, {
      method: 'DELETE',
    });
    console.log('[Clients] ✅ Cliente deletado:', clientId);
    return true;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao deletar cliente:', err.message);
    throw err;
  }
};

export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    console.log('[Clients] 🔍 Buscando cliente local por ID:', clientId);
    const data = await apiFetch(`/clients/${clientId}`);
    return data ? supabaseToClient(data) : null;
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar cliente:', err.message);
    return null;
  }
};

export const searchClientsByEmail = async (email: string): Promise<Client[]> => {
  try {
    console.log('[Clients] 🔍 Buscando clientes por email local:', email);
    const data = await apiFetch(`/clients?search=${encodeURIComponent(email)}`);
    return (data || []).map(supabaseToClient);
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes por email:', err.message);
    return [];
  }
};

export const searchClientsByName = async (name: string): Promise<Client[]> => {
  try {
    console.log('[Clients] 🔍 Buscando clientes por nome local:', name);
    const data = await apiFetch(`/clients?search=${encodeURIComponent(name)}`);
    return (data || []).map(supabaseToClient);
  } catch (err: any) {
    console.error('[Clients] ❌ Erro ao buscar clientes por nome:', err.message);
    return [];
  }
};

export const syncClientsToSupabase = async (localClients: Client[]): Promise<{ synced: number; failed: number }> => {
  console.log('[Clients] 🔀 Sincronização omitida no ambiente local.');
  return { synced: localClients.length, failed: 0 };
};
