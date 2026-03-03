import { supabase } from '@/lib/supabase';

export interface CreateClientInput {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  address: string;
  bairro: string;
  city: string;
  state: string;
  cep: string;
  notes?: string;
  consignado?: boolean;
}

export interface ClientResponse {
  id: string;
  name: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  address: string;
  bairro: string;
  city: string;
  state: string;
  cep: string;
  notes: string;
  consignado: boolean;
  created_by: string;
  created_at: string;
}

/**
 * NOVO SERVICE - Minimalista e Sem Sofisticação
 * Insere cliente diretamente no Supabase
 */
export async function insertClientDirect(
  input: CreateClientInput,
  userId: string
): Promise<ClientResponse> {
  console.log('[insertClientDirect] 🚀 INICIANDO INSERT');
  console.log('[insertClientDirect] 📝 Nome:', input.name);
  console.log('[insertClientDirect] 🆔 User ID:', userId);

  const payload = {
    name: input.name,
    cpf_cnpj: input.cpfCnpj,
    email: input.email,
    phone: input.phone,
    address: input.address,
    bairro: input.bairro,
    city: input.city,
    state: input.state,
    cep: input.cep,
    notes: input.notes || '',
    consignado: input.consignado || false,
    created_by: userId,
  };

  console.log('[insertClientDirect] 📤 Enviando payload:', JSON.stringify(payload));

  // Insert
  console.log('[insertClientDirect] ⏱️ Conectando ao Supabase...');
  const { data, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('[insertClientDirect] ❌ ERRO!');
    console.error('[insertClientDirect] Código:', error.code);
    console.error('[insertClientDirect] Mensagem:', error.message);
    throw new Error(`${error.code}: ${error.message}`);
  }

  console.log('[insertClientDirect] ✅ SUCESSO! Cliente criado:', data.id);
  return data as ClientResponse;
}

/**
 * Buscar clientes do usuário
 */
export async function fetchUserClients(userId: string): Promise<ClientResponse[]> {
  console.log('[fetchUserClients] 🔄 Buscando clientes do user:', userId);

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchUserClients] ❌ Erro:', error.message);
    throw error;
  }

  console.log('[fetchUserClients] ✅ Encontrados:', data.length, 'clientes');
  return data as ClientResponse[];
}

/**
 * Deletar cliente
 */
export async function deleteClientById(clientId: string, userId: string): Promise<void> {
  console.log('[deleteClientById] 🗑️ Deletando:', clientId);

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('created_by', userId);

  if (error) {
    console.error('[deleteClientById] ❌ Erro:', error.message);
    throw error;
  }

  console.log('[deleteClientById] ✅ Deletado com sucesso');
}
