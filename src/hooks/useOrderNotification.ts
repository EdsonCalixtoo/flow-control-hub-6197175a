import { useEffect, useRef } from 'react';
import type { Order } from '@/types/erp';
import { toast } from 'sonner';

/**
 * Hook para monitorar novos pedidos em status específicos e notificar o usuário.
 * Ideal para Financeiro e Produção saberem quando algo novo "entrou na fila".
 */
export function useOrderNotification(orders: Order[], statusesToWatch: string[], label: string) {
    const prevOrdersRef = useRef<Order[]>([]);

    useEffect(() => {
        // Se é a primeira carga, apenas armazena os atuais
        if (prevOrdersRef.current.length === 0 && orders.length > 0) {
            prevOrdersRef.current = orders;
            return;
        }

        // Filtra pedidos que acabaram de entrar em um dos status monitorados
        const newItems = orders.filter(order => {
            const isInWatchedStatus = statusesToWatch.includes(order.status);
            const wasInList = prevOrdersRef.current.some(prev => prev.id === order.id);
            const prevVersion = prevOrdersRef.current.find(prev => prev.id === order.id);
            const statusChanged = prevVersion && prevVersion.status !== order.status;

            // É novo na lista OU mudou para um status que estamos vigiando
            return isInWatchedStatus && (!wasInList || statusChanged);
        });

        if (newItems.length > 0) {
            newItems.forEach(item => {
                toast.success(`📢 Novo pedido para ${label}`, {
                    description: `Pedido ${item.number} | Cliente: ${item.clientName}`,
                    duration: 6000,
                });
            });
        }

        prevOrdersRef.current = orders;
    }, [orders, statusesToWatch, label]);
}
