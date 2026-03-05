import { useEffect, useRef } from 'react';
import type { Order } from '@/types/erp';

export function useOrderNotification(orders: Order[], statusesToWatch: string[]) {
    const prevOrderIdsRef = useRef<Set<string> | null>(null);

    useEffect(() => {
        const currentOrdersInStatus = orders.filter(o => statusesToWatch.includes(o.status));
        const currentOrderIds = new Set(currentOrdersInStatus.map(o => o.id));

        if (prevOrderIdsRef.current !== null) {
            // Logic for new orders (without sound as requested)
            /* 
            let hasNewOrder = false;
            for (const id of currentOrderIds) {
              if (!prevOrderIdsRef.current.has(id)) {
                hasNewOrder = true;
                break;
              }
            }
            */
        }

        prevOrderIdsRef.current = currentOrderIds;
    }, [orders, statusesToWatch]);
}
