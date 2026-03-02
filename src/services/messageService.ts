import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  quoteId: string;
  senderId: string;
  senderName: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

/**
 * Enviar mensagem no chat do orçamento
 */
export async function sendMessage(
  quoteId: string,
  senderId: string,
  senderName: string,
  message: string,
  attachmentUrl?: string
): Promise<ChatMessage> {
  try {
    const { data, error } = await supabase
      .from('order_messages')
      .insert([
        {
          quote_id: quoteId,
          sender_id: senderId,
          message,
          attachment_url: attachmentUrl,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return mapMessageFromDb(data, senderName);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

/**
 * Obter mensagens do orçamento
 */
export async function getQuoteMessages(quoteId: string): Promise<ChatMessage[]> {
  try {
    const { data: messagesData, error: messagesError } = await supabase
      .from('order_messages')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Buscar nomes dos remetentes
    const messages: ChatMessage[] = [];

    for (const msg of messagesData) {
      // Buscar nome do sender
      const { data: senderData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', msg.sender_id)
        .single();

      messages.push({
        id: msg.id,
        quoteId: msg.quote_id,
        senderId: msg.sender_id,
        senderName: senderData?.full_name || 'Usuário',
        message: msg.message,
        attachmentUrl: msg.attachment_url,
        createdAt: msg.created_at,
      });
    }

    return messages;
  } catch (error) {
    console.error('Erro ao obter mensagens:', error);
    return [];
  }
}

/**
 * Deletar mensagem (apenas o remetente pode deletar)
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('order_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    throw error;
  }
}

/**
 * Editar mensagem
 */
export async function editMessage(
  messageId: string,
  newMessage: string
): Promise<ChatMessage | null> {
  try {
    const { data, error } = await supabase
      .from('order_messages')
      .update({ message: newMessage })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    // Buscar nome do sender
    const { data: senderData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.sender_id)
      .single();

    return {
      id: data.id,
      quoteId: data.quote_id,
      senderId: data.sender_id,
      senderName: senderData?.full_name || 'Usuário',
      message: data.message,
      attachmentUrl: data.attachment_url,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Erro ao editar mensagem:', error);
    return null;
  }
}

/**
 * Subscribe para novas mensagens em tempo real
 */
export function subscribeToQuoteMessages(
  quoteId: string,
  callback: (message: ChatMessage) => void
) {
  const subscription = supabase
    .channel(`messages-${quoteId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'order_messages' },
      async (payload) => {
        if (payload.new.quote_id === quoteId) {
          // Buscar nome do sender
          const { data: senderData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.sender_id)
            .single();

          callback({
            id: payload.new.id,
            quoteId: payload.new.quote_id,
            senderId: payload.new.sender_id,
            senderName: senderData?.full_name || 'Usuário',
            message: payload.new.message,
            attachmentUrl: payload.new.attachment_url,
            createdAt: payload.new.created_at,
          });
        }
      }
    )
    .subscribe();

  return subscription;
}

// ─────────────────────────────────────────────────────────────────
// Função auxiliar
// ─────────────────────────────────────────────────────────────────

function mapMessageFromDb(data: any, senderName: string): ChatMessage {
  return {
    id: data.id,
    quoteId: data.quote_id,
    senderId: data.sender_id,
    senderName,
    message: data.message,
    attachmentUrl: data.attachment_url,
    createdAt: data.created_at,
  };
}
