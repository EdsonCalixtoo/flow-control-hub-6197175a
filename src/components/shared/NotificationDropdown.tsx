import React, { useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  AlertCircle, 
  DollarSign,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
  Factory
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, OrderStatus } from '@/types/erp';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'status_change' | 'financial' | 'delay' | 'chat' | 'warranty';
  status?: OrderStatus;
  orderId?: string;
  read: boolean;
}

const getStatusIcon = (status?: OrderStatus) => {
  switch (status) {
    case 'rascunho': return Clock;
    case 'aguardando_financeiro': return DollarSign;
    case 'aprovado_financeiro': return CheckCircle2;
    case 'aguardando_producao': return Factory;
    case 'em_producao': return Package;
    case 'producao_finalizada': return CheckCircle2;
    case 'produto_liberado': return ShieldCheck;
    case 'retirado_entregador': return Truck;
    default: return Bell;
  }
};

export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { orders } = useERP();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const notifications = useMemo(() => {
    // Pegar histórico de todos os pedidos visíveis para o usuário
    const allActivities: NotificationItem[] = orders.flatMap(order => 
      (order.statusHistory || []).map((history, idx) => ({
        id: `${order.id}-${idx}`,
        title: `Pedido ${order.number}`,
        description: `${history.user} alterou para: ${STATUS_LABELS[history.status]}`,
        timestamp: history.timestamp,
        type: 'status_change' as const,
        status: history.status,
        orderId: order.id,
        read: false, // Poderíamos persistir isso no futuro
      }))
    );

    // Ordenar por data (mais recentes primeiro)
    return allActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Mostrar as 20 últimas
  }, [orders]);

  if (!authUser) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notificações
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full">
          {notifications.length} Recentes
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground italic text-sm">
            Nenhuma atividade recente.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map((notif) => {
              const Icon = getStatusIcon(notif.status);
              return (
                <div 
                  key={notif.id}
                  onClick={() => {
                    if (notif.orderId) {
                      const path = authUser.role === 'vendedor' ? '/vendedor/orcamentos' : `/${authUser.role}`;
                      navigate(`${path}?view=${notif.orderId}`);
                    }
                    onClose();
                  }}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                      notif.status ? STATUS_COLORS[notif.status]?.split(' ')[0] : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-4 h-4 ${notif.status ? STATUS_COLORS[notif.status]?.split(' ')[1] : 'text-primary'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">{notif.title}</p>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">
                          {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 italic">
                        {notif.description}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 self-center group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/60 bg-muted/30 text-center">
        <button 
          onClick={onClose}
          className="text-[10px] font-black uppercase text-primary hover:underline tracking-widest"
        >
          Fechar Notificações
        </button>
      </div>
    </div>
  );
};
