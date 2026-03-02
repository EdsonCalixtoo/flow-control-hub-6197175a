import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseRealtimeOptions {
  table: string;
  filter?: { column: string; value: string };
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Hook para subscrever a mudanças em tempo real no banco
 */
export function useRealtimeSubscription<T>(
  options: UseRealtimeOptions,
  mapFn: (data: any) => T
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      try {
        // Buscar dados iniciais
        let query = supabase.from(options.table).select('*');

        if (options.filter) {
          query = query.eq(options.filter.column, options.filter.value);
        }

        if (options.orderBy) {
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? true,
          });
        }

        const { data: initialData, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setData(initialData.map(mapFn));
        setLoading(false);

        // Subscribe para mudanças
        subscription = supabase
          .channel(`${options.table}-changes`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: options.table },
            async () => {
              // Refetch dados completos quando houver mudanças
              let refreshQuery = supabase.from(options.table).select('*');

              if (options.filter) {
                refreshQuery = refreshQuery.eq(options.filter.column, options.filter.value);
              }

              if (options.orderBy) {
                refreshQuery = refreshQuery.order(options.orderBy.column, {
                  ascending: options.orderBy.ascending ?? true,
                });
              }

              const { data: refreshedData } = await refreshQuery;
              if (refreshedData) {
                setData(refreshedData.map(mapFn));
              }
            }
          )
          .subscribe();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [options.table, options.filter?.value, options.orderBy?.column]);

  return { data, loading, error };
}

/**
 * Hook para subscrever a um documento específico em tempo real
 */
export function useRealtimeDocument<T>(
  table: string,
  id: string,
  mapFn: (data: any) => T
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      try {
        // Buscar documento inicial
        const { data: initialData, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        setData(mapFn(initialData));
        setLoading(false);

        // Subscribe para mudanças
        subscription = supabase
          .channel(`${table}-${id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            async (payload: any) => {
              if (payload.new && payload.new.id === id) {
                setData(mapFn(payload.new));
              }
            }
          )
          .subscribe();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [table, id]);

  return { data, loading, error };
}

/**
 * Hook para insert em tempo real
 */
export function useRealtimeInsert(table: string) {
  const [newData, setNewData] = useState<any | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel(`${table}-insert`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => {
          setNewData(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);

  return newData;
}

/**
 * Hook para deletar em tempo real
 */
export function useRealtimeDelete(table: string) {
  const [deletedData, setDeletedData] = useState<any | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel(`${table}-delete`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table },
        (payload) => {
          setDeletedData(payload.old);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);

  return deletedData;
}

/**
 * Hook para update em tempo real
 */
export function useRealtimeUpdate(table: string) {
  const [updatedData, setUpdatedData] = useState<any | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel(`${table}-update`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table },
        (payload) => {
          setUpdatedData(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);

  return updatedData;
}

/**
 * Hook para subscrever apenas a INSERTs
 */
export function useRealtimeInsertListener<T>(
  table: string,
  filter?: { column: string; value: string },
  mapFn?: (data: any) => T
) {
  const [newItems, setNewItems] = useState<T[]>([]);

  useEffect(() => {
    const subscription = supabase
      .channel(`${table}-insert-listener`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => {
          const passesFilter =
            !filter || payload.new[filter.column] === filter.value;

          if (passesFilter) {
            const mapped = mapFn ? mapFn(payload.new) : (payload.new as T);
            setNewItems((prev) => [mapped, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, filter?.value]);

  return newItems;
}
