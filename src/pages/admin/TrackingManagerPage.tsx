import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { 
  Search, ShieldCheck, Truck, Package, 
  ArrowLeft, Save, AlertTriangle, Clock, 
  CheckCircle2, RefreshCcw, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { STATUS_LABELS, OrderStatus, WarrantyStatus } from '@/types/erp';

const TrackingManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, warranties, updateOrder, updateWarrantyStatus } = useERP();
  
  const [activeTab, setActiveTab] = useState<'pedidos' | 'garantias'>('pedidos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (activeTab === 'pedidos') {
      return orders.filter(o => 
        o.number.toLowerCase().includes(term) || 
        o.clientName.toLowerCase().includes(term)
      ).slice(0, 50);
    } else {
      return warranties.filter(w => 
        (w.orderNumber || '').toLowerCase().includes(term) || 
        w.clientName.toLowerCase().includes(term)
      ).slice(0, 50);
    }
  }, [orders, warranties, activeTab, searchTerm]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return activeTab === 'pedidos' 
      ? orders.find(o => o.id === selectedId)
      : warranties.find(w => w.id === selectedId);
  }, [selectedId, orders, warranties, activeTab]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedId || !selectedItem) return;
    
    setLoading(true);
    try {
      if (activeTab === 'pedidos') {
        await updateOrder(selectedId, { status: newStatus as OrderStatus });
      } else {
        await updateWarrantyStatus(selectedId, newStatus as WarrantyStatus, 'Alteração manual via Admin');
      }
      toast.success('Status atualizado com sucesso! O rastreio do cliente já foi atualizado.');
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestor de Rastreio</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> 
              Manipulação manual de status para clientes
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Listagem e Busca */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex gap-2">
            <button 
              onClick={() => { setActiveTab('pedidos'); setSelectedId(null); }}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pedidos' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Pedidos
            </button>
            <button 
              onClick={() => { setActiveTab('garantias'); setSelectedId(null); }}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'garantias' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              Garantias
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder={`Buscar por número ou cliente em ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 transition-all outline-none shadow-sm"
            />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Resultados Encontrados</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{filteredData.length} itens</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredData.length > 0 ? filteredData.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full p-6 text-left flex items-center justify-between hover:bg-slate-50 transition-all ${selectedId === item.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedId === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {activeTab === 'pedidos' ? <Package className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm tracking-tight">#{activeTab === 'pedidos' ? item.number : item.orderNumber}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[200px]">{item.clientName}</p>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </button>
              )) : (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold text-sm uppercase">Nenhum {activeTab} encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Edição */}
        <div className="lg:col-span-5">
          {selectedItem ? (
            <div className="sticky top-8 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-white rounded-[2.5rem] border-2 border-indigo-600 shadow-2xl shadow-indigo-600/10 overflow-hidden">
                <div className="p-8 bg-indigo-600 text-white">
                  <div className="flex items-center gap-3 mb-1">
                    <Clock className="w-4 h-4 text-indigo-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Painel de Substituição</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight uppercase">
                    {activeTab === 'pedidos' ? (selectedItem as any).number : (selectedItem as any).orderNumber}
                  </h3>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-tight mt-1 truncate">{(selectedItem as any).clientName}</p>
                </div>

                <div className="p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block px-1">Novo Status para Rastreio</label>
                    <select 
                      className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-indigo-600 outline-none transition-all cursor-pointer"
                      value={selectedItem.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={loading}
                    >
                      {activeTab === 'pedidos' ? (
                        <>
                          <optgroup label="Etapa 1: Orçamento">
                            <option value="rascunho">Rascunho / Orçamento Criado</option>
                          </optgroup>
                          <optgroup label="Etapa 2: Financeiro">
                            <option value="aguardando_financeiro">Aguardando Financeiro</option>
                          </optgroup>
                          <optgroup label="Etapa 3: Produção">
                            <option value="aprovado_financeiro">Aprovado Financeiro (Início Produção)</option>
                            <option value="aguardando_producao">Aguardando Produção</option>
                            <option value="em_producao">Em Produção Ativa</option>
                          </optgroup>
                          <optgroup label="Etapa 4: Expedição">
                            <option value="producao_finalizada">Produção Finalizada</option>
                            <option value="produto_liberado">Produto Liberado / Aguardando</option>
                          </optgroup>
                          <optgroup label="Etapa 5: Entrega">
                            <option value="retirado_entregador">Retirado pelo Entregador (Finalizado)</option>
                          </optgroup>
                          <optgroup label="Outros">
                            <option value="extraviado">Extraviado / Problema no Envio</option>
                          </optgroup>
                        </>
                      ) : (
                        <>
                          <option value="Garantia criada">Garantia criada (Aguardando)</option>
                          <option value="Garantia aprovada">Garantia aprovada (Produção agendada)</option>
                          <option value="Em produção">Em produção (Na fábrica)</option>
                          <option value="Garantia finalizada">Garantia finalizada (Enviado)</option>
                          <option value="rejeitado">Rejeitado (Assistência negada)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase text-amber-800">Ação Instantânea</p>
                      <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                        Alterar o status aqui mudará a posição do ícone no rastreio do cliente imediatamente. Use para correções rápidas quando a produção ou financeiro esquecerem de atualizar.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Status Atual</span>
                      <StatusBadge status={selectedItem.status} />
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Tipo</span>
                      <p className="text-xs font-black uppercase text-slate-900">{activeTab === 'pedidos' ? 'ERP Pedido' : 'Assistência'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-900 text-white flex items-center justify-between group cursor-help">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                       <RefreshCcw className="w-5 h-5 text-indigo-400 group-hover:rotate-180 transition-transform duration-500" />
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-tight">Realtime Ativo</p>
                       <p className="text-[10px] text-slate-400 font-medium">As mudanças propagam via WebSocket</p>
                    </div>
                 </div>
                 <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 animate-pulse">
                <Filter className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Nada Selecionado</h3>
                <p className="text-xs text-slate-400 font-medium max-w-xs mt-2">Selecione um pedido ou garantia na lista ao lado para ajustar o rastreio.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingManagerPage;
