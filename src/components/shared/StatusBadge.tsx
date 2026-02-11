import React from 'react';
import type { OrderStatus } from '@/types/erp';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/erp';

export const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span className={`status-badge ${STATUS_COLORS[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}> = ({ title, value, subtitle, icon: Icon, color = 'text-primary' }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
