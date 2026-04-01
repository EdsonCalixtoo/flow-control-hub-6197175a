import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Save, Package, Truck, ArrowLeft, Edit3, Filter, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';

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
  const [loading, setLoading] = useState(false);

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

  const handleSelectOrder = (order: any) => {
    setSelectedOrderId(order.id);
    setVolumes(order.volumes || 1);
    setCarrier(order.carrier || '');
    setItems(order.items || []);
    setInstallationDate(order.installationDate || '');
    setInstallationTime(order.installationTime || '');
    // Scroll suave para o formulário no mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!selectedOrderId) return;
    
    setLoading(true);
    try {
      // Recalcular totais se houver mudança nos itens
      const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const total = subtotal; // Simplificado, sem taxas por enquanto

      await updateOrder(selectedOrderId, {
        volumes: Number(volumes),
        carrier: carrier.toUpperCase(),
        items,
        subtotal,
        total,
        installationDate,
        installationTime
      });
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
                    onClick={() => setSelectedOrderId(null)} 
                    className="text-[10px] font-black uppercase text-muted-foreground hover:text-destructive px-3 py-1 bg-muted/50 rounded-lg"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <Package className="w-3 h-3" /> Quantidade de Volumes
                  </label>
                  <p className="text-[9px] text-muted-foreground mb-1">Ajuste o número de caixas para este pedido</p>
                  <input
                    type="number"
                    min={1}
                    className="input-modern bg-white text-lg font-black h-14 border-2 focus:border-primary shadow-inner"
                    value={volumes}
                    onChange={(e) => setVolumes(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Transportadora / Entregador
                  </label>
                  <p className="text-[9px] text-muted-foreground mb-1">Selecione ou digite o responsável pela entrega</p>
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
                            {/* Caso o produto atual não esteja na lista (ex: legado ou custom), permite manter */}
                            {!products.find(p => p.name === item.product) && item.product && (
                                <option value={item.product}>{item.product} (Atual)</option>
                            )}
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

                {/* AGENDAMENTO (SE FOR INSTALAÇÃO OU MANUTENÇÃO) */}
                {(selectedOrder.orderType === 'instalacao' || selectedOrder.orderType === 'manutencao') && (
                  <div className="space-y-4 pt-4 border-t">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Agendamento de Serviço
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground">Data</label>
                        <input
                          type="date"
                          className="input-modern h-12 bg-white border-2 text-xs font-bold"
                          value={installationDate}
                          onChange={(e) => setInstallationDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground">Hora</label>
                        <input
                          type="time"
                          className="input-modern h-12 bg-white border-2 text-xs font-bold"
                          value={installationTime}
                          onChange={(e) => setInstallationTime(e.target.value)}
                        />
                      </div>
                    </div>
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
          ) : (
            <div className="card-section p-12 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-3 bg-muted/10 h-[400px]">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-pulse">
                <Filter className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-muted-foreground font-bold">Nenhum pedido selecionado</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Selecione um pedido na lista ao lado para começar a editar</p>
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
                className="input-modern pl-12 h-14 bg-white border-none shadow-md text-sm font-bold placeholder:font-medium"
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
                    <th className="py-4"># Pedido</th>
                    <th className="py-4">Cliente</th>
                    <th className="py-4">Status</th>
                    <th className="text-right py-4">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredOrders.map((order, idx) => (
                    <tr 
                      key={order.id} 
                      className={`group transition-all duration-200 ${selectedOrderId === order.id ? 'bg-primary/10' : 'hover:bg-primary/[0.03]'}`}
                      style={{ animationDelay: `${idx * 30}ms` }}
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
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-32 text-center space-y-4">
                        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
                            <Search className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <p className="text-muted-foreground font-black uppercase text-xs tracking-widest">Nenhum pedido encontrado</p>
                      </td>
                    </tr>
                  )}
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
