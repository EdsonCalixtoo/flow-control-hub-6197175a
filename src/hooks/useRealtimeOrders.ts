import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Order } from '@/types/erp';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeOrderEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  order: Order;
  previousStatus?: string;
}

export function useRealtimeOrders(
  onOrderChanged?: (event: RealtimeOrderEvent) => void,
  statusesToWatch?: string[]
) {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  // Função para converter dados do Supabase para Order
  const supabaseToOrder = (data: any): Order | null => {
    if (!data || !data.id) return null;
    return {
      id: data.id,
      number: data.number,
      clientId: data.client_id,
      clientName: data.client_name,
      sellerId: data.seller_id,
      sellerName: data.seller_name,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxes: data.taxes || 0,
      total: data.total || 0,
      notes: data.notes,
      observation: data.observation,
      status: data.status,
      deliveryDate: data.delivery_date,
      orderType: data.order_type || 'entrega',
      installationDate: data.installation_date,
      installationTime: data.installation_time,
      installationPaymentType: data.installation_payment_type,
      isConsigned: data.is_consigned || false,
      paymentStatus: data.payment_status || 'pendente',
      paymentMethod: data.payment_method,
      receiptUrls: data.receipt_urls,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      statusHistory: data.status_history || [],
      rejectionReason: data.rejection_reason,
      scheduledDate: data.scheduled_date,
    };
  };

  // Refs para manter callbacks e estados sem reiniciar o efeito
  const callbackRef = useRef(onOrderChanged);
  const statusesRef = useRef(statusesToWatch);

  useEffect(() => {
    callbackRef.current = onOrderChanged;
  }, [onOrderChanged]);

  useEffect(() => {
    statusesRef.current = statusesToWatch;
  }, [statusesToWatch]);

  const setupRealtimeListener = useCallback(() => {
    if (!user) return;

    // Se já estiver conectando ou conectado, não dobrar
    if (channelRef.current && channelRef.current.state === 'joined') return;

    // Limpar canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `orders_realtime_${user.id}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[Realtime Orders] Evento recebido:', payload.eventType, (payload.new as any)?.number || (payload.old as any)?.number);

          if (payload.eventType === 'INSERT') {
            const newOrder = supabaseToOrder(payload.new);
            if (!newOrder) return;

            // Notifica se é um status que deve ser monitorado
            const watchList = statusesRef.current;
            if (!watchList || watchList.includes(newOrder.status)) {
              toast.success(`✅ Novo pedido criado: ${newOrder.number}`, {
                description: `Cliente: ${newOrder.clientName}`,
              });

              callbackRef.current?.({
                type: 'INSERT',
                order: newOrder,
              });
            }
          }
          else if (payload.eventType === 'UPDATE') {
            const updatedOrder = supabaseToOrder(payload.new);
            if (!updatedOrder) return;

            const oldOrder = supabaseToOrder(payload.old);
            // Se oldOrder for null (comum se não houver Full Replication), consideramos statusChanged como true se updatedOrder tem status
            const previousStatus = oldOrder?.status;
            const statusChanged = !previousStatus || previousStatus !== updatedOrder.status;

            if (statusChanged) {
              console.log(`[Realtime Orders] Status mudou: ${previousStatus || 'unknown'} → ${updatedOrder.status}`);

              // Notificações específicas por status
              if (updatedOrder.status === 'aguardando_financeiro') {
                toast.info(`📊 Pedido ${updatedOrder.number} aguardando aprovação financeira`, {
                  description: `Cliente: ${updatedOrder.clientName} | Valor: R$ ${updatedOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  duration: 8000,
                });
              }
              else if (updatedOrder.status === 'aprovado_financeiro') {
                toast.success(`✅ Pedido ${updatedOrder.number} aprovado para produção!`, {
                  description: `Enviando para produção...`,
                });
              }
              else if (updatedOrder.status === 'rejeitado_financeiro') {
                toast.error(`❌ Pedido ${updatedOrder.number} foi rejeitado`, {
                  description: updatedOrder.rejectionReason || 'Verifique os detalhes',
                });
              }

              // Notifica callback se for status monitorado
              const watchList = statusesRef.current;
              if (!watchList || watchList.includes(updatedOrder.status)) {
                callbackRef.current?.({
                  type: 'UPDATE',
                  order: updatedOrder,
                  previousStatus: previousStatus,
                });
              }
            }
          }
          else if (payload.eventType === 'DELETE') {
            const deletedOrder = supabaseToOrder(payload.old);
            if (!deletedOrder) return;

            console.log(`[Realtime Orders] Pedido deletado: ${deletedOrder.number}`);

            callbackRef.current?.({
              type: 'DELETE',
              order: deletedOrder,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime Orders] ✅ Conectado ao stream');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime Orders] ❌ Erro no canal: ${status}`);
          // Tentar reconectar após intervalo
          setTimeout(() => setupRealtimeListener(), 5000);
        }
      });

    channelRef.current = channel;
  }, [user]); // Apenas depende de user agora


  useEffect(() => {
    setupRealtimeListener();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [setupRealtimeListener]);
}
