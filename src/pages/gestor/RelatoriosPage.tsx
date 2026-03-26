import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { Truck, Package, User, Camera, PenLine, ClipboardList, RefreshCw, Trophy, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { updateClientRewardsAuto } from '@/lib/rewardServiceSupabase';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/storageServiceR2';
import type { Order, DeliveryPickup } from '@/types/erp';

const RelatoriosPage: React.FC = () => {
  const { financialEntries, orders: contextOrders, deliveryPickups: contextPickups } = useERP();
  const [deepOrders, setDeepOrders] = React.useState<Order[]>([]);
  const [deepPickups, setDeepPickups] = React.useState<DeliveryPickup[]>([]);
  const [loadingDeep, setLoadingDeep] = React.useState(false);

  // 📡 Busca PROFUNDA: Carrega dados históricos além do limite do context (200/100)
  React.useEffect(() => {
    const fetchDeepData = async () => {
      setLoadingDeep(true);
      try {
        console.log('[Relatorios] 📡 Buscando histórico profundo de logística...');
        // Busca todos os pedidos retirados (sem limite de 200)
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'retirado_entregador')
          .order('created_at', { ascending: false });

        // Busca todas as retiradas (sem limite de 100)
        const { data: pickupsData } = await supabase
          .from('delivery_pickups')
          .select('*')
          .order('created_at', { ascending: false });

        if (ordersData) setDeepOrders(ordersData.map(o => ({ ...o, statusHistory: o.status_history || [] } as any)));
        if (pickupsData) setDeepPickups(pickupsData.map(p => ({
          ...p,
          orderId: p.order_id,
          orderNumber: p.order_number,
          delivererName: p.deliverer_name,
          photoUrl: p.photo_url,
          signatureUrl: p.signature_url,
          pickedUpAt: p.created_at,
          batchId: p.batch_id
        })));
      } catch (err) {
        console.error('[Relatorios] Erro no Deep Fetch:', err);
      } finally {
        setLoadingDeep(false);
      }
    };

    fetchDeepData();
  }, []);

  // União dos dados locais + busca profunda
  const allOrders = React.useMemo(() => {
    const map = new Map<string, Order>();
    contextOrders.forEach(o => map.set(o.id, o));
    deepOrders.forEach(o => map.set(o.id, o));
    return Array.from(map.values());
  }, [contextOrders, deepOrders]);

  const allPickups = React.useMemo(() => {
    const map = new Map<string, DeliveryPickup>();
    contextPickups.forEach(p => map.set(p.id, p));
    deepPickups.forEach(p => map.set(p.id, p));
    return Array.from(map.values());
  }, [contextPickups, deepPickups]);

  const receitas = financialEntries.filter(e => e.type === 'receita').reduce((s, e) => s + e.amount, 0);
  const despesas = financialEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + e.amount, 0);

  const productionOccurrences = allOrders.flatMap(order =>
    (order.statusHistory || [])
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

  // 🔄 RECONSTRUÇÃO DE LOGÍSTICA (LEGADO/MIGRADO)
  const mergedPickups = React.useMemo(() => {
    const pickups = [...allPickups];
    const existingOrderIds = new Set(pickups.map(p => p.orderId));
    
    allOrders.forEach(order => {
      if (order.status === 'retirado_entregador' && !existingOrderIds.has(order.id)) {
        const historyEntry = [...(order.statusHistory || [])]
          .reverse()
          .find(h => h.status === 'retirado_entregador');
        
        if (historyEntry) {
          const delivererName = historyEntry.note?.includes('Retirado pelo entregador:') 
            ? historyEntry.note.split('Retirado pelo entregador:')[1].trim()
            : (historyEntry.user || 'Entregador não identificado');

          pickups.push({
            id: `LEGACY-${order.id}`,
            orderId: order.id,
            orderNumber: order.number,
            delivererName,
            photoUrl: '', 
            signatureUrl: '', 
            pickedUpAt: historyEntry.timestamp,
            note: 'Registro reconstruído via histórico',
            batchId: `MIGRATED-${new Date(historyEntry.timestamp).toISOString().split('T')[0]}`
          });
        }
      }
    });
    return pickups;
  }, [allPickups, allOrders]);

  const deliveryBatches = React.useMemo(() => {
    const batchesMap = new Map<string, {
      id: string,
      delivererName: string,
      date: string,
      photoUrl: string,
      signatureUrl: string,
      orders: string[]
    }>();

    const sortedPickups = [...mergedPickups].sort((a, b) => {
      const dateA = a.pickedUpAt ? new Date(a.pickedUpAt).getTime() : 0;
      const dateB = b.pickedUpAt ? new Date(b.pickedUpAt).getTime() : 0;
      return dateB - dateA;
    });

    sortedPickups.forEach(p => {
      const bId = p.batchId || `SINGLE-${p.id}`;
      if (!batchesMap.has(bId)) {
        batchesMap.set(bId, {
          id: bId,
          delivererName: p.delivererName || 'Não identificado',
          date: p.pickedUpAt || new Date().toISOString(),
          photoUrl: p.photoUrl || '',
          signatureUrl: p.signatureUrl || '',
          orders: []
        });
      }
      if (p.orderNumber && !batchesMap.get(bId)!.orders.includes(p.orderNumber)) {
        batchesMap.get(bId)!.orders.push(p.orderNumber);
      }
    });

    return Array.from(batchesMap.values());
  }, [mergedPickups]);

  const [migrating, setMigrating] = React.useState(false);
  const [syncingLogistics, setSyncingLogistics] = React.useState(false);

  // 🛸 MIRAÇÃO DE EMERGÊNCIA: Recupera Coletas do LocalStorage
  const handleSyncLogistics = async () => {
    const localData = localStorage.getItem('erp_delivery_pickups');
    if (!localData) {
      toast.info('Nenhum dado legado encontrado neste navegador.');
      return;
    }

    setSyncingLogistics(true);
    toast.info('🚀 Iniciando recuperação de fotos e assinaturas legado...');

    try {
      const legacyPickups: DeliveryPickup[] = JSON.parse(localData);
      const b64ToBlob = (b64: string) => {
        if (!b64 || !b64.startsWith('data:')) return null;
        const parts = b64.split(';');
        const contentType = parts[0].split(':')[1];
        const decodedData = window.atob(parts[1].split(',')[1]);
        const uInt8Array = new Uint8Array(decodedData.length);
        for (let i = 0; i < decodedData.length; ++i) uInt8Array[i] = decodedData.charCodeAt(i);
        return new Blob([uInt8Array], { type: contentType });
      };

      let recovered = 0;
      for (const pickup of legacyPickups) {
        // Verifica se já existe no Supabase (deepPickups já carregou tudo)
        const exists = allPickups.some(p => p.orderId === pickup.orderId || (p.orderNumber === pickup.orderNumber && p.delivererName === pickup.delivererName));
        if (exists) continue;

        let finalPhoto = pickup.photoUrl;
        let finalSig = pickup.signatureUrl;

        // Se for Base64, subir para R2
        if (pickup.photoUrl?.startsWith('data:')) {
          const blob = b64ToBlob(pickup.photoUrl);
          if (blob) finalPhoto = await uploadToR2(blob, `recuperado/face-${pickup.orderNumber}-${Date.now()}.jpg`);
        }
        if (pickup.signatureUrl?.startsWith('data:')) {
          const blob = b64ToBlob(pickup.signatureUrl);
          if (blob) finalSig = await uploadToR2(blob, `recuperado/sig-${pickup.orderNumber}-${Date.now()}.png`);
        }

        const { error } = await supabase.from('delivery_pickups').insert([{
          order_id: pickup.orderId,
          order_number: pickup.orderNumber,
          deliverer_name: pickup.delivererName,
          photo_url: finalPhoto,
          signature_url: finalSig,
          batch_id: pickup.batchId || null,
          note: pickup.note || 'Recuperado do Cache Local',
          created_at: pickup.pickedUpAt
        }]);

        if (!error) recovered++;
      }

      toast.success(`🎉 Sucesso! Recuperados ${recovered} registros com imagens.`);
      window.location.reload();
    } catch (err: any) {
      console.error('Erro na recuperação:', err);
      toast.error('Falha na recuperação: ' + err.message);
    } finally {
      setSyncingLogistics(false);
    }
  };

  const handleMigrateRewards = async () => {
    setMigrating(true);
    toast.info('Iniciando recalculo de premiações para todos os clientes...');
    try {
      const { data: clients, error } = await supabase.from('clients').select('id, name');
      if (error) throw error;

      let count = 0;
      for (const client of (clients || [])) {
        await updateClientRewardsAuto(client.id);
        count++;
      }
      toast.success(`Sucesso! Recalculado premiações para ${count} clientes.`);
    } catch (err: any) {
      console.error('Erro na migração:', err);
      toast.error('Erro ao recalcular premiações: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-header">Relatórios</h1>
          <p className="page-subtitle">Análise financeira e operacional</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={handleSyncLogistics} 
             disabled={syncingLogistics}
             className="btn-modern bg-primary/10 text-primary border-primary/20 text-[10px] font-black"
           >
             {syncingLogistics ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
             RECUPERAR FOTOS LEGADO
           </button>
           <button 
             onClick={handleMigrateRewards} 
             disabled={migrating}
             className="btn-modern bg-producao/10 text-producao border-producao/20 text-[10px] font-black"
           >
             {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Trophy className="w-3.5 h-3.5 mr-2" />}
             RECALCULAR PREMIAÇÕES
           </button>
        </div>
      </div>

      {/* Relatório de Logística (Retiradas) */}
      <div className="card-section p-0 border-primary/20 bg-primary/[0.01] overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Logística & Retiradas</h2>
              <p className="text-xs text-muted-foreground font-medium">Controle de coleta, assinaturas e fotos dos entregadores</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95"
            title="Sincronizar agora"
          >
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveryBatches.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed border-border/40">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-lg font-black text-foreground uppercase tracking-widest">Nenhuma retirada registrada</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Os registros aparecerão aqui assim que os entregadores assinarem a coleta na expedição.</p>
              </div>
            ) : (
              deliveryBatches.map(batch => (
                <div key={batch.id} className="glass-card p-0 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] overflow-hidden border border-border/20 group">
                  {/* Header do card - Identificação */}
                  <div className="bg-muted/30 p-5 border-b border-border/10 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                          {!batch.id.startsWith('SINGLE-') ? `LOTE: ${batch.id.length > 15 ? batch.id.substring(0, 8) + '...' : batch.id}` : 'COLETA ÚNICA'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {new Date(batch.date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm">
                      <ClipboardList className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Entregador */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Entregador Responsável</p>
                      <p className="text-base font-black text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> {batch.delivererName}
                      </p>
                    </div>

                    {/* Provas Visuais (Foto e Assinatura) */}
                    <div className="grid grid-cols-2 gap-3 h-40">
                      <div className="relative rounded-2xl border border-border/20 overflow-hidden bg-muted/20 group/media">
                         {batch.photoUrl ? (
                           <img src={batch.photoUrl} alt="Foto Face" className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
                             <Camera className="w-8 h-8" />
                             <span className="text-[8px] font-bold">SEM FOTO</span>
                           </div>
                         )}
                         <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 backdrop-blur-sm">
                            <p className="text-[8px] font-black text-white text-center uppercase tracking-widest flex items-center justify-center gap-1">
                              <Camera className="w-2.5 h-2.5" /> RECONHECIMENTO
                            </p>
                         </div>
                      </div>

                      <div className="relative rounded-2xl border border-border/20 overflow-hidden bg-white group/media">
                         {batch.signatureUrl ? (
                           <img src={batch.signatureUrl} alt="Assinatura" className="w-full h-full object-contain p-4" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
                             <PenLine className="w-8 h-8" />
                             <span className="text-[8px] font-bold">SEM ASSINATURA</span>
                           </div>
                         )}
                         <div className="absolute inset-x-0 bottom-0 bg-primary/10 p-1.5 backdrop-blur-sm border-t border-primary/20">
                            <p className="text-[8px] font-black text-primary text-center uppercase tracking-widest flex items-center justify-center gap-1">
                              <PenLine className="w-2.5 h-2.5" /> ASSINATURA DIGITAL
                            </p>
                         </div>
                      </div>
                    </div>

                    {/* Pedidos Vinculados */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pedidos Coletados</p>
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black">
                          {batch.orders.length} VOL.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {batch.orders.map(num => (
                          <span key={num} className="px-3 py-1 rounded-lg bg-foreground/5 text-foreground text-[11px] font-bold border border-border/10">
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
      </div>

      {/* Relatório de Produção */}
      <div className="card-section p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-producao/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-producao" />
          </div>
          <div>
            <h2 className="card-section-title">Histórico de Produção</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Rastreabilidade completa de todas as etapas e auditagem</p>
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
                <th>Ação / Observação</th>
              </tr>
            </thead>
            <tbody>
              {productionOccurrences.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground p-12">Nenhum registro encontrado no histórico de produção.</td></tr>
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
