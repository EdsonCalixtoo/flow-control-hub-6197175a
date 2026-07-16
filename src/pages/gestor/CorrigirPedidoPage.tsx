import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Save, Package, Truck, ArrowLeft, Edit3, History, Clock, Plus, CheckCircle2, Check, RotateCcw, Calendar, X, ChevronDown, ChevronUp, AlertCircle, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { InstallationCalendar } from '@/components/shared/InstallationCalendar';
import { checkInstallationConflict, saveInstallation, deleteInstallationByOrder } from '@/lib/installationServiceSupabase';

const CorrigirPedidoPage: React.FC = () => {
  const { orders, updateOrder, products } = useERP();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<number>(1);
  const [carrier, setCarrier] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [installationDate, setInstallationDate] = useState('');
  const [installationTime, setInstallationTime] = useState('');
  const [parentOrderId, setParentOrderId] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [orderType, setOrderType] = useState<any>('entrega');
  const [loading, setLoading] = useState(false);
  const [unifySearch, setUnifySearch] = useState('');
  const [activeSchedulingItemIndex, setActiveSchedulingItemIndex] = useState<number | null>(null);
  const [isUnifyOpen, setIsUnifyOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders.slice(0, 100);
    const term = searchTerm.toLowerCase();
    return orders.filter(o =>
      (o.number || '').toLowerCase().includes(term) ||
      (o.clientName || '').toLowerCase().includes(term) ||
      (o.sellerName || '').toLowerCase().includes(term)
    ).slice(0, 100);
  }, [orders, searchTerm]);

  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId), [orders, selectedOrderId]);

  const possibleChildren = useMemo(() => {
    if (!selectedOrder) return [];
    const term = unifySearch.toLowerCase();
    return orders.filter(o => {
      if (o.id === selectedOrderId || o.id === parentOrderId) return false;
      if (!term) return o.clientId === selectedOrder.clientId || o.clientName === selectedOrder.clientName;
      const matchesSearch = o.number.toLowerCase().includes(term) || o.clientName.toLowerCase().includes(term);
      const isActive = ['aguardando_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status);
      return matchesSearch && isActive;
    });
  }, [orders, selectedOrderId, parentOrderId, selectedOrder, unifySearch]);

  const handleSelectOrder = (order: any) => {
    setSelectedOrderId(order.id);
    setVolumes(order.volumes || 1);
    setCarrier(order.carrier || '');
    setItems(order.items || []);
    setInstallationDate(order.installationDate || '');
    setInstallationTime(order.installationTime || '');
    setParentOrderId(order.parentOrderId || null);
    setOrderType(order.orderType || 'entrega');
    const children = orders.filter(o => o.parentOrderId === order.id).map(o => o.id);
    setSelectedChildIds(children);
    setUnifySearch('');
    setIsUnifyOpen(children.length > 0 || !!order.parentOrderId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!selectedOrderId) return;
    setLoading(true);
    try {
      if ((orderType === 'instalacao' || orderType === 'manutencao') && (!installationDate || !installationTime)) {
        const hasItemWithDate = items.some(i => i.installationDate && i.installationTime);
        if (!hasItemWithDate) { toast.error('Informe data e horario de instalacao.'); setLoading(false); return; }
      }
      if ((orderType === 'instalacao' || orderType === 'manutencao') && installationDate && installationTime &&
        (installationDate !== selectedOrder?.installationDate || installationTime !== selectedOrder?.installationTime)) {
        if (await checkInstallationConflict(installationDate, installationTime, selectedOrderId)) {
          toast.error('Horario ja ocupado.'); setLoading(false); return;
        }
      }
      if (orderType === 'instalacao' || orderType === 'manutencao') {
        for (const item of items) {
          if (item.installationDate && item.installationTime) {
            if (await checkInstallationConflict(item.installationDate, item.installationTime, selectedOrderId)) {
              toast.error(`Horario ${item.installationTime} do item ${item.product} ja ocupado.`); setLoading(false); return;
            }
          }
        }
      }
      await updateOrder(selectedOrderId, {
        volumes: Number(volumes), carrier: carrier.toUpperCase(), items,
        subtotal: calculatedSubtotal, total: calculatedTotal,
        installationDate: (orderType === 'entrega' || orderType === 'retirada') ? '' : installationDate,
        installationTime: (orderType === 'entrega' || orderType === 'retirada') ? '' : installationTime,
        scheduledDate: (orderType === 'entrega' || orderType === 'retirada') ? '' : installationDate,
        orderType, parentOrderId, parentOrderNumber: orders.find(o => o.id === parentOrderId)?.number
      });
      for (const old of orders.filter(o => o.parentOrderId === selectedOrderId)) {
        if (!selectedChildIds.includes(old.id)) await updateOrder(old.id, { parentOrderId: null, parentOrderNumber: null });
      }
      for (const childId of selectedChildIds) {
        await updateOrder(childId, { parentOrderId: selectedOrderId, parentOrderNumber: selectedOrder?.number });
      }
      if (orderType === 'instalacao' || orderType === 'manutencao') {
        await deleteInstallationByOrder(selectedOrderId);
        const itemsWithSchedule = items.filter(i => i.installationDate && i.installationTime);
        if (itemsWithSchedule.length > 0) {
          for (const item of itemsWithSchedule) {
            await saveInstallation({ order_id: selectedOrderId, seller_id: selectedOrder?.sellerId || '1', client_name: selectedOrder?.clientName || 'Cliente', product_name: item.product, date: item.installationDate, time: item.installationTime, payment_type: selectedOrder?.installationPaymentType || 'pago', type: orderType as any });
          }
        } else if (installationDate && installationTime) {
          await saveInstallation({ order_id: selectedOrderId, seller_id: selectedOrder?.sellerId || '1', client_name: selectedOrder?.clientName || 'Cliente', date: installationDate, time: installationTime, payment_type: selectedOrder?.installationPaymentType || 'pago', type: orderType as any });
        }
      } else if ((selectedOrder?.orderType === 'instalacao' || selectedOrder?.orderType === 'manutencao') && orderType !== 'instalacao' && orderType !== 'manutencao') {
        await deleteInstallationByOrder(selectedOrderId);
      }
      toast.success('Pedido corrigido com sucesso!');
      setSelectedOrderId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { console.error(err); toast.error('Erro ao salvar.'); }
    finally { setLoading(false); }
  };

  const handleMoveToProduction = async () => {
    if (!selectedOrderId) return;
    if (!window.confirm('Voltar pedido para producao?')) return;
    setLoading(true);
    try { await updateOrder(selectedOrderId, { status: 'aguardando_producao' }); toast.success('Movido para producao!'); setSelectedOrderId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (err) { toast.error('Erro.'); } finally { setLoading(false); }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prev => { const n = [...prev]; n[index] = { ...n[index], [field]: value }; return n; });
  };

  const addItem = () => setItems(prev => [...prev, { product: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return toast.error('O pedido precisa ter ao menos um item.');
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculatedSubtotal = useMemo(() => items.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.quantity || 0)), 0), [items]);
  const calculatedTotal = useMemo(() => calculatedSubtotal + (selectedOrder?.taxes || 0), [calculatedSubtotal, selectedOrder]);
  const CARRIERS = ['JADLOG', 'MOTOBOY', 'KLEYTON', 'LALAMOVE', 'RETIRADA NA LOJA'];

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col space-y-6 pb-20 max-w-[1400px] mx-auto w-full px-4 sm:px-6">
      
      {!selectedOrder ? (
        // ==========================================
        // VISAO DE LISTA
        // ==========================================
        <div className="space-y-8 animate-in fade-in duration-500">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"><Edit3 className="w-6 h-6 sm:w-8 sm:h-8" /></div>
                Arrumar Pedido
              </h1>
              <p className="text-base font-medium text-slate-500 mt-2 max-w-2xl">
                Selecione um pedido abaixo para corrigir os volumes, transportadoras, itens ou agendamento de instalacao.
              </p>
            </div>
          </div>

          {/* BUSCA GIGANTE E BONITA */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 max-w-2xl relative flex items-center focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary transition-all">
            <div className="pl-4 pr-3 text-slate-400"><Search className="w-5 h-5" /></div>
            <input type="text" placeholder="Buscar por numero (ex: PED-123), cliente ou vendedor..."
              className="w-full h-12 bg-transparent text-sm sm:text-base font-bold focus:outline-none placeholder:text-slate-300 text-slate-700"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="pr-4 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <History className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-black uppercase text-slate-600 tracking-widest">Ultimos Pedidos Ativos</h2>
              <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full ml-auto">{filteredOrders.length}</span>
            </div>
            
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-black text-slate-600">Nenhum pedido encontrado.</h3>
                <p className="text-slate-400 font-medium">Tente buscar por outro termo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOrders.map(order => (
                  <button key={order.id} onClick={() => handleSelectOrder(order)}
                    className="group text-left bg-white p-5 rounded-3xl transition-all border border-slate-200/60 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="flex items-start justify-between w-full relative z-10">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pedido</span>
                        <span className="font-black text-slate-800 text-lg leading-none block">{order.number}</span>
                      </div>
                      <div className="shrink-0"><StatusBadge status={order.status} /></div>
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cliente</p>
                         <p className="text-sm font-bold text-slate-700 truncate" title={order.clientName}>{order.clientName}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                         <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vendedor</p>
                           <p className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{order.sellerName}</p>
                         </div>
                         <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Volumes</p>
                           <p className="text-xs font-black text-slate-700">{order.volumes || 1} cx</p>
                         </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // VISAO DE EDICAO (TELA CHEIA)
        // ==========================================
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-10">
          
          {/* HEADER DA EDICAO (ESTATICO) */}
          <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
            
            <div className="flex items-center gap-4 relative z-10">
              <button onClick={() => setSelectedOrderId(null)} className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center shrink-0 border border-slate-200" title="Voltar para lista">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">Editando</span>
                  <span className="text-xs font-bold text-slate-400">{selectedOrder.number}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{selectedOrder.clientName}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
              <button onClick={() => setSelectedOrderId(null)} className="flex-1 sm:flex-none px-6 h-12 rounded-2xl text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all border border-transparent hover:border-slate-300">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none px-8 h-12 rounded-2xl text-xs font-black uppercase text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]">
                <Save className="w-4 h-4" />{loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* COLUNA ESQUERDA (FORMULARIO PRINCIPAL) */}
            <div className="xl:col-span-8 space-y-8">
              
              {/* CARD LOGISTICA */}
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Truck className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Logistica e Tipo</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Defina como o pedido sera entregue</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Pedido</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{id:'entrega',label:'Entrega'},{id:'instalacao',label:'Instalacao'},{id:'manutencao',label:'Manutencao'},{id:'retirada',label:'Retirada'}].map(type => (
                        <button key={type.id} onClick={() => { setOrderType(type.id); if (type.id==='entrega'||type.id==='retirada'){setInstallationDate('');setInstallationTime('');} }}
                          className={`h-12 rounded-xl text-[11px] font-black uppercase transition-all border-2 ${orderType===type.id?'bg-primary border-primary text-white shadow-md shadow-primary/20':'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'}`}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Volumes (Caixas)</label>
                      <input type="number" min={1} className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-4 font-black text-2xl text-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-center" value={volumes} onChange={(e) => setVolumes(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transportadora / Entregador</label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {CARRIERS.map(c => (
                      <button key={c} type="button" onClick={() => setCarrier(c)}
                        className={`px-4 py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${carrier===c?'border-primary bg-primary/10 text-primary':'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="Ou digite o nome de outro entregador..." className="w-full h-12 mt-2 bg-white border-2 border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all uppercase placeholder:text-slate-300 placeholder:normal-case" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
                </div>
              </div>

              {/* CARD PRODUTOS */}
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 sm:p-8 space-y-6 relative">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Package className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Produtos do Pedido</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Gerencie os itens e precos</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full">{items.length} item(ns)</span>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-5 sm:p-6 rounded-[1.5rem] bg-slate-50 border border-slate-200 flex flex-col gap-4 relative group/item hover:border-slate-300 transition-colors">
                      <button onClick={() => removeItem(idx)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center sm:opacity-0 sm:group-hover/item:opacity-100 hover:bg-red-600 hover:text-white transition-all z-10" title="Remover item">
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="pr-10 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</label>
                        <select className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-4 text-sm font-black text-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" value={item.product}
                          onChange={(e) => { const p = products.find(p => p.name===e.target.value); const n=[...items]; n[idx]={...n[idx],product:e.target.value,unitPrice:p?p.unitPrice:n[idx].unitPrice}; setItems(n); }}>
                          <option value="">Selecione um produto...</option>
                          {products.map(p => (<option key={p.id} value={p.name}>{p.name}</option>))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade</label>
                          <input type="number" className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-4 text-lg font-black text-slate-800 text-center focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" value={item.quantity} onChange={(e) => handleItemChange(idx,'quantity',parseInt(e.target.value)||0)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preco Unitário (R$)</label>
                          <input type="number" className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl px-4 text-lg font-bold text-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" value={item.unitPrice} onChange={(e) => handleItemChange(idx,'unitPrice',parseFloat(e.target.value)||0)} />
                        </div>
                      </div>
                      
                      {/* Sensor (KIT) */}
                      {item.product.toUpperCase().includes('KIT') && (
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => handleItemChange(idx,'sensorType','com_sensor')} className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase transition-all border-2 flex items-center justify-center gap-2 ${item.sensorType==='com_sensor'?'bg-slate-800 border-slate-800 text-white shadow-md':'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                            {item.sensorType==='com_sensor'&&<CheckCircle2 className="w-4 h-4"/>} Com Sensor
                          </button>
                          <button type="button" onClick={() => handleItemChange(idx,'sensorType','sem_sensor')} className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase transition-all border-2 flex items-center justify-center gap-2 ${item.sensorType==='sem_sensor'?'bg-slate-500 border-slate-500 text-white shadow-md':'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                            {item.sensorType==='sem_sensor'&&<CheckCircle2 className="w-4 h-4"/>} Sem Sensor
                          </button>
                        </div>
                      )}
                      
                      {/* Agendamento do item */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 mt-2">
                        {item.installationDate && item.installationTime ? (
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Agendado para</span>
                             <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                               <Calendar className="w-3.5 h-3.5" />
                               {new Date(item.installationDate+'T00:00:00').toLocaleDateString('pt-BR')} as {item.installationTime}
                             </span>
                          </div>
                        ) : <span className="text-xs text-slate-400 italic font-medium">Sem agendamento individual</span>}
                        <button type="button" onClick={() => setActiveSchedulingItemIndex(idx)}
                          className={`px-4 h-10 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border-2 ml-auto ${item.installationDate&&item.installationTime?'bg-white text-slate-600 border-slate-300 hover:bg-slate-100':'bg-white text-primary border-primary/20 hover:border-primary hover:bg-primary/5'}`}>
                          <Calendar className="w-4 h-4" />
                          {item.installationDate&&item.installationTime?'Alterar Data':'Agendar Produto'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button onClick={addItem} className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all text-xs font-black uppercase tracking-widest">
                  <Plus className="w-5 h-5" /> Adicionar Mais Um Produto
                </button>
              </div>

              {/* UNIFICACAO ACCORDION */}
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <button onClick={() => setIsUnifyOpen(!isUnifyOpen)} className="w-full p-6 sm:p-8 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isUnifyOpen?'bg-amber-100 text-amber-600':'bg-slate-100 text-slate-500'}`}><Package className="w-5 h-5" /></div>
                    <div className="text-left">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Unificacao de Envio</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Vincule pedidos para que sejam enviados juntos</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full transition-transform duration-300 ${isUnifyOpen ? 'bg-slate-200 rotate-180' : 'bg-slate-100'}`}>
                     <ChevronDown className="w-5 h-5 text-slate-600" />
                  </div>
                </button>
                
                {isUnifyOpen && (
                  <div className="p-6 sm:p-8 border-t border-slate-100 space-y-8 bg-white animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Este pedido será enviado DENTRO de qual outro?</label>
                      <div className="relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${parentOrderId?'text-primary':'text-slate-400'}`} />
                        <select className={`w-full pl-12 pr-4 h-14 bg-white border-2 text-sm font-black rounded-xl focus:outline-none transition-all ${parentOrderId?'border-primary ring-4 ring-primary/10':'border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10'}`} value={parentOrderId||''} onChange={(e)=>setParentOrderId(e.target.value||null)}>
                          <option value="">Nenhum (pedido independente)</option>
                          <optgroup label="Mesmo Cliente">
                            {orders.filter(o=>o.id!==selectedOrderId&&(o.clientId===selectedOrder.clientId||o.clientName===selectedOrder.clientName)).map(o=>(<option key={o.id} value={o.id}>{o.number} - {o.clientName}</option>))}
                          </optgroup>
                          <optgroup label="Todos os Ativos">
                            {orders.filter(o=>o.id!==selectedOrderId&&o.clientId!==selectedOrder.clientId&&['aguardando_financeiro','aguardando_producao','em_producao','producao_finalizada','produto_liberado'].includes(o.status)).slice(0,50).map(o=>(<option key={o.id} value={o.id}>{o.number} - {o.clientName}</option>))}
                          </optgroup>
                        </select>
                      </div>
                      {parentOrderId&&(<div className="flex items-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm font-bold text-primary mt-2 animate-in fade-in"><CheckCircle2 className="w-5 h-5"/> Este pedido sera agrupado dentro do {orders.find(o=>o.id===parentOrderId)?.number}</div>)}
                    </div>
                    
                    <div className="h-px bg-slate-200/60"/>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Quais pedidos irao DENTRO deste?</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                        <input type="text" placeholder="Busque por numero do pedido..." className="w-full pl-12 pr-4 h-14 text-sm font-bold bg-white border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" value={unifySearch} onChange={(e)=>setUnifySearch(e.target.value)}/>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto space-y-2 custom-scrollbar pt-2 pr-2">
                        {possibleChildren.length>0?possibleChildren.map(o=>(
                          <label key={o.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedChildIds.includes(o.id)?'bg-primary/5 border-primary shadow-sm shadow-primary/10':'bg-white border-slate-200 hover:border-primary/40'}`}>
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition-colors ${selectedChildIds.includes(o.id)?'bg-primary border-primary text-white':'bg-slate-100 border-slate-300 text-transparent'}`}>
                              <input type="checkbox" className="hidden" checked={selectedChildIds.includes(o.id)} onChange={(e)=>{if(e.target.checked)setSelectedChildIds(prev=>[...prev,o.id]);else setSelectedChildIds(prev=>prev.filter(id=>id!==o.id));}}/>
                              <Check className="w-4 h-4 stroke-[4]"/>
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-black text-slate-800">{o.number}</p><p className="text-[11px] text-slate-500 truncate">{o.clientName}</p></div>
                            <StatusBadge status={o.status}/>
                          </label>
                        )):(
                          <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{unifySearch?'Nenhum pedido encontrado':'Sem sugestoes para este cliente'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA (RESUMO E ACOES EXTRAS) */}
            <div className="xl:col-span-4 space-y-8">
              
              {/* CARD RESUMO E SALVAR */}
              <div className="bg-slate-800 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                 
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Calculado</h3>
                 <div className="text-3xl sm:text-4xl font-black mb-6">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(calculatedTotal)}</div>
                 
                 <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                       <span>Subtotal itens</span>
                       <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(calculatedSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-300 pb-3 border-b border-slate-700">
                       <span>Taxas/Outros</span>
                       <span>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(selectedOrder.taxes || 0)}</span>
                    </div>
                 </div>

                 <button onClick={handleSave} disabled={loading} className="w-full h-14 rounded-2xl text-sm font-black uppercase text-slate-800 bg-white hover:bg-slate-100 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg">
                    <Save className="w-5 h-5" /> {loading ? 'Salvando...' : 'Salvar Todas Alteracoes'}
                 </button>
              </div>

              {/* AGENDAMENTO GERAL */}
              {(orderType==='instalacao'||orderType==='manutencao'||orderType==='retirada')&&(
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Clock className="w-5 h-5"/></div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Agenda Geral</h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">Use apenas se NAO agendou os produtos separadamente</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <InstallationCalendar selectedDate={installationDate} selectedTime={installationTime} currentOrderId={selectedOrderId||undefined} onSelect={(date,time)=>{setInstallationDate(date);setInstallationTime(time);}}/>
                  </div>
                </div>
              )}

              {/* EMERGENCIA */}
              <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 sm:p-8 space-y-4 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><AlertCircle className="w-6 h-6"/></div>
                <div>
                  <h4 className="text-sm font-black text-red-700 uppercase tracking-widest">Retornar para Fabrica</h4>
                  <p className="text-xs text-red-500 font-medium mt-1">Isso volta o status para Aguardando Producao</p>
                </div>
                <button onClick={handleMoveToProduction} disabled={loading} className="w-full h-12 mt-4 rounded-xl bg-white border-2 border-red-300 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4"/> Mover para Producao
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR PRODUTO */}
      {activeSchedulingItemIndex!==null&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-black text-primary uppercase flex items-center gap-3 text-sm tracking-widest">
                <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="w-5 h-5"/></div>
                Agendar: {items[activeSchedulingItemIndex].product}
              </h3>
              <button onClick={()=>setActiveSchedulingItemIndex(null)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
              <InstallationCalendar selectedDate={items[activeSchedulingItemIndex].installationDate||''} selectedTime={items[activeSchedulingItemIndex].installationTime||''} currentOrderId={selectedOrderId||undefined}
                onSelect={(date,time)=>{handleItemChange(activeSchedulingItemIndex,'installationDate',date);handleItemChange(activeSchedulingItemIndex,'installationTime',time);}}/>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={()=>{handleItemChange(activeSchedulingItemIndex,'installationDate','');handleItemChange(activeSchedulingItemIndex,'installationTime','');setActiveSchedulingItemIndex(null);}} className="px-6 h-12 rounded-xl text-xs font-black uppercase text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">Remover Horario</button>
              <button onClick={()=>setActiveSchedulingItemIndex(null)} className="px-8 h-12 rounded-xl text-xs font-black uppercase text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]">Confirmar Horario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrigirPedidoPage;
