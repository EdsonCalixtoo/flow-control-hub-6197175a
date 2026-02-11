import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';

const LancamentosPage: React.FC = () => {
  const { financialEntries } = useERP();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Lançamentos</h1>
          <p className="page-subtitle">Receitas e despesas</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      <div className="space-y-2">
        {financialEntries.map(entry => (
          <div key={entry.id} className="bg-card border border-border rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.type === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {entry.type === 'receita' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{entry.description}</p>
                <p className="text-xs text-muted-foreground">{entry.category} • {new Date(entry.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-semibold ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                {entry.type === 'receita' ? '+' : '-'}{formatCurrency(entry.amount)}
              </span>
              <span className={`block text-xs mt-0.5 status-badge ${entry.status === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {entry.status === 'pago' ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LancamentosPage;
