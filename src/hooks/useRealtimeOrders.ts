import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Order } from '@/types/erp';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseToOrder } from '@/lib/orderServiceSupabase';

interface RealtimeOrderEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  order: Order;
  previousStatus?: string;
}

type OrderChangedCallback = (event: RealtimeOrderEvent) => void;

// ============================================================
// 🌐 SINGLETON GLOBAL — Um único canal para toda a aplicação
// Evita o erro "mismatch between server and client bindings"
// que ocorre quando múltiplos componentes criam canais duplicados.
// ============================================================
let globalChannel: any = null;
let globalUserId: string | null = null;
let globalUserRole: string | null = null;
const subscribers = new Set<OrderChangedCallback>();
let notificationsEnabled = false;

function teardownChannel() {
  if (globalChannel) {
    console.log('[Realtime Global] 🔌 Encerrando canal global...');
    supabase.removeChannel(globalChannel);
    globalChannel = null;
    globalUserId = null;
    globalUserRole = null;
    notificationsEnabled = false;
  }
}

function setupChannel(userId: string, userRole: string, userName: string) {
  if (globalChannel) return; // Já existe um canal ativo

  const channelName = `orders-global-${userId.substring(0, 8)}`;
  console.log(`[Realtime Global] 🔌 Criando canal único: ${channelName} para ${userRole} (${userName})`);

  globalChannel = supabase.channel(channelName);
  globalUserId = userId;
  globalUserRole = userRole;

  globalChannel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload: any) => {
        console.log('[Realtime Global] 📥 EVENTO:', payload.eventType);
        const role = globalUserRole;

        if (payload.eventType === 'INSERT') {
          const order = supabaseToOrder(payload.new);
          if (!order) return;

          // Notificação sonora para FINANCEIRO
          if (role === 'financeiro' && order.status === 'aguardando_financeiro') {
            toast.info(`🆕 Novo Pedido #${order.number}`, {
              description: `Cliente: ${order.clientName} | Aguardando validação financeira.`,
              duration: 6000
            });
          }

          subscribers.forEach(cb => cb({ type: 'INSERT', order }));
        }

        else if (payload.eventType === 'UPDATE') {
          const order = supabaseToOrder(payload.new);
          if (!order) return;

          const prevStatus = (payload.old as any)?.status;
          const hasStatusChanged = !prevStatus || prevStatus !== order.status;

          if (hasStatusChanged) {
            // Notificações para VENDEDOR
            if (role === 'vendedor' && order.sellerId === userId) {
              if (order.status === 'aprovado_financeiro') {
                toast.success(`✅ Pedido #${order.number} APROVADO!`, { description: 'O financeiro liberou este pedido.' });
              } else if (order.status === 'rejeitado_financeiro') {
                toast.error(`❌ Pedido #${order.number} REJEITADO`, {
                  description: order.rejectionReason || 'Verifique o motivo nos detalhes.',
                  duration: 8000
                });
              }
            }

            // Notificações para PRODUÇÃO ou PRODUÇÃO CARENAGEM
            const isCarenagem = order.items?.some(i => 
              i.product.toLowerCase().includes('carenagem') || 
              i.product.toLowerCase().includes('side skirt')
            );

            if (role === 'producao_carenagem' && order.status === 'aprovado_financeiro' && isCarenagem) {
              toast.info(`🏭 Novo Pedido de Carenagem: #${order.number}`, {
                description: `Cliente: ${order.clientName}`,
                duration: 6000
              });
            } else if (role === 'producao' && order.status === 'aprovado_financeiro' && !isCarenagem) {
              toast.info(`🏭 Novo Pedido para Produção: #${order.number}`, {
                description: `Cliente: ${order.clientName}`,
                duration: 6000
              });
            }

            // Notificações para FINANCEIRO (re-envio)
            if (role === 'financeiro' && order.status === 'aguardando_financeiro' && prevStatus !== 'aguardando_financeiro') {
              toast.warning(`🔄 Pedido #${order.number} Re-enviado`, { description: 'Necessita nova análise financeira.' });
            }
          }

          subscribers.forEach(cb => cb({ type: 'UPDATE', order, previousStatus: prevStatus }));
        }

        else if (payload.eventType === 'DELETE') {
          const deletedOrder = supabaseToOrder(payload.old);
          subscribers.forEach(cb => cb({ type: 'DELETE', order: deletedOrder }));
        }
      }
    )
    .subscribe((status: string, err: any) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime Global] ✅ Canal global conectado com sucesso!');
        notificationsEnabled = true;
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime Global] ❌ Erro no canal:', err);
        globalChannel = null; // Permite Nova tentativa
      }
    });
}

/**
 * Hook de Realtime — usa um canal SINGLETON global.
 * Múltiplos componentes podem assinar sem criar canais duplicados.
 */
export function useRealtimeOrders(
  onOrderChanged?: OrderChangedCallback,
  _statusesToWatch?: string[]
) {
  const { user } = useAuth();
  const callbackRef = useRef(onOrderChanged);

  useEffect(() => { callbackRef.current = onOrderChanged; }, [onOrderChanged]);

  // Registra o callback deste componente no set global
  useEffect(() => {
    if (!onOrderChanged) return;
    const cb: OrderChangedCallback = (event) => callbackRef.current?.(event);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gerencia o canal global baseado no usuário
  useEffect(() => {
    if (!user?.id || !user?.role) return;

    // Se o usuário mudou, destrói o canal antigo
    if (globalUserId && globalUserId !== user.id) {
      teardownChannel();
    }

    // Cria o canal se ainda não existir
    setupChannel(user.id, user.role, user.name);

    // Cleanup só quando o componente principal desmontar E não há mais subscribers
    return () => {
      // Não destruir o canal quando apenas um sub-componente desmontar
      // O canal só é destruído quando o usuário fizer logout (via teardownChannel)
    };
  }, [user?.id, user?.role]);
}
