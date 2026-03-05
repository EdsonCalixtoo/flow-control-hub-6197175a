import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function RealtimeNotificationHandler() {

  useRealtimeOrders((event) => {
    // Notifica quando um pedido chega para aprovação financeira OU para produção
    if (event.type === 'UPDATE' && event.order.status === 'aguardando_financeiro' && event.previousStatus !== 'aguardando_financeiro') {
      playNotification();
      sendSystemNotification(
        `🔔 Novo Pedido para Aprovação Financeira`,
        `Pedido ${event.order.number} - Cliente: ${event.order.clientName}\nValor: R$ ${event.order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      );
    }
    
    if (event.type === 'UPDATE' && event.order.status === 'aguardando_producao' && event.previousStatus !== 'aguardando_producao') {
      playNotification();
      sendSystemNotification(
        `🚀 Novo Pedido Aprovado para Produção`,
        `Pedido ${event.order.number} - Cliente: ${event.order.clientName}\nTipo: ${event.order.orderType === 'instalacao' ? 'Instalação' : event.order.orderType === 'retirada' ? 'Retirada' : 'Entrega'}`
      );
    }
  }, ['aguardando_financeiro', 'aguardando_producao']);

  return null;
}

function playNotification() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.7;
    audio.play().catch(err => console.log('Áudio bloqueado:', err));
  } catch (err) {
    console.error('Erro ao tocar som:', err);
  }
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
