import React, { useState, useEffect } from 'react';
import { Package, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';

interface GalvanizacaoItem {
  id: string;
  name: string;
  quantity: number;
  type: 'enviado' | 'recebido';
  date: string;
}

const ControleGalvanizacaoPage: React.FC = () => {
  const [items, setItems] = useState<GalvanizacaoItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<'enviado' | 'recebido'>('enviado');

  useEffect(() => {
    const saved = localStorage.getItem('@erp:galvanizacao');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('@erp:galvanizacao', JSON.stringify(items));
  }, [items]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity) return;

    const newItem: GalvanizacaoItem = {
      id: crypto.randomUUID(),
      name,
      quantity: Number(quantity),
      type,
      date: new Date().toISOString(),
    };

    setItems([newItem, ...items]);
    setName('');
    setQuantity('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totais = items.reduce(
    (acc, item) => {
      if (item.type === 'enviado') acc.enviado += item.quantity;
      else acc.recebido += item.quantity;
      return acc;
    },
    { enviado: 0, recebido: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Controle de Galvanização</h1>
            <p className="text-sm text-slate-500 font-medium">Gerencie o envio e recebimento de materiais</p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/10 border border-slate-100 dark:border-slate-800/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Enviado</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totais.enviado}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-black/10 border border-slate-100 dark:border-slate-800/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Recebido</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totais.recebido}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/10 border border-slate-100 dark:border-slate-800/50 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Novo Registro</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tipo de Movimentação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('enviado')}
                    className={`py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                      type === 'enviado' 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('recebido')}
                    className={`py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                      type === 'recebido' 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Receber
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item (ex: Cremalheira 1,20m)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Nome do item..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Ex: 3"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-primary text-primary-foreground font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Registrar
              </button>
            </form>
          </div>
        </div>

        {/* Lista/Histórico */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-black/10 border border-slate-100 dark:border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Histórico de Movimentações</h2>
            </div>
            
            <div className="p-0">
              {items.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <Package className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 font-medium">Nenhum registro encontrado.</p>
                  <p className="text-sm text-slate-400">Adicione um novo envio ou recebimento ao lado.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {items.map((item) => (
                    <li key={item.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.type === 'enviado' 
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}>
                          {item.type === 'enviado' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base">
                            {item.quantity}x {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                            <span className={item.type === 'enviado' ? 'text-blue-500' : 'text-emerald-500'}>
                              {item.type === 'enviado' ? 'ENVIADO' : 'RECEBIDO'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-slate-500">
                              {new Date(item.date).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remover"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControleGalvanizacaoPage;
