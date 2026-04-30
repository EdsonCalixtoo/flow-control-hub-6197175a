import { useCallback, useMemo } from 'react';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { playNotificationSound } from '@/lib/audioUtils';

export function RealtimeNotificationHandler() {

  const handleOrderChange = useCallback((event: any) => {
    // Notifica quando um pedido chega para aprovação financeira OU para produção
    // Funciona tanto para novos pedidos (INSERT) quanto para mudanças de status (UPDATE)
    const isAguardandoFinanceiro = event.order.status === 'aguardando_financeiro';
    const wasNotAguardandoFinanceiro = event.previousStatus !== 'aguardando_financeiro';
    
    if ((event.type === 'INSERT' || event.type === 'UPDATE') && isAguardandoFinanceiro && wasNotAguardandoFinanceiro) {
      playNotificationSound();
      sendSystemNotification(
        `🔔 Novo Pedido para Aprovação Financeira`,
        `Pedido ${event.order.number} - Cliente: ${event.order.clientName}\nValor: R$ ${event.order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
    }

    const isAguardandoProducao = event.order.status === 'aguardando_producao';
    const wasNotAguardandoProducao = event.previousStatus !== 'aguardando_producao';

    if ((event.type === 'INSERT' || event.type === 'UPDATE') && isAguardandoProducao && wasNotAguardandoProducao) {
      playNotificationSound();
      sendSystemNotification(
        `🚀 Novo Pedido Aprovado para Produção`,
        `Pedido ${event.order.number} - Cliente: ${event.order.clientName}\nTipo: ${event.order.orderType === 'instalacao' ? 'Instalação' : event.order.orderType === 'retirada' ? 'Retirada' : 'Entrega'}`
      );
    }
  }, []);

  const statusesToWatch = useMemo(() => ['aguardando_financeiro', 'aguardando_producao'], []);

  useRealtimeOrders(handleOrderChange, statusesToWatch);

  return null;
}


function sendSystemNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        tag: `pedido-${Date.now()}`,
      });
    } catch (err) {
      console.error('Erro ao enviar notificação do sistema:', err);
    }
  }
  // Pede permissão se ainda não foi solicitado
  else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(err => console.log('Permissão negada:', err));
  }
}
