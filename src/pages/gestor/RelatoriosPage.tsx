import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { Truck, Package, User, Camera, PenLine, ClipboardList } from 'lucide-react';

const RelatoriosPage: React.FC = () => {
  const { financialEntries, orders, deliveryPickups } = useERP();

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

  // Agrupar retiradas por batchId
  const deliveryBatches = React.useMemo(() => {
    const batchesMap = new Map<string, {
      id: string,
      delivererName: string,
      date: string,
      photoUrl: string,
      signatureUrl: string,
      orders: string[]
    }>();

    const sortedPickups = [...deliveryPickups].sort((a, b) => new Date(b.pickedUpAt).getTime() - new Date(a.pickedUpAt).getTime());

    sortedPickups.forEach(p => {
      const bId = p.batchId || `SINGLE-${p.id}`;
      if (!batchesMap.has(bId)) {
        batchesMap.set(bId, {
          id: bId,
          delivererName: p.delivererName,
          date: p.pickedUpAt,
          photoUrl: p.photoUrl,
          signatureUrl: p.signatureUrl,
          orders: []
        });
      }
      batchesMap.get(bId)!.orders.push(p.orderNumber);
    });

    return Array.from(batchesMap.values());
  }, [deliveryPickups]);

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="page-header">Relatórios</h1>
        <p className="page-subtitle">Análise financeira e operacional</p>
      </div>

      {/* Relatório de Retiradas (Logística) */}
      <div className="card-section p-6 border-primary/20 bg-primary/[0.02]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="card-section-title">Relatório de Logística (Retiradas)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico de pedidos retirados por entregadores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveryBatches.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-muted/30 rounded-2xl border-2 border-dashed">
              <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma retirada registrada.</p>
            </div>
          ) : (
            deliveryBatches.map(batch => (
              <div key={batch.id} className="card-section p-0 overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300">
                {/* Header do card */}
                <div className="bg-muted/30 p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white px-2 py-0.5 rounded-full border">
                      {batch.id.startsWith('RET-') ? `Lote: ${batch.id}` : 'Retirada Única'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(batch.date).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="font-bold text-foreground text-sm flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {batch.delivererName}
                  </p>
                </div>

                {/* Body do card */}
                <div className="p-4 space-y-4">
                  {/* Foto e Assinatura */}
                  <div className="flex gap-2 h-32">
                    <div className="flex-1 rounded-lg border overflow-hidden bg-black relative group">
                      <img src={batch.photoUrl} alt="Entregador" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border overflow-hidden bg-white relative group">
                      <img src={batch.signatureUrl} alt="Assinatura" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <PenLine className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Lista de Pedidos */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" /> Pedidos no Lote ({batch.orders.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {batch.orders.map(num => (
                        <span key={num} className="status-badge bg-primary/10 text-primary text-[10px] font-bold">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Relatório de Produção */}
      <div className="card-section p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-producao/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-producao" />
          </div>
          <div>
            <h2 className="card-section-title">Relatório de Produção (Ocorrências)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Registro de alterações e eventos na fábrica</p>
          </div>
        </div>

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
