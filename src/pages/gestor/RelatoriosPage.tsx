import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';

const RelatoriosPage: React.FC = () => {
  const { financialEntries, orders } = useERP();

  const receitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const despesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);

  const productionOccurrences = orders.flatMap(order =>
    order.statusHistory
      .filter(history =>
        ['aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(history.status) ||
        history.user.toLowerCase().includes('produ') ||
        history.user.toLowerCase().includes('base')
      )
      .map(history => ({
        orderNumber: order.number,
        client: order.clientName,
        date: history.timestamp,
        user: history.user,
        status: history.status,
        note: history.note
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Relatórios</h1>
        <p className="page-subtitle">Análise financeira e operacional</p>
      </div>

      {/* Relatório de Produção */}
      <div className="card-section p-6">
        <h2 className="card-section-title mb-5">Relatório de Produção (Ocorrências)</h2>
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Usuário</th>
                <th>Status</th>
                <th>Ocorrência / Observação</th>
              </tr>
            </thead>
            <tbody>
              {productionOccurrences.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground p-4">Nenhuma ocorrência registrada na produção.</td></tr>
              ) : (
                productionOccurrences.map((occ, i) => (
                  <tr key={i}>
                    <td className="text-xs whitespace-nowrap text-muted-foreground">{new Date(occ.date).toLocaleString('pt-BR')}</td>
                    <td className="font-bold text-foreground">{occ.orderNumber}</td>
                    <td className="text-xs">{occ.client}</td>
                    <td className="text-xs">{occ.user}</td>
                    <td><StatusBadge status={occ.status} /></td>
                    <td className="text-xs text-foreground max-w-xs">{occ.note || <span className="text-muted-foreground italic">Sem observações</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;
