import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Save, Package, Truck, ArrowLeft, Edit3, Filter, History, Clock, Plus, CheckCircle2, Check } from 'lucide-react';
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
  
  // Campos de edição
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

  // Filtra pedidos com base no termo de busca
  const filteredOrders = useMemo(() => {
    if (!searchTerm) {
        // Mostra os 100 mais recentes por padrão
        return orders.slice(0, 100);
    }
    const term = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.number.toLowerCase().includes(term) ||
      o.clientName.toLowerCase().includes(term) ||
      o.sellerName.toLowerCase().includes(term)
    ).slice(0, 100);
  }, [orders, searchTerm]);

   const selectedOrder = useMemo(() => 
     orders.find(o => o.id === selectedOrderId),
     [orders, selectedOrderId]
   );
 
   const possibleChildren = useMemo(() => {
    if (!selectedOrder) return [];
    const term = unifySearch.toLowerCase();

    return orders.filter(o => {
      // Não pode ser o próprio pedido, nem o pai selecionado
      if (o.id === selectedOrderId || o.id === parentOrderId) return false;

      // Se NÃO tem busca: Mostra apenas sugestões do mesmo cliente
      if (!term) {
        return o.clientId === selectedOrder.clientId || o.clientName === selectedOrder.clientName;
      }

      // Se TEM busca: Faz busca GLOBAL por número ou cliente em pedidos ativos
      const matchesSearch = o.number.toLowerCase().includes(term) || o.clientName.toLowerCase().includes(term);
      // Filtramos apenas status "vivos" para evitar poluição com histórico antigo
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
     
     // Identifica pedidos que já são filhos deste
     const children = orders.filter(o => o.parentOrderId === order.id).map(o => o.id);
     setSelectedChildIds(children);
     setUnifySearch('');

     // Scroll suave para o formulário no mobile
     window.scrollTo({ top: 0, behavior: 'smooth' });
   };

  const handleSave = async () => {
    if (!selectedOrderId) return;
    
    setLoading(true);
    try {
      // Recalcular totais se houver mudança nos itens
      const calculatedSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const originalTaxes = selectedOrder?.taxes || 0;
      const calculatedTotal = calculatedSubtotal + originalTaxes;

      // Se mudar para instalação/manutenção e não tiver data, avisa
      if ((orderType === 'instalacao' || orderType === 'manutencao') && (!installationDate || !installationTime)) {
        toast.error('Informe a data e o horário da agenda.');
        setLoading(false);
        return;
      }

      // Verifica conflito se mudou horário ou data
      if ((orderType === 'instalacao' || orderType === 'manutencao') && 
          (installationDate !== selectedOrder?.installationDate || installationTime !== selectedOrder?.installationTime)) {
          const hasConflict = await checkInstallationConflict(installationDate, installationTime);
          if (hasConflict) {
              toast.error('❌ Este horário já está ocupado na agenda.');
              setLoading(false);
              return;
          }
      }

       await updateOrder(selectedOrderId, {
         volumes: Number(volumes),
         carrier: carrier.toUpperCase(),
         items,
         subtotal: calculatedSubtotal,
         total: calculatedTotal,
         installationDate,
         installationTime,
         scheduledDate: installationDate, // Sincroniza para aparecer no calendário de produção
         orderType,
         parentOrderId: parentOrderId,
         parentOrderNumber: orders.find(o => o.id === parentOrderId)?.number
       });

       // Salva a unificação dos pedidos FILHOS
       // 1. Limpa filhos antigos que foram desmarcados
       const oldChildren = orders.filter(o => o.parentOrderId === selectedOrderId);
       for (const old of oldChildren) {
          if (!selectedChildIds.includes(old.id)) {
            await updateOrder(old.id, { parentOrderId: null, parentOrderNumber: null });
          }
       }
       // 2. Define novos filhos
       for (const childId of selectedChildIds) {
          await updateOrder(childId, { 
            parentOrderId: selectedOrderId, 
            parentOrderNumber: selectedOrder?.number 
          });
       }

      // Atualiza Agenda
      if (orderType === 'instalacao' || orderType === 'manutencao') {
          await deleteInstallationByOrder(selectedOrderId);
          await saveInstallation({
              order_id: selectedOrderId,
              seller_id: selectedOrder?.sellerId || '1',
              client_name: selectedOrder?.clientName || 'Cliente',
              date: installationDate,
              time: installationTime,
              payment_type: selectedOrder?.installationPaymentType || 'pago',
              type: orderType as any
          });
      } else if ((selectedOrder?.orderType === 'instalacao' || selectedOrder?.orderType === 'manutencao') && orderType !== 'instalacao' && orderType !== 'manutencao') {
          await deleteInstallationByOrder(selectedOrderId);
      }

      toast.success('Pedido corrigido com sucesso!');
      setSelectedOrderId(null); // Fecha edição após salvar
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar correções.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const CARRIERS = ['JADLOG', 'MOTOBOY', 'KLEYTON', 'LALAMOVE', 'RETIRADA NA LOJA'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header text-2xl font-black">Arrumar Pedido</h1>
          <p className="page-subtitle text-sm">Corrija volumes e transportadoras rapidamente</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-modern bg-muted text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SEÇÃO DE EDIÇÃO (ESQUERDA NO DESKTOP) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedOrder ? (
            <div className="card-section p-6 space-y-6 border-primary/30 shadow-xl animate-in zoom-in-95 duration-300 ring-4 ring-primary/5">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-foreground uppercase truncate max-w-[150px]">
                            {selectedOrder.number}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{selectedOrder.clientName}</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setSelectedOrderId(null); setOrderType('entrega'); }} 
                    className="text-[10px] font-black uppercase text-muted-foreground hover:text-destructive px-3 py-1 bg-muted/50 rounded-lg"
                >
                  Cancelar
                </button>
              </div>

              {/* TIPO DE PEDIDO */}
              <div className="space-y-3 pb-4 border-b">
                <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                  <Package className="w-3 h-3" /> Tipo de Pedido
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'entrega', label: 'Entrega' },
                    { id: 'instalacao', label: 'Instalação' },
                    { id: 'manutencao', label: 'Manutenção' },
                    { id: 'retirada', label: 'Retirada' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setOrderType(type.id)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        orderType === type.id 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <Package className="w-3 h-3" /> Quantidade de Volumes
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input-modern bg-white text-lg font-black h-14 border-2 focus:border-primary shadow-inner"
                    value={volumes}
                    onChange={(e) => setVolumes(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Transportadora / Entregador
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CARRIERS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarrier(c)}
                        className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                          carrier === c 
                            ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5' 
                            : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                    <input
                      type="text"
                      placeholder="Ou digite outro nome..."
                      className="input-modern mt-2 h-12 bg-white border-2"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                    />
                </div>

                {/* 🔗 SEÇÃO DE UNIFICAÇÃO SIMPLIFICADA */}
                <div className="space-y-4 pt-4 border-t bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-slate-700" />
                    <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-tight">Unificação de Envio</h4>
                  </div>
                  
                  {/* PAI */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-600">
                      O pedido <span className="text-primary">{selectedOrder.number}</span> vai ser enviado <span className="underline italic">DENTRO</span> de qual outro pedido?
                    </p>
                    
                    <div className="relative group">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${parentOrderId ? 'text-primary' : 'text-slate-400 group-focus-within:text-primary'}`} />
                      <select
                        className={`input-modern pl-11 h-12 bg-white border-2 text-xs font-black transition-all ${
                          parentOrderId ? 'border-primary ring-4 ring-primary/5 bg-primary/[0.02]' : 'border-slate-200'
                        }`}
                        value={parentOrderId || ''}
                        onChange={(e) => setParentOrderId(e.target.value || null)}
                      >
                        <option value="">Nenhum (Este pedido é o principal ou independente)</option>
                        <optgroup label="Sugestões (Mesmo Cliente)">
                          {orders
                            .filter(o => o.id !== selectedOrderId && (o.clientId === selectedOrder.clientId || o.clientName === selectedOrder.clientName))
                            .map(o => (
                              <option key={o.id} value={o.id}>{o.number} - {o.clientName}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Todos os Pedidos Ativos">
                          {orders
                            .filter(o => o.id !== selectedOrderId && o.clientId !== selectedOrder.clientId && ['aguardando_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(o.status))
                            .slice(0, 50)
                            .map(o => (
                              <option key={o.id} value={o.id}>{o.number} - {o.clientName}</option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                    {parentOrderId && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary animate-in slide-in-from-left-2">
                        <CheckCircle2 className="w-3 h-3" /> Vinculado ao pedido principal: {orders.find(o => o.id === parentOrderId)?.number}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-slate-200 my-2" />

                  {/* FILHOS */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-600">
                      Quais outros pedidos serão enviados <span className="underline italic">DENTRO</span> de <span className="text-primary">{selectedOrder.number}</span>?
                    </p>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Digite o número (ex: PED-5805)..."
                        className="input-modern pl-9 h-10 text-[10px] bg-white border-slate-200"
                        value={unifySearch}
                        onChange={(e) => setUnifySearch(e.target.value)}
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                        {possibleChildren.length > 0 ? (
                          possibleChildren.map(o => (
                            <label key={o.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                              selectedChildIds.includes(o.id) 
                                ? 'bg-primary/5 border-primary shadow-sm' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}>
                              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                selectedChildIds.includes(o.id) ? 'bg-primary text-white' : 'bg-slate-100'
                              }`}>
                                <input 
                                  type="checkbox"
                                  className="hidden"
                                  checked={selectedChildIds.includes(o.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedChildIds(prev => [...prev, o.id]);
                                    else setSelectedChildIds(prev => prev.filter(id => id !== o.id));
                                  }}
                                />
                                {selectedChildIds.includes(o.id) && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-800">{o.number}</p>
                                <p className="text-[9px] text-slate-500 truncate">{o.clientName}</p>
                              </div>
                              <StatusBadge status={o.status} />
                            </label>
                          ))
                        ) : (
                          <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight px-4">
                              {unifySearch ? 'Nenhum pedido encontrado com este número' : 'Nenhuma sugestão do mesmo cliente encontrada'}
                            </p>
                            {unifySearch && (
                              <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">Tente digitar o número completo</p>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* ITENS DO PEDIDO */}
                <div className="space-y-3 pt-4 border-t">
                  <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <Package className="w-3 h-3" /> Itens e Quantidades
                  </label>
                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground">Produto</label>
                          <select
                            className="input-modern h-10 bg-white border-2 text-xs font-bold"
                            value={item.product}
                            onChange={(e) => {
                              const selectedProd = products.find(p => p.name === e.target.value);
                              const newItems = [...items];
                              newItems[idx] = { 
                                ...newItems[idx], 
                                product: e.target.value,
                                unitPrice: selectedProd ? selectedProd.unitPrice : newItems[idx].unitPrice
                              };
                              setItems(newItems);
                            }}
                          >
                            <option value="">Selecione um produto...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Qtd</label>
                            <input
                              type="number"
                              className="input-modern h-10 bg-white border-2 text-sm font-black"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Preço Unit.</label>
                            <input
                              type="number"
                              className="input-modern h-10 bg-white border-2 text-sm font-bold"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AGENDAMENTO */}
                {(orderType === 'instalacao' || orderType === 'manutencao' || orderType === 'retirada') && (
                  <div className="space-y-4 pt-4 border-t animate-in fade-in duration-500">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Selecionar Horário na Agenda
                    </label>
                    <InstallationCalendar 
                        selectedDate={installationDate}
                        selectedTime={installationTime}
                        onSelect={(date, time) => {
                            setInstallationDate(date);
                            setInstallationTime(time);
                        }}
                    />
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary w-full h-14 justify-center font-bold text-base shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  {loading ? 'Sincronizando...' : 'Confirmar Alterações'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card-section p-12 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-3 bg-muted/10 h-[400px]">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-pulse">
                <Filter className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-muted-foreground font-bold">Nenhum pedido selecionado</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Selecione um pedido na lista ao lado</p>
              </div>
            </div>
          )}
        </div>

        {/* LISTAGEM DE PEDIDOS (DIREITA NO DESKTOP) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card-section p-5 bg-primary/5 border-primary/20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Busque por número, cliente ou vendedor..."
                className="input-modern pl-12 h-14 bg-white border-none shadow-md text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="card-section overflow-hidden shadow-xl border-border/60 bg-white/50 backdrop-blur-sm">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Últimos Pedidos
                </h2>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {filteredOrders.length} mostrados
                </span>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="modern-table border-none">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="py-4 px-4"># Pedido</th>
                    <th className="py-4 px-4">Cliente</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="text-right py-4 px-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredOrders.map((order, idx) => (
                    <tr 
                      key={order.id} 
                      className={`group transition-all duration-200 ${selectedOrderId === order.id ? 'bg-primary/10' : 'hover:bg-primary/[0.03]'}`}
                    >
                      <td className="py-4 px-4">
                        <span className="font-black text-foreground text-sm tracking-tight">{order.number}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-foreground truncate max-w-[180px]">{order.clientName}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{order.sellerName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="text-right py-4 px-4">
                        <button
                          onClick={() => handleSelectOrder(order)}
                          className={`flex items-center gap-2 ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                            selectedOrderId === order.id 
                              ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> {selectedOrderId === order.id ? 'Editando' : 'Editar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrigirPedidoPage;
