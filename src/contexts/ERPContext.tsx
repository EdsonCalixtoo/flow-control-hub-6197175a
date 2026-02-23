import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { Order, Client, FinancialEntry, Product, OrderStatus, StatusHistoryEntry, DelayReport, ChatMessage, OrderReturn, ProductionError } from '@/types/erp';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  fetchOrders, fetchClients, fetchProducts, fetchFinancialEntries,
  createOrder, updateOrderStatusDb, updateOrderFields, createClient, updateClient,
  upsertProduct, deleteProductDb, createFinancialEntry, clearAllData,
  fetchOrderChat, sendChatMessage, markChatRead,
  fetchOrderReturns, createOrderReturn,
  fetchProductionErrors, createProductionError, resolveProductionError,
} from '@/lib/supabaseService';

interface ERPContextType {
  orders: Order[];
  clients: Client[];
  financialEntries: FinancialEntry[];
  products: Product[];
  delayReports: DelayReport[];
  unreadDelayReports: number;
  loading: boolean;
  // chat
  chatMessages: Record<string, ChatMessage[]>;
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
  loadChat: (orderId: string) => Promise<void>;
  markChatAsRead: (orderId: string, role: string) => Promise<void>;
  getUnreadCount: (orderId: string, role: string) => number;
  // order returns
  orderReturns: OrderReturn[];
  addOrderReturn: (ret: Omit<OrderReturn, 'id' | 'createdAt'>) => Promise<void>;
  // production errors
  productionErrors: ProductionError[];
  addProductionError: (err: Omit<ProductionError, 'id' | 'createdAt'>) => Promise<void>;
  resolveError: (errorId: string) => Promise<void>;
  // order ops
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => void;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  addClient: (client: Client) => void;
  editClient: (client: Client) => void;
  addFinancialEntry: (entry: FinancialEntry) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addDelayReport: (report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>) => void;
  markDelayReportRead: (reportId: string) => void;
  clearAll: () => Promise<void>;
}

const ERPContext = createContext<ERPContextType | null>(null);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Persistência local ──────
  const [orders, setOrders] = useLocalStorage<Order[]>('erp_orders', []);
  const [clients, setClients] = useLocalStorage<Client[]>('erp_clients', []);
  const [financialEntries, setFinancialEntries] = useLocalStorage<FinancialEntry[]>('erp_financial', []);
  const [products, setProducts] = useLocalStorage<Product[]>('erp_products', []);
  const [delayReports, setDelayReports] = useLocalStorage<DelayReport[]>('erp_delay_reports', []);
  const [orderReturns, setOrderReturns] = useLocalStorage<OrderReturn[]>('erp_order_returns', []);
  const [productionErrors, setProductionErrors] = useLocalStorage<ProductionError[]>('erp_production_errors', []);
  const [chatMessages, setChatMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [supaLoaded, setSupaLoaded] = React.useState(false);

  // ── Sincroniza do Supabase uma vez ao iniciar ────────────────
  useEffect(() => {
    if (supaLoaded) return;
    const sync = async () => {
      setLoading(true);
      try {
        const [dbOrders, dbClients, dbProducts, dbEntries, dbReturns, dbErrors] = await Promise.all([
          fetchOrders(),
          fetchClients(),
          fetchProducts(),
          fetchFinancialEntries(),
          fetchOrderReturns(),
          fetchProductionErrors(),
        ]);
        if (dbOrders.length > 0) setOrders(dbOrders);
        if (dbClients.length > 0) setClients(dbClients);
        if (dbProducts.length > 0) setProducts(dbProducts);
        if (dbEntries.length > 0) setFinancialEntries(dbEntries);
        if (dbReturns.length > 0) setOrderReturns(dbReturns);
        if (dbErrors.length > 0) setProductionErrors(dbErrors);
        console.log('[ERP] Sincronizado com Supabase ✓', { orders: dbOrders.length, clients: dbClients.length, products: dbProducts.length });
      } catch (err) {
        console.warn('[ERP] Supabase indisponível, usando localStorage:', err);
      } finally {
        setLoading(false);
        setSupaLoaded(true);
      }
    };
    sync();
  }, [supaLoaded]);

  // ── ORDERS ───────────────────────────────────────────────────
  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev]);
    createOrder(order).then(() => {
      console.log('[ERP] Pedido salvo no banco:', order.number);
    }).catch(err => {
      console.error('[ERP] Erro ao salvar pedido no banco:', err?.message ?? err);
    });
  }, [setOrders]);

  const updateOrderStatus = useCallback((
    orderId: string,
    status: OrderStatus,
    extra?: Partial<Order>,
    userName?: string,
    note?: string,
  ) => {
    const now = new Date().toISOString();
    const historyEntry: StatusHistoryEntry = {
      status, timestamp: now, user: userName || 'Sistema', note,
    };

    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return { ...o, status, updatedAt: now, statusHistory: [...o.statusHistory, historyEntry], ...extra };
    }));

    // Auto-lançamento financeiro ao aprovar
    if (status === 'aprovado_financeiro') {
      setOrders(prev => {
        const order = prev.find(o => o.id === orderId);
        if (order) {
          const newEntry: FinancialEntry = {
            id: crypto.randomUUID(),
            type: 'receita',
            description: `Pagamento ${order.number} - ${order.clientName}`,
            amount: order.total,
            category: 'Vendas',
            date: now.slice(0, 10),
            status: 'pago',
          };
          setFinancialEntries(entries => {
            if (entries.some(e => e.id.startsWith(`auto-${orderId}`))) return entries;
            const updated = [newEntry, ...entries];
            createFinancialEntry(newEntry, orderId).catch(err =>
              console.error('[ERP] Erro ao criar lançamento financeiro:', err?.message ?? err)
            );
            return updated;
          });
        }
        return prev;
      });
    }

    updateOrderStatusDb(orderId, status, extra, userName, note).then(() => {
      console.log('[ERP] Status atualizado no banco:', status);
    }).catch(err => {
      console.error('[ERP] Erro ao atualizar status no banco:', err?.message ?? err);
    });
  }, [setOrders, setFinancialEntries]);

  const updateOrder = useCallback((orderId: string, fields: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields, updatedAt: new Date().toISOString() } : o));
    updateOrderFields(orderId, fields).catch(err => {
      console.error('[ERP] Erro ao atualizar pedido no banco:', err?.message ?? err);
    });
  }, [setOrders]);

  // ── CLIENTS ──────────────────────────────────────────────────
  const addClient = useCallback((client: Client) => {
    setClients(prev => [client, ...prev]);
    createClient(client).then(() => {
      console.log('[ERP] Cliente salvo no banco:', client.name);
    }).catch(err => {
      console.error('[ERP] Erro ao salvar cliente no banco:', err?.message ?? err);
    });
  }, [setClients]);

  const editClient = useCallback((client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    updateClient(client).then(() => {
      console.log('[ERP] Cliente atualizado no banco:', client.name);
    }).catch(err => {
      console.error('[ERP] Erro ao atualizar cliente no banco:', err?.message ?? err);
    });
  }, [setClients]);

  // ── FINANCIAL ENTRIES ────────────────────────────────────────
  const addFinancialEntry = useCallback((entry: FinancialEntry) => {
    setFinancialEntries(prev => {
      if (prev.some(e => e.id === entry.id)) return prev;
      return [entry, ...prev];
    });
    createFinancialEntry(entry).then(() => {
      console.log('[ERP] Lançamento financeiro salvo no banco:', entry.description);
    }).catch(err => {
      console.error('[ERP] Erro ao salvar lançamento financeiro:', err?.message ?? err);
    });
  }, [setFinancialEntries]);

  // ── PRODUCTS ─────────────────────────────────────────────────
  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [product, ...prev]);
    upsertProduct(product).then(() => {
      console.log('[ERP] Produto salvo no banco:', product.name);
    }).catch(err => {
      console.error('[ERP] Erro ao salvar produto no banco:', err?.message ?? err);
    });
  }, [setProducts]);

  const updateProduct = useCallback((product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    upsertProduct(product).then(() => {
      console.log('[ERP] Produto atualizado no banco:', product.name);
    }).catch(err => {
      console.error('[ERP] Erro ao atualizar produto no banco:', err?.message ?? err);
    });
  }, [setProducts]);

  const deleteProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    deleteProductDb(productId).then(() => {
      console.log('[ERP] Produto deletado do banco:', productId);
    }).catch(err => {
      console.error('[ERP] Erro ao deletar produto do banco:', err?.message ?? err);
    });
  }, [setProducts]);

  // ── DELAY REPORTS ────────────────────────────────────────────
  const addDelayReport = useCallback((report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>) => {
    const newReport: DelayReport = {
      ...report,
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
    };
    setDelayReports(prev => [newReport, ...prev]);
    console.log('[ERP] Relatorio de atraso enviado ao gestor:', newReport.orderNumber);
  }, [setDelayReports]);

  const markDelayReportRead = useCallback((reportId: string) => {
    setDelayReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, readAt: new Date().toISOString() } : r
    ));
  }, [setDelayReports]);

  const unreadDelayReports = delayReports.filter(r => !r.readAt).length;

  // ── CHAT ─────────────────────────────────────────────────────
  const loadChat = useCallback(async (orderId: string) => {
    const msgs = await fetchOrderChat(orderId);
    setChatMessages(prev => ({ ...prev, [orderId]: msgs }));
  }, []);

  const sendMessage = useCallback(async (msg: Omit<ChatMessage, 'id' | 'createdAt' | 'readBy'>) => {
    // Optimistic update
    const tempMsg: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      readBy: [msg.senderRole],
    };
    setChatMessages(prev => ({
      ...prev,
      [msg.orderId]: [...(prev[msg.orderId] ?? []), tempMsg],
    }));

    const saved = await sendChatMessage(msg);
    if (saved) {
      setChatMessages(prev => ({
        ...prev,
        [msg.orderId]: (prev[msg.orderId] ?? []).map(m => m.id === tempMsg.id ? saved : m),
      }));
    }
  }, []);

  const markChatAsRead = useCallback(async (orderId: string, role: string) => {
    await markChatRead(orderId, role);
    setChatMessages(prev => ({
      ...prev,
      [orderId]: (prev[orderId] ?? []).map(m =>
        m.readBy.includes(role) ? m : { ...m, readBy: [...m.readBy, role] }
      ),
    }));
  }, []);

  const getUnreadCount = useCallback((orderId: string, role: string) => {
    return (chatMessages[orderId] ?? []).filter(m => !m.readBy.includes(role)).length;
  }, [chatMessages]);

  // ── ORDER RETURNS ─────────────────────────────────────────────
  const addOrderReturn = useCallback(async (ret: Omit<OrderReturn, 'id' | 'createdAt'>) => {
    const newRet: OrderReturn = { ...ret, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setOrderReturns(prev => [newRet, ...prev]);
    await createOrderReturn(ret).catch(err => console.error('[ERP] Erro ao criar devolução:', err?.message ?? err));
  }, [setOrderReturns]);

  // ── PRODUCTION ERRORS ─────────────────────────────────────────
  const addProductionError = useCallback(async (err: Omit<ProductionError, 'id' | 'createdAt'>) => {
    const newErr: ProductionError = { ...err, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setProductionErrors(prev => [newErr, ...prev]);
    await createProductionError(err).catch(e => console.error('[ERP] Erro ao criar erro de produção:', e?.message ?? e));
  }, [setProductionErrors]);

  const resolveError = useCallback(async (errorId: string) => {
    setProductionErrors(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true, resolvedAt: new Date().toISOString() } : e));
    await resolveProductionError(errorId).catch(err => console.error('[ERP] Erro ao resolver erro:', err?.message ?? err));
  }, [setProductionErrors]);

  // ── CLEAR ALL ────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    const keys = ['erp_orders', 'erp_clients', 'erp_financial', 'erp_products', 'erp_delay_reports', 'erp_order_returns', 'erp_production_errors'];
    keys.forEach(k => localStorage.removeItem(k));
    setOrders([]);
    setClients([]);
    setFinancialEntries([]);
    setProducts([]);
    setDelayReports([]);
    setOrderReturns([]);
    setProductionErrors([]);
    setChatMessages({});
    try {
      await clearAllData();
      console.log('[ERP] Todos os dados removidos do banco.');
    } catch (err) {
      console.error('[ERP] Erro ao limpar banco:', err);
    }
  }, [setOrders, setClients, setFinancialEntries, setProducts, setDelayReports, setOrderReturns, setProductionErrors]);

  return (
    <ERPContext.Provider value={{
      orders, clients, financialEntries, products, delayReports, unreadDelayReports, loading,
      chatMessages, sendMessage, loadChat, markChatAsRead, getUnreadCount,
      orderReturns, addOrderReturn,
      productionErrors, addProductionError, resolveError,
      addOrder, updateOrderStatus, updateOrder,
      addClient, editClient, addFinancialEntry,
      addProduct, updateProduct, deleteProduct, addDelayReport, markDelayReportRead, clearAll,
    }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be used within ERPProvider');
  return ctx;
};
