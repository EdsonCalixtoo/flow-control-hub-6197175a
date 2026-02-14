import React from 'react';
import type { Order, OrderStatus } from '@/types/erp';
import { STATUS_LABELS, STATUS_FLOW } from '@/types/erp';
import { Check, Clock, Circle } from 'lucide-react';

const STEP_LABELS: Record<string, string> = {
  rascunho: 'Criado',
  aguardando_financeiro: 'Financeiro',
  aprovado_financeiro: 'Aprovado Fin.',
  aguardando_gestor: 'Gestor',
  aprovado_gestor: 'Aprovado Gestor',
  aguardando_producao: 'Produção',
  em_producao: 'Em Produção',
  producao_finalizada: 'Finalizado',
  produto_liberado: 'Liberado',
};

const PIPELINE_STEPS = STATUS_FLOW;

interface OrderTimelineProps {
  order: Order;
  compact?: boolean;
}

export const OrderPipeline: React.FC<OrderTimelineProps> = ({ order, compact }) => {
  const currentIndex = PIPELINE_STEPS.indexOf(order.status);
  const isRejected = order.status === 'rejeitado_financeiro' || order.status === 'rejeitado_gestor';

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-semibold text-destructive">{STATUS_LABELS[order.status]}</span>
        {order.rejectionReason && <span className="text-[10px] text-destructive/70 ml-1">— {order.rejectionReason}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${compact ? 'overflow-x-auto pb-1' : 'flex-wrap'}`}>
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-success text-success-foreground' :
                active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 animate-pulse' :
                'bg-muted text-muted-foreground/40'
              }`}>
                {done ? <Check className="w-3 h-3" /> :
                 active ? <Clock className="w-3 h-3" /> :
                 <Circle className="w-2 h-2" />}
              </div>
              {!compact && (
                <span className={`text-[10px] font-semibold whitespace-nowrap ${
                  done ? 'text-success' : active ? 'text-primary' : 'text-muted-foreground/50'
                }`}>
                  {STEP_LABELS[step]}
                </span>
              )}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 shrink-0 rounded-full transition-colors ${
                i < currentIndex ? 'bg-success' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const OrderHistory: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="space-y-0">
      {order.statusHistory.map((entry, i) => (
        <div key={i} className="flex gap-3 relative">
          {/* Line */}
          {i < order.statusHistory.length - 1 && (
            <div className="absolute left-[9px] top-5 w-0.5 h-full bg-border" />
          )}
          {/* Dot */}
          <div className={`w-[19px] h-[19px] rounded-full shrink-0 mt-0.5 flex items-center justify-center z-10 ${
            i === order.statusHistory.length - 1 ? 'bg-primary ring-2 ring-primary/20' : 'bg-success'
          }`}>
            {i === order.statusHistory.length - 1 ? (
              <Clock className="w-2.5 h-2.5 text-primary-foreground" />
            ) : (
              <Check className="w-2.5 h-2.5 text-success-foreground" />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 min-w-0">
            <p className="text-xs font-semibold text-foreground">{STATUS_LABELS[entry.status]}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(entry.timestamp).toLocaleString('pt-BR')} • {entry.user}
            </p>
            {entry.note && <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic">"{entry.note}"</p>}
          </div>
        </div>
      ))}
    </div>
  );
};
