import React from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency, StatusBadge } from '@/components/shared/StatusBadge';
import { Truck, Package, User, Camera, PenLine, ClipboardList, RefreshCw, Trophy, Loader2, Calendar, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { updateClientRewardsAuto } from '@/lib/rewardServiceSupabase';
import { toast } from 'sonner';
import { uploadToR2 } from '@/lib/storageServiceR2';
import type { Order, DeliveryPickup } from '@/types/erp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        
        // 1. Busca as retiradas primeiro
        const { data: pickupsData } = await supabase
          .from('delivery_pickups')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (pickupsData) {
          setDeepPickups(pickupsData.map(p => ({
            ...p,
            orderId: p.order_id,
            orderNumber: p.order_number,
            delivererName: p.deliverer_name,
            photoUrl: p.photo_url,
            signatureUrl: p.signature_url,
            pickedUpAt: p.created_at,
            batchId: p.batch_id
          })));

          // 2. Busca específica de todos os pedidos mencionados nessas retiradas (independente do status atual)
          const orderIds = [...new Set(pickupsData.map(p => p.order_id).filter(Boolean))];
          if (orderIds.length > 0) {
            const { data: ordersData } = await supabase
              .from('orders')
              .select('*')
              .in('id', orderIds);
            
            if (ordersData) {
              setDeepOrders(ordersData.map(o => ({ 
                ...o, 
                clientName: o.client_name,
                sellerName: o.seller_name,
                orderNumber: o.number,
                statusHistory: o.status_history || [] 
              } as any)));
            }
          }
        }
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
            batchId: `RESGATADO-${new Date(historyEntry.timestamp).toISOString().split('T')[0]}`
          });
        }
      }
    });
    return pickups;
  }, [allPickups, allOrders]);

  const [migrating, setMigrating] = React.useState(false);
  const [syncingLogistics, setSyncingLogistics] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCarrier, setSelectedCarrier] = React.useState('TODOS');
  const [dateRange, setDateRange] = React.useState<'hoje' | 'semana' | 'mes' | 'todos'>('todos');
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null);

  // Obtém lista de transportadoras para o filtro
  const carriersList = React.useMemo(() => {
    const set = new Set<string>();
    allOrders.forEach(o => {
      if (o.carrier) set.add(o.carrier.trim().toUpperCase());
    });
    return ['TODOS', ...Array.from(set).sort()];
  }, [allOrders]);

  // Agrupamento de coletas com filtragem avançada
  const deliveryBatches = React.useMemo(() => {
    const batchesMap = new Map<string, {
      id: string,
      delivererName: string,
      date: string,
      photoUrl: string,
      signatureUrl: string,
      orders: { number: string, id: string }[],
      carriers: string[]
    }>();

    const sortedPickups = [...mergedPickups].sort((a, b) => {
      const dateA = a.pickedUpAt ? new Date(a.pickedUpAt).getTime() : 0;
      const dateB = b.pickedUpAt ? new Date(b.pickedUpAt).getTime() : 0;
      return dateB - dateA;
    });

    sortedPickups.forEach(p => {
      const bId = p.batchId || `SINGLE-${p.id}`;
      
      // Busca informações do pedido original para enriquecer o lote
      const order = allOrders.find(o => o.id === p.orderId);
      const carrier = order?.carrier?.trim().toUpperCase() || 'N/A';

      // 🔍 FILTRAGEM
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        (p.delivererName || '').toLowerCase().includes(query) ||
        (p.orderNumber || '').toLowerCase().includes(query) ||
        (p.batchId || '').toString().toLowerCase().includes(query);

      const matchesCarrier = selectedCarrier === 'TODOS' || carrier === selectedCarrier;
      
      const pickupDate = new Date(p.pickedUpAt || 0);
      const now = new Date();
      let matchesDate = true;
      if (dateRange === 'hoje') matchesDate = pickupDate.toDateString() === now.toDateString();
      else if (dateRange === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = pickupDate >= weekAgo;
      }
      else if (dateRange === 'mes') {
        matchesDate = pickupDate.getMonth() === now.getMonth() && pickupDate.getFullYear() === now.getFullYear();
      }

      if (matchesSearch && matchesCarrier && matchesDate) {
        if (!batchesMap.has(bId)) {
          batchesMap.set(bId, {
            id: bId,
            delivererName: p.delivererName || 'Não identificado',
            date: p.pickedUpAt || new Date().toISOString(),
            photoUrl: p.photoUrl || '',
            signatureUrl: p.signatureUrl || '',
            orders: [],
            carriers: []
          });
        }
        
        const batch = batchesMap.get(bId)!;
        if (p.orderNumber && !batch.orders.some(o => o.number === p.orderNumber)) {
          batch.orders.push({ number: p.orderNumber, id: p.orderId });
        }
        if (carrier !== 'N/A' && !batch.carriers.includes(carrier)) {
          batch.carriers.push(carrier);
        }
      }
    });

    return Array.from(batchesMap.values());
  }, [mergedPickups, allOrders, searchQuery, selectedCarrier, dateRange]);

  const selectedBatch = React.useMemo(() => 
    deliveryBatches.find(b => b.id === selectedBatchId),
    [deliveryBatches, selectedBatchId]
  );

  // Estatísticas rápidas baseadas nos lotes filtrados
  const stats = React.useMemo(() => {
    const totalVolumes = deliveryBatches.reduce((acc, b) => acc + b.orders.length, 0);
    const uniqueDeliverers = new Set(deliveryBatches.map(b => b.delivererName)).size;
    return {
      totalBatches: deliveryBatches.length,
      totalVolumes,
      uniqueDeliverers
    };
  }, [deliveryBatches]);

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

  const handleFixRewards = async () => {
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
      </div>

      {/* Relatório de Logística (Retiradas) */}
      <div className="card-section p-0 border-primary/20 bg-primary/[0.01] overflow-visible">
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 border-b border-primary/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group">
              <Truck className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter">Logística & Retiradas</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <p className="text-xs text-muted-foreground font-semibold">Monitoramento em tempo real de coletas</p>
              </div>
            </div>
          </div>

          {/* Filtros Modernos */}
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar pedido, entregador..."
                  className="input-modern pl-10 h-10 text-[11px] w-64 bg-white/50 border-border/40 focus:bg-white transition-all shadow-sm"
                />
             </div>
             <select 
               value={selectedCarrier}
               onChange={e => setSelectedCarrier(e.target.value)}
               className="input-modern h-10 text-[11px] w-48 bg-white/50 border-border/40 font-bold uppercase cursor-pointer"
             >
               {carriersList.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <div className="flex bg-muted/40 p-1 rounded-xl border border-border/20">
                {(['hoje', 'semana', 'mes', 'todos'] as const).map(p => (
                   <button
                     key={p}
                     onClick={() => setDateRange(p)}
                     className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${dateRange === p ? 'bg-white text-primary shadow-sm ring-1 ring-border/30' : 'text-muted-foreground hover:bg-white/40'}`}
                   >
                     {p}
                   </button>
                ))}
             </div>
             <button 
               onClick={() => window.location.reload()} 
               className="w-10 h-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-primary/5 transition-all active:scale-95 text-muted-foreground hover:text-primary"
               title="Sincronizar agora"
             >
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Mini Dash de Logística */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pt-6">
           <div className="p-4 rounded-2xl bg-primary/[0.03] border border-primary/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                 <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Total de Coletas</p>
                 <p className="text-xl font-black text-foreground">{stats.totalBatches}</p>
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-success/[0.03] border border-success/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                 <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Volumes Coletados</p>
                 <p className="text-xl font-black text-foreground">{stats.totalVolumes}</p>
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                 <User className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-muted-foreground/60 uppercase">Entregadores Ativos</p>
                 <p className="text-xl font-black text-foreground">{stats.uniqueDeliverers}</p>
              </div>
           </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {deliveryBatches.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white/40 rounded-[2.5rem] border-2 border-dashed border-border/40 backdrop-blur-sm animate-pulse">
                <div className="w-24 h-24 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-muted-foreground/40" />
                </div>
                <p className="text-xl font-black text-foreground uppercase tracking-[0.2em]">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">Experimente ajustar os filtros de busca ou transportadora para encontrar coletas.</p>
              </div>
            ) : (
              deliveryBatches.map(batch => (
                <div 
                  key={batch.id} 
                  onClick={() => setSelectedBatchId(batch.id)}
                  className="group relative flex flex-col bg-white rounded-[2rem] border border-border/20 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-primary/30 transition-all duration-500 overflow-hidden cursor-pointer active:scale-95"
                >
                  {/* Banner superior dinâmico */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${batch.id.startsWith('SINGLE-') ? 'from-amber-400 to-amber-600' : 'from-primary to-blue-600'}`} />
                  
                  {/* Header do card */}
                  <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${batch.id.startsWith('SINGLE-') ? 'bg-amber-100 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                        {batch.id.startsWith('SINGLE-') ? 'Coleta Única' : 'Lote'}
                      </span>
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(batch.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border/10">
                          <Truck className="w-5 h-5 text-muted-foreground" />
                       </div>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest leading-none mb-1">Cód. Rastreio / Lote</p>
                          <p className="text-xs font-black text-foreground truncate uppercase">{(batch.id || '').toString().replace('SINGLE-', '').replace('RESGATADO-', '')}</p>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 pt-4 flex-1 flex flex-col gap-5">
                    {/* Entregador */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Responsável</p>
                         <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="text-[9px] font-bold text-success uppercase">Verificado</span>
                         </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-muted/20 border border-border/10 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                           <User className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-sm font-black text-foreground uppercase truncate">{batch.delivererName}</p>
                      </div>
                    </div>

                    {/* Provas Visuais (Foto e Assinatura) */}
                    <div className="grid grid-cols-2 gap-3 h-32">
                      <div className="relative rounded-2xl border border-border/10 overflow-hidden bg-muted/5 group/media cursor-zoom-in">
                         {batch.photoUrl ? (
                           <img src={batch.photoUrl} alt="Foto Face" className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-125" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-20">
                             <Camera className="w-6 h-6" />
                             <span className="text-[7px] font-black">N/A</span>
                           </div>
                         )}
                         <div className="absolute inset-x-0 bottom-0 bg-black/40 backdrop-blur-md p-1.5">
                            <p className="text-[7px] font-black text-white text-center uppercase tracking-widest">Reconhecimento</p>
                         </div>
                      </div>

                      <div className="relative rounded-2xl border border-border/10 overflow-hidden bg-white/50 group/media cursor-zoom-in">
                         {batch.signatureUrl ? (
                           <img src={batch.signatureUrl} alt="Assinatura" className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover/media:scale-110" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-20">
                             <PenLine className="w-6 h-6" />
                             <span className="text-[7px] font-black">N/A</span>
                           </div>
                         )}
                         <div className="absolute inset-x-0 bottom-0 bg-primary/10 backdrop-blur-md p-1.5 border-t border-primary/10">
                            <p className="text-[7px] font-black text-primary text-center uppercase tracking-widest">Assinatura Digital</p>
                         </div>
                      </div>
                    </div>

                    {/* Pedidos & Transportadoras */}
                    <div className="mt-auto pt-2 space-y-3">
                       {batch.carriers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                             {batch.carriers.map(c => (
                                <span key={c} className="px-2 py-0.5 rounded-md bg-foreground text-background text-[8px] font-black uppercase tracking-tighter">
                                   {c}
                                </span>
                             ))}
                          </div>
                       )}
                       <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1 max-w-[70%]">
                             {batch.orders.slice(0, 3).map(o => (
                               <span key={o.number} className="px-2 py-0.5 rounded-lg bg-muted text-foreground text-[9px] font-bold border border-border/5">
                                 {o.number}
                               </span>
                             ))}
                             {batch.orders.length > 3 && (
                               <span className="px-2 py-0.5 rounded-lg bg-primary text-white text-[9px] font-black">
                                 +{batch.orders.length - 3}
                               </span>
                             )}
                          </div>
                          <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-2 py-1 rounded-lg ring-1 ring-primary/20">
                            {batch.orders.length} Vol.
                          </span>
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
      {/* Ações de Recuperação */}
      <div className="card-section p-6">
          <div className="bg-muted/10 rounded-2xl p-6 border border-border/20">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4">Ações de Recuperação</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleSyncLogistics}
                disabled={syncingLogistics}
                className="btn-modern bg-primary/10 text-primary shadow-none hover:bg-primary/20"
              >
                {syncingLogistics ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sincronizar Logística (LocalStorage)
              </button>

              <button
                onClick={handleFixRewards}
                disabled={migrating}
                className="btn-modern bg-amber-500/10 text-amber-600 shadow-none hover:bg-amber-500/20"
              >
                {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Recalcular Recompensas (Site)
              </button>
            </div>
          </div>
      </div>

      {/* MODAL DE DETALHES DO LOTE */}
      <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
           {selectedBatch && (
             <div className="flex flex-col">
                <div className="bg-primary p-8 text-white relative">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                         <Truck className="w-7 h-7 text-white" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Detalhes da Coleta</p>
                         <h2 className="text-2xl font-black uppercase truncate max-w-md">
                            {selectedBatch.id.replace('SINGLE-', '').replace('RESGATADO-', '')}
                         </h2>
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-6 mt-2">
                      <div className="flex items-center gap-2">
                         <User className="w-4 h-4 opacity-60" />
                         <span className="text-sm font-black uppercase">{selectedBatch.delivererName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <Calendar className="w-4 h-4 opacity-60" />
                         <span className="text-sm font-black">{new Date(selectedBatch.date).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                         <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {selectedBatch.orders.length} Volumes
                         </span>
                      </div>
                   </div>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                   <div className="grid grid-cols-1 gap-6">
                      {/* Grid de Pedidos */}
                      <div className="space-y-4">
                         <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Listagem Completa de Pedidos</h3>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedBatch.orders.map(o => {
                               const orderInfo = allOrders.find(ao => ao.id === o.id || ao.number === o.number || (o.number && ao.number === o.number.replace('PED-', '')));
                               return (
                                  <div key={o.number} className="p-4 rounded-2xl bg-muted/30 border border-border/10 hover:border-primary/30 transition-all group">
                                     <div className="flex items-start justify-between mb-2">
                                        <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{o.number}</p>
                                        <span className="text-[8px] font-black bg-foreground text-background px-1.5 py-0.5 rounded uppercase">
                                           {orderInfo?.carrier || 'Manual'}
                                        </span>
                                     </div>
                                     <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-foreground uppercase truncate">
                                           {orderInfo?.clientName || 'Cliente não identificado'}
                                        </p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">
                                           Vendedor: {orderInfo?.sellerName || 'Não Informado'}
                                        </p>
                                     </div>
                                     <div className="mt-2 text-[9px]">
                                        <StatusBadge status={orderInfo?.status || 'retirado_entregador'} />
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      </div>

                      {/* Provas em tamanho maior */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Confirmação Facial</h3>
                            <div className="aspect-video rounded-3xl overflow-hidden border border-border/20 bg-muted/30">
                               {selectedBatch.photoUrl ? (
                                  <img src={selectedBatch.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Camera className="w-10 h-10" /></div>
                               )}
                            </div>
                         </div>
                         <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Assinatura Digital</h3>
                            <div className="aspect-video rounded-3xl overflow-hidden border border-border/20 bg-white">
                               {selectedBatch.signatureUrl ? (
                                  <img src={selectedBatch.signatureUrl} alt="Assinatura" className="w-full h-full object-contain p-6" />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><PenLine className="w-10 h-10" /></div>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 bg-muted/20 border-t border-border/10 flex justify-end">
                   <button 
                     onClick={() => setSelectedBatchId(null)}
                     className="px-6 py-2 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
                   >
                      Fechar Detalhes
                   </button>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RelatoriosPage;
