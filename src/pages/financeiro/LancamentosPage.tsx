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
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Lançamento
        </button>
      </div>

      <div className="space-y-3 stagger-children">
        {financialEntries.map(entry => (
          <div key={entry.id} className="card-section px-6 py-4 flex items-center justify-between hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {entry.type === 'receita' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{entry.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.category} • {new Date(entry.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${entry.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                {entry.type === 'receita' ? '+' : '-'}{formatCurrency(entry.amount)}
              </span>
              <span className={`block mt-1 status-badge text-[10px] ${entry.status === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
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
