import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import type { Order, Client, FinancialEntry, Product, OrderStatus, StatusHistoryEntry, DelayReport, ChatMessage, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup } from '@/types/erp';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  fetchOrders, fetchClients, fetchProducts, fetchFinancialEntries,
  createOrder, updateOrderStatusDb, updateOrderFields, updateOrderFull as updateOrderFullDb,
  createClient, updateClient,
  upsertProduct, deleteProductDb, createFinancialEntry, clearAllData,
  fetchOrderChat, sendChatMessage, markChatRead,
  fetchOrderReturns, createOrderReturn,
  fetchProductionErrors, createProductionError, resolveProductionError,
} from '@/lib/supabaseService';
import { supabase } from '@/lib/supabase';

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
  // barcode scans
  barcodeScans: BarcodeScan[];
  addBarcodeScan: (scan: Omit<BarcodeScan, 'id' | 'scannedAt'>) => void;
  // delivery pickups
  deliveryPickups: DeliveryPickup[];
  addDeliveryPickup: (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>) => void;
  // order ops
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => Promise<void>;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  editOrderFull: (order: Order) => Promise<void>;
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
  const [barcodeScans, setBarcodeScans] = useLocalStorage<BarcodeScan[]>('erp_barcode_scans', []);
  const [deliveryPickups, setDeliveryPickups] = useLocalStorage<DeliveryPickup[]>('erp_delivery_pickups', []);
  const [chatMessages, setChatMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [supaLoaded, setSupaLoaded] = React.useState(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Função central de sync — sempre busca do banco e sobrescreve local
  const syncFromSupabase = useCallback(async () => {
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
      setOrders(dbOrders);
      setClients(dbClients);
      setProducts(dbProducts);
      setFinancialEntries(dbEntries);
      setOrderReturns(dbReturns);
      setProductionErrors(dbErrors);
      console.log('[ERP] Sincronizado com Supabase ✓', { orders: dbOrders.length, clients: dbClients.length, products: dbProducts.length });
    } catch (err: any) {
      const errMsg = err?.message || JSON.stringify(err);
      
      // Se for erro de autenticação (token inválido), força logout
      if (
        errMsg?.includes('Refresh Token') ||
        errMsg?.includes('Invalid Refresh Token') ||
        errMsg?.includes('JWT') ||
        errMsg?.includes('401') ||
        errMsg?.includes('403')
      ) {
        console.error('[ERP] Erro de autenticação detectado — fazendo logout...', err);
        await supabase.auth.signOut().catch(e => console.warn('Erro ao fazer logout:', e));
        return; // Não tenta usar localStorage, sai completamente
      }

      console.warn('[ERP] Supabase indisponível, usando localStorage:', err);
    } finally {
      setLoading(false);
    }
  }, [setOrders, setClients, setProducts, setFinancialEntries, setOrderReturns, setProductionErrors]);

  // ── Sincroniza ao iniciar — aguarda sessão de auth (RLS requer autenticação) ──
  useEffect(() => {
    if (supaLoaded) return;

    const trySync = async () => {
      try {
        // Verifica se há sessão ativa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('[ERP] Erro ao obter sessão:', sessionError);
          // Se houver erro de token, força logout limpo
          await supabase.auth.signOut();
          setOrders([]);
          setClients([]);
          setProducts([]);
          setFinancialEntries([]);
          setSupaLoaded(true);
          return;
        }

        if (session?.user) {
          console.log('[ERP] Sessão validada — sincronizando com Supabase...');
          await syncFromSupabase();
        } else {
          console.log('[ERP] Sem sessão ativa — aguardando login...');
        }
      } catch (err) {
        console.error('[ERP] Erro ao sincronizar na inicialização:', err);
      } finally {
        // Marca como carregado mesmo sem sessão (interface fica pronta, mas vazia)
        setSupaLoaded(true);
      }
    };

    trySync();

    // Re-sincroniza quando o usuário faz login (qualquer dispositivo)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        console.log('[ERP] Auth detectada — sincronizando com Supabase...');
        try {
          await syncFromSupabase();
        } catch (err) {
          console.error('[ERP] Erro ao sincronizar após login:', err);
        }
        setSupaLoaded(true);
      }
      if (event === 'SIGNED_OUT') {
        console.log('[ERP] Logout detectado — limpando dados...');
        // Limpa estado local ao fazer logout
        setOrders([]);
        setClients([]);
        setProducts([]);
        setFinancialEntries([]);
        setOrderReturns([]);
        setProductionErrors([]);
        setSupaLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supaLoaded, syncFromSupabase, setOrders, setClients, setProducts, setFinancialEntries, setOrderReturns, setProductionErrors]);

  // ── Realtime subscription para pedidos, produtos e clientes ─────────────
  // Quando qualquer dado mudar no banco, TODOS os dispositivos são notificados
  useEffect(() => {
    if (!supaLoaded) return;
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel('erp-realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        console.log('[ERP Realtime] Mudança em orders — re-sincronizando...');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('[ERP Realtime] Mudança em products — re-sincronizando...');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        console.log('[ERP Realtime] Mudança em clients — re-sincronizando...');
        syncFromSupabase();
      })
      .subscribe((status) => {
        console.log('[ERP Realtime] Status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supaLoaded, syncFromSupabase]);

  // ── ORDERS ───────────────────────────────────────────────────
  const addOrder = useCallback((order: Order) => {
    // Optimistic: insere imediatamente no estado local
    setOrders(prev => [order, ...prev]);
    createOrder(order).then(async () => {
      console.log('[ERP] Pedido salvo no banco:', order.number);
      // Re-busca do banco para garantir consistência (ex: outros campos gerados pelo DB)
      try {
        const dbOrders = await fetchOrders();
        setOrders(dbOrders);
      } catch { }
    }).catch(err => {
      console.error('[ERP] Erro ao salvar pedido no banco:', err?.message ?? err);
    });
  }, [setOrders]);

  const updateOrderStatus = useCallback(async (
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

    // Salva o estado anterior para rollback em caso de erro
    let previousOrders: Order[] = [];
    setOrders(prev => {
      previousOrders = prev;
      return prev.map(o => {
        if (o.id !== orderId) return o;
        return { ...o, status, updatedAt: now, statusHistory: [...o.statusHistory, historyEntry], ...extra };
      });
    });

    try {
      await updateOrderStatusDb(orderId, status, extra, userName, note);
      console.log('[ERP] Status atualizado no banco:', status);
      // Re-busca do banco para garantir consistência em todos os dispositivos
      try {
        const dbOrders = await fetchOrders();
        setOrders(dbOrders);
      } catch { /* não crítico, estado já foi atualizado */ }
    } catch (err) {
      console.error('[ERP] Erro ao atualizar status no banco — revertendo:', err);
      // Rollback: restaura o estado anterior
      setOrders(previousOrders);
      // Tenta re-sincronizar do banco para garantir estado correto
      try {
        const dbOrders = await fetchOrders();
        setOrders(dbOrders);
      } catch { /* usa o rollback local */ }
      throw err;
    }
  }, [setOrders]);

  const updateOrder = useCallback((orderId: string, fields: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields, updatedAt: new Date().toISOString() } : o));
    updateOrderFields(orderId, fields).catch(err => {
      console.error('[ERP] Erro ao atualizar pedido no banco:', err?.message ?? err);
    });
  }, [setOrders]);

  // Edição completa de orçamento (substitui itens, atualiza campos)
  const editOrderFull = useCallback(async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...order, updatedAt: new Date().toISOString() } : o));
    await updateOrderFullDb(order).catch(err => {
      console.error('[ERP] Erro ao editar orçamento no banco:', err?.message ?? err);
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

  // ── BARCODE SCANS ────────────────────────────────────────────
  const addBarcodeScan = useCallback((scan: Omit<BarcodeScan, 'id' | 'scannedAt'>) => {
    const newScan: BarcodeScan = {
      ...scan,
      id: crypto.randomUUID(),
      scannedAt: new Date().toISOString(),
    };
    setBarcodeScans(prev => [newScan, ...prev]);
    console.log('[ERP] Leitura de código de barras registrada:', newScan.orderNumber);
  }, [setBarcodeScans]);

  // ── DELIVERY PICKUPS ─────────────────────────────────────────
  const addDeliveryPickup = useCallback((pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>) => {
    const newPickup: DeliveryPickup = {
      ...pickup,
      id: crypto.randomUUID(),
      pickedUpAt: new Date().toISOString(),
    };
    setDeliveryPickups(prev => [newPickup, ...prev]);
    console.log('[ERP] Retirada de entregador registrada:', newPickup.orderNumber);
  }, [setDeliveryPickups]);

  // ── CLEAR ALL ────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    const keys = ['erp_orders', 'erp_clients', 'erp_financial', 'erp_products', 'erp_delay_reports', 'erp_order_returns', 'erp_production_errors', 'erp_barcode_scans', 'erp_delivery_pickups'];
    keys.forEach(k => localStorage.removeItem(k));
    setOrders([]);
    setClients([]);
    setFinancialEntries([]);
    setProducts([]);
    setDelayReports([]);
    setOrderReturns([]);
    setProductionErrors([]);
    setBarcodeScans([]);
    setDeliveryPickups([]);
    setChatMessages({});
    try {
      await clearAllData();
      console.log('[ERP] Todos os dados removidos do banco.');
    } catch (err) {
      console.error('[ERP] Erro ao limpar banco:', err);
    }
  }, [setOrders, setClients, setFinancialEntries, setProducts, setDelayReports, setOrderReturns, setProductionErrors, setBarcodeScans, setDeliveryPickups]);

  return (
    <ERPContext.Provider value={{
      orders, clients, financialEntries, products, delayReports, unreadDelayReports, loading,
      chatMessages, sendMessage, loadChat, markChatAsRead, getUnreadCount,
      orderReturns, addOrderReturn,
      productionErrors, addProductionError, resolveError,
      barcodeScans, addBarcodeScan,
      deliveryPickups, addDeliveryPickup,
      addOrder, updateOrderStatus, updateOrder, editOrderFull,
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
