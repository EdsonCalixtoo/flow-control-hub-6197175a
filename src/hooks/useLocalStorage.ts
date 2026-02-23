/**
 * useLocalStorage.ts
 * Hook que persiste estado no localStorage — garante que dados
 * sobrevivem ao recarregar mesmo sem Supabase configurado.
 */
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [state, setState] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? (JSON.parse(stored) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            // ignora se localStorage estiver cheio
        }
    }, [key, state]);

    return [state, setState] as const;
}
