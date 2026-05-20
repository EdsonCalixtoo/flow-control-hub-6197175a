import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Calendar, CheckCircle2, ArrowRight, Truck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getGalvanizacaoLogs, 
  createGalvanizacaoLog, 
  updateGalvanizacaoLog,
  deleteGalvanizacaoLog,
  GalvanizacaoLog 
} from '@/lib/galvanizacaoServiceSupabase';
import { useERP } from '@/contexts/ERPContext';

const GalvanizacaoControlePage: React.FC = () => {
  const { products } = useERP();
  const [logs, setLogs] = useState<GalvanizacaoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for new entry
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'envio' | 'recebimento'>('envio');

  // States for receive modal
  const [receivingLog, setReceivingLog] = useState<GalvanizacaoLog | null>(null);
  const [receiveQty, setReceiveQty] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await getGalvanizacaoLogs();
      setLogs(data);
    } catch (err) {
      toast.error('Erro ao carregar registros. O banco de dados foi configurado?');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newQuantity) {
      toast.error('Preencha o nome do item e a quantidade enviada.');
      return;
    }

    setSubmitting(true);
    try {
      const isEnvio = actionType === 'envio';
      const novo = await createGalvanizacaoLog({
        item_name: newItemName,
        quantity_sent: isEnvio ? parseInt(newQuantity, 10) : 0,
        quantity_received: isEnvio ? 0 : parseInt(newQuantity, 10),
        status: isEnvio ? 'pendente' : 'recebido_total',
        sent_date: new Date().toISOString(),
        received_date: isEnvio ? null : new Date().toISOString(),
        notes: newNotes || null,
      });
      setLogs([novo, ...logs]);
      toast.success(isEnvio ? 'Envio registrado com sucesso!' : 'Recebimento avulso registrado!');
      setNewItemName('');
      setNewQuantity('');
      setNewNotes('');
    } catch (err) {
      toast.error('Erro ao registrar envio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = (log: GalvanizacaoLog) => {
    setReceivingLog(log);
    setReceiveQty(`${log.quantity_sent - log.quantity_received}`);
  };

  const confirmReceive = async () => {
    if (!receivingLog) return;
    
    const qtyStr = receiveQty;
    if (!qtyStr) return;
    
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantidade inválida.');
      return;
    }

    const newReceived = receivingLog.quantity_received + qty;
    let newStatus = receivingLog.status;
    let receivedDate = receivingLog.received_date;

    if (newReceived >= receivingLog.quantity_sent) {
      newStatus = 'recebido_total';
      receivedDate = new Date().toISOString();
    } else {
      newStatus = 'recebido_parcial';
    }

    try {
      const updated = await updateGalvanizacaoLog(receivingLog.id, {
        quantity_received: newReceived,
        status: newStatus,
        received_date: receivedDate
      });
      
      setLogs(logs.map(l => l.id === receivingLog.id ? updated : l));
      toast.success('Recebimento atualizado!');
      setReceivingLog(null);
    } catch (err) {
      toast.error('Erro ao atualizar recebimento.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este registro permanentemente?')) return;
    try {
      await deleteGalvanizacaoLog(id);
      setLogs(logs.filter(l => l.id !== id));
      toast.success('Registro apagado.');
    } catch (err) {
      toast.error('Erro ao apagar registro.');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header text-2xl font-black flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Controle de Galvanização
          </h1>
          <p className="page-subtitle text-sm">Gerencie peças enviadas e recebidas da galvanização</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Formulário de Envio */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card-section p-6 border-t-4 border-t-primary shadow-xl ring-1 ring-primary/5">
            
            <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
              <button 
                type="button"
                onClick={() => setActionType('envio')}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${actionType === 'envio' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              >
                Registrar Envio
              </button>
              <button 
                type="button"
                onClick={() => setActionType('recebimento')}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${actionType === 'recebimento' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              >
                Chegada Direta
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Peça / Material</label>
                <input 
                  type="text"
                  list="produtos-galvanizacao"
                  placeholder="Selecione na lista ou digite a peça..."
                  className="input-modern bg-white w-full border-2"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  required
                />
                <datalist id="produtos-galvanizacao">
                  {products.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  {actionType === 'envio' ? 'Qtd Enviada' : 'Qtd Recebida'}
                </label>
                <input 
                  type="number"
                  min="1"
                  placeholder="Ex: 30"
                  className="input-modern bg-white w-full border-2"
                  value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Observações (Opcional)</label>
                <textarea 
                  placeholder="Detalhes adicionais..."
                  className="input-modern bg-white w-full border-2 min-h-[80px] py-2"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className={`w-full h-12 mt-2 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center ${actionType === 'envio' ? 'bg-primary hover:bg-primary/90' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {submitting ? 'Registrando...' : actionType === 'envio' ? 'Registrar Envio' : 'Registrar Chegada'} <Plus className="w-4 h-4 ml-2" />
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card-section p-4">
             <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar peças enviadas..."
                className="input-modern pl-10 h-12 bg-white/50 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse font-bold text-sm">Carregando registros...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="card-section p-12 text-center flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-bold">Nenhum registro encontrado</p>
              </div>
            ) : (
              filteredLogs.map(log => {
                const pendentes = log.quantity_sent - log.quantity_received;
                const isComplete = log.status === 'recebido_total';

                return (
                  <div key={log.id} className={`card-section p-5 transition-all ${isComplete ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white hover:border-primary/30'}`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-sm uppercase">{log.item_name}</h4>
                          {isComplete ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Concluído
                            </span>
                          ) : log.status === 'recebido_parcial' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase">
                              Recebido Parcial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[9px] font-black uppercase">
                              Aguardando
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Enviado: {new Date(log.sent_date).toLocaleDateString('pt-BR')}
                          </div>
                          {isComplete && log.received_date && (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <Calendar className="w-3 h-3" />
                              Chegou: {new Date(log.received_date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                        {log.notes && <p className="text-xs text-muted-foreground mt-2 italic">Obs: {log.notes}</p>}
                      </div>

                      <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Enviado</p>
                          <p className="text-lg font-black text-slate-700">{log.quantity_sent}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Recebido</p>
                          <p className={`text-lg font-black ${isComplete ? 'text-emerald-600' : 'text-primary'}`}>
                            {log.quantity_received}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[120px]">
                        {!isComplete && (
                          <button 
                            onClick={() => handleReceive(log)}
                            className="btn-modern bg-primary/10 text-primary hover:bg-primary hover:text-white font-black text-[10px] uppercase py-2"
                          >
                            Registrar Chegada
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors text-center"
                        >
                          Apagar
                        </button>
                      </div>

                    </div>
                    
                    {!isComplete && pendentes > 0 && (
                      <div className="mt-3 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg inline-block">
                        Faltam chegar: {pendentes} unidades
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal de Recebimento */}
      {receivingLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="font-black text-lg mb-2">Registrar Chegada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Quantos itens <strong>{receivingLog.item_name}</strong> chegaram da galvanização?
              <br />
              <span className="text-amber-600 text-xs font-bold">Faltam chegar: {receivingLog.quantity_sent - receivingLog.quantity_received}</span>
            </p>
            
            <input 
              type="number"
              className="input-modern bg-slate-50 w-full mb-6 text-center text-xl font-black h-14 border-2 focus:border-primary"
              value={receiveQty}
              onChange={e => setReceiveQty(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2">
              <button 
                onClick={() => setReceivingLog(null)}
                className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmReceive}
                className="flex-1 h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:bg-primary/90 transition-colors text-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalvanizacaoControlePage;
