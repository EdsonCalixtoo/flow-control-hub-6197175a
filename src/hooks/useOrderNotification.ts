import { useEffect, useRef } from 'react';
import type { Order } from '@/types/erp';
import { toast } from 'sonner';

// A pleasant, unobtrusive notification sound (short soft ping)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function useOrderNotification(orders: Order[], statusesToWatch: string[], label: string = 'você') {
    const prevOrderIdsRef = useRef<Set<string> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
            audioRef.current.volume = 0.6;
        }

        // Tenta desbloquear o áudio assim que o usuário clicar em qualquer lugar da tela
        const unlockAudio = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play()
                    .then(() => {
                        audioRef.current?.pause();
                        if (audioRef.current) audioRef.current.currentTime = 0;
                    })
                    .catch(() => { });
                document.removeEventListener('click', unlockAudio);
            }
        };
        document.addEventListener('click', unlockAudio);
        return () => document.removeEventListener('click', unlockAudio);
    }, []);

    useEffect(() => {
        // Array pode vir vazio no primeiro render até o backend carregar
        if (orders.length === 0) {
            return;
        }

        const currentOrdersInStatus = orders.filter(o => statusesToWatch.includes(o.status));
        const currentOrderIds = new Set(currentOrdersInStatus.map(o => o.id));

        if (prevOrderIdsRef.current !== null) {
            let hasNewOrder = false;
            let newOrderNumber = '';

            for (const order of currentOrdersInStatus) {
                if (!prevOrderIdsRef.current.has(order.id)) {
                    hasNewOrder = true;
                    newOrderNumber = order.number;
                    break;
                }
            }

            // Se for apenas o carregamento inicial de vários registros, não notifica
            if (hasNewOrder && !isInitialLoadRef.current) {
                toast.info(`🔔 Novo pedido (${newOrderNumber})!`, {
                    description: `Um pedido acabou de entrar em ${label}.`,
                    duration: 5000,
                });

                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(e => console.log('Áudio bloqueado:', e));
                }
            }
        }

        // Marcar que o carregamento inicial (quando orders.length > 0) já ocorreu
        if (isInitialLoadRef.current && orders.length > 0) {
            isInitialLoadRef.current = false;
        }

        prevOrderIdsRef.current = currentOrderIds;
    }, [orders, statusesToWatch, label]);
}
