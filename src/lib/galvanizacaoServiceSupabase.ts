import { supabase } from './supabase';

export interface GalvanizacaoLog {
  id: string;
  item_name: string;
  quantity_sent: number;
  quantity_received: number;
  status: 'pendente' | 'recebido_parcial' | 'recebido_total';
  sent_date: string;
  received_date: string | null;
  notes: string | null;
  created_at: string;
}

export const getGalvanizacaoLogs = async (): Promise<GalvanizacaoLog[]> => {
  const { data, error } = await supabase
    .from('galvanizacao_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar logs de galvanização:', error);
    throw error;
  }

  return data || [];
};

export const createGalvanizacaoLog = async (log: Omit<GalvanizacaoLog, 'id' | 'created_at'>): Promise<GalvanizacaoLog> => {
  const { data, error } = await supabase
    .from('galvanizacao_logs')
    .insert([log])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar log de galvanização:', error);
    throw error;
  }

  return data;
};

export const updateGalvanizacaoLog = async (id: string, updates: Partial<GalvanizacaoLog>): Promise<GalvanizacaoLog> => {
  const { data, error } = await supabase
    .from('galvanizacao_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar log de galvanização:', error);
    throw error;
  }

  return data;
};

export const deleteGalvanizacaoLog = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('galvanizacao_logs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar log de galvanização:', error);
    throw error;
  }
};
