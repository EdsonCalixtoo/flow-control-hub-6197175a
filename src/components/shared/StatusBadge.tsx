import React from 'react';
import type { OrderStatus } from '@/types/erp';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/erp';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span className={`status-badge ${STATUS_COLORS[status]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
    {STATUS_LABELS[status]}
  </span>
);

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  trend?: string;
}> = ({ title, value, subtitle, icon: Icon, color = 'text-primary', trend }) => (
  <div className="stat-card group">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {trend && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Formata datas ISO corretamente no fuso horário local
// new Date("2026-02-25") interpreta como UTC (meia-noite UTC = 21h do dia anterior no BR)
// Esta função usa as partes da data para evitar o problema de timezone
export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  // Se é uma data simples YYYY-MM-DD, parse como local
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  // Se tem hora (ISO completo), usa Date normal
  return new Date(dateStr).toLocaleDateString('pt-BR');
};
