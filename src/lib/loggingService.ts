import { apiFetch } from './api';

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
    await apiFetch('/gestor/system-logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error('[LoggingService] Falha crítica no log:', err);
  }
};

export const getLogs = async (limit = 100) => {
  try {
    const data = await apiFetch(`/gestor/system-logs?limit=${limit}`);
    return data;
  } catch (error) {
    console.error('[LoggingService] Erro ao buscar logs:', error);
    return [];
  }
};

export const rollbackAction = async (logId: string) => {
  throw new Error('Rollback action is not fully implemented in local API yet');
};
