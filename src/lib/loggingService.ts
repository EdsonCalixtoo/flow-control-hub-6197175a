import { supabase } from './supabase';

export interface LogEntry {
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
}

export const logAction = async (entry: LogEntry) => {
  try {
    const { error } = await supabase
      .from('system_logs')
      .insert([entry]);

    if (error) {
      console.error('[LoggingService] Erro ao gravar log:', error.message);
    }
  } catch (err) {
    console.error('[LoggingService] Falha crítica no log:', err);
  }
};

export const getLogs = async (limit = 100) => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[LoggingService] Erro ao buscar logs:', error.message);
    return [];
  }

  return data;
};

// Função para reverter uma ação (Rollback básico via dados salvos)
export const rollbackAction = async (logId: string) => {
  const { data: log, error: logError } = await supabase
    .from('system_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (logError || !log) {
    throw new Error('Log não encontrado para rollback');
  }

  if (!log.old_data || !log.entity_type || !log.entity_id) {
    throw new Error('Dados insuficientes para rollback');
  }

  const tableName = log.entity_type === 'order' ? 'orders' : 
                    log.entity_type === 'client' ? 'clients' : 
                    log.entity_type === 'financial' ? 'financial_entries' : null;

  if (!tableName) {
    throw new Error(`Tipo de entidade não suportado para rollback: ${log.entity_type}`);
  }

  const { error: updateError } = await supabase
    .from(tableName)
    .update(log.old_data)
    .eq('id', log.entity_id);

  if (updateError) {
    throw updateError;
  }

  // Registra que um rollback foi feito
  await logAction({
    user_id: 'SYSTEM', // Ou passar o user atual
    user_name: 'Rollback System',
    user_role: 'admin',
    action: `ROLLBACK de ${log.action}`,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    new_data: log.old_data
  });
};
