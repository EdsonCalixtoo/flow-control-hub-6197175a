import React, { useState, useMemo } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText, User, Calendar, Truck } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RelatoriosProducaoPage: React.FC = () => {
    const { orders, loading } = useERP();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    const filteredOrders = useMemo(() => {
        if (!search.trim()) return orders;
        const s = search.toLowerCase();
        return orders.filter(o => 
            (o.number || '').toLowerCase().includes(s) || 
            (o.clientName || '').toLowerCase().includes(s) ||
            (o.carrier || '').toLowerCase().includes(s)
        );
    }, [orders, search]);

    // Reset pagination when searching
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOrders, currentPage]);

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Relatórios de Produção</h1>
                    <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Listagem completa de pedidos e acesso aos dossiês.</p>
                </div>
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por pedido, cliente ou transportadora..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando relatórios...</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Todos os Pedidos</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{filteredOrders.length} encontrados</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <th className="px-6 py-4">Pedido</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Transportadora</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {paginatedOrders.map(order => (
                                    <tr 
                                        key={order.id} 
                                        className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-black text-slate-900">{order.number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-bold text-slate-700 truncate max-w-[200px]">{order.clientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500 font-semibold">
                                                <Calendar className="w-4 h-4" />
                                                {format(new Date(order.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase bg-slate-100 px-2.5 py-1 rounded-md w-max">
                                                <Truck className="w-3.5 h-3.5" />
                                                {order.carrier || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/dossie/${order.number}`)}
                                                className="px-4 py-2 bg-slate-900 text-white hover:bg-primary hover:text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                Ver Dossiê
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredOrders.length === 0 && (
                            <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                                Nenhum pedido encontrado.
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelatoriosProducaoPage;
