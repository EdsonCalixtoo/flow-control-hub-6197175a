import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/types/erp';

interface RealtimeOrderEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  order: Order;
  previousStatus?: string;
}

type OrderChangedCallback = (event: RealtimeOrderEvent) => void;

export function useRealtimeOrders(
  onOrderChanged?: OrderChangedCallback,
  _statusesToWatch?: string[]
) {
  const { user } = useAuth();
  const callbackRef = useRef(onOrderChanged);

  useEffect(() => { callbackRef.current = onOrderChanged; }, [onOrderChanged]);

  useEffect(() => {
    // Realtime disabled after migrating from Supabase to local DB.
    // Notifications will rely on periodic sync.
  }, [user?.id, user?.role]);
}

