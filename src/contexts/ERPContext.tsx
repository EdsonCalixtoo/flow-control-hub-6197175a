import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import type { Order, Client, FinancialEntry, Product, OrderStatus, StatusHistoryEntry, DelayReport, ChatMessage, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup } from '@/types/erp';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  fetchOrders, fetchClients, fetchProducts, fetchFinancialEntries,
  createOrder, updateOrderStatusDb, updateOrderFields, updateOrderFull as updateOrderFullDb,
  createClient, updateClient, deleteClientDb,
  upsertProduct, deleteProductDb, createFinancialEntry, clearAllData,
  fetchOrderChat, sendChatMessage, markChatRead,
  fetchOrderReturns, createOrderReturn,
  fetchProductionErrors, createProductionError, resolveProductionError,
  fetchBarcodeScans, createBarcodeScan, fetchDeliveryPickups, createDeliveryPickup,
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
  addDeliveryPickup: (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>) => Promise<void>;
  // order ops
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => Promise<void>;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  editOrderFull: (order: Order) => Promise<void>;
  addClient: (client: Client) => void;
  editClient: (client: Client) => void;
  deleteClient: (clientId: string) => Promise<void>;
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
  
  // ── Dados em tempo real do Supabase (sem localStorage) ──────
  const [barcodeScans, setBarcodeScans] = React.useState<BarcodeScan[]>([]);
  const [deliveryPickups, setDeliveryPickups] = React.useState<DeliveryPickup[]>([]);
  const [chatMessages, setChatMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [supaLoaded, setSupaLoaded] = React.useState(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Função central de sync — sempre busca do banco e sobrescreve local
  const syncFromSupabase = useCallback(async () => {
    setLoading(true);
    try {
      const [dbOrders, dbClients, dbProducts, dbEntries, dbReturns, dbErrors, dbBarcodeScan, dbPickups] = await Promise.all([
        fetchOrders(),
        fetchClients(),
        fetchProducts(),
        fetchFinancialEntries(),
        fetchOrderReturns(),
        fetchProductionErrors(),
        fetchBarcodeScans(),
        fetchDeliveryPickups(),
      ]);
      setOrders(dbOrders);
      setClients(dbClients);
      setProducts(dbProducts);
      setFinancialEntries(dbEntries);
      setOrderReturns(dbReturns);
      setProductionErrors(dbErrors);
      setBarcodeScans(dbBarcodeScan);
      setDeliveryPickups(dbPickups);
      
      console.log('[ERP] ✅ Sincronizado com Supabase:', {
        orders: dbOrders.length,
        clients: dbClients.length,
        products: dbProducts.length,
        financialEntries: dbEntries.length,
        scans: dbBarcodeScan.length,
        pickups: dbPickups.length,
        productsDetailed: dbProducts.slice(0, 3).map(p => ({ id: p.id, name: p.name, price: p.unitPrice })),
      });
      
      // ✅ ALERTA se produtos estão vazios
      if (dbProducts.length === 0) {
        console.warn('[ERP] ⚠️ AVISO: Nenhum produto retornado do banco! Verifique RLS e dados.');
      }
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
      console.log('[ERP Realtime] Removendo subscription anterior...');
      supabase.removeChannel(realtimeChannelRef.current);
    }

    console.log('[ERP Realtime] 🔌 Conectando ao Realtime...');
    
    const channel = supabase
      .channel('erp-realtime-all', { config: { broadcast: { self: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('[ERP Realtime] 📬 Mudança em orders:', payload);
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('[ERP Realtime] 📬 Mudança em products');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        console.log('[ERP Realtime] 📬 Mudança em clients');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => {
        console.log('[ERP Realtime] 📬 Mudança em order_status_history');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, () => {
        console.log('[ERP Realtime] 📬 Mudança em financial_entries');
        syncFromSupabase();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'barcode_scans' }, () => {
        console.log('[ERP Realtime] 📬 Novo barcode scan');
        fetchBarcodeScans().then(scans => setBarcodeScans(scans)).catch(err => console.error('[ERP Realtime] Erro ao carregar barcode_scans:', err));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_pickups' }, () => {
        console.log('[ERP Realtime] 📬 Nova retirada de entregador');
        fetchDeliveryPickups().then(pickups => setDeliveryPickups(pickups)).catch(err => console.error('[ERP Realtime] Erro ao carregar delivery_pickups:', err));
      })
      .subscribe(async (status, err) => {
        if (err) {
          console.error('[ERP Realtime] ❌ ERRO ao conectar:', err);
          return;
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('[ERP Realtime] ✅ SUBSCRIBED! Pronto para receber atualizações em tempo real');
        } else if (status === 'CLOSED') {
          console.warn('[ERP Realtime] ⚠️ Conexão fechada. Reconectando em 3s...');
          setTimeout(() => {
            // Força reconexão removendo e recriando o channel
            if (realtimeChannelRef.current) {
              supabase.removeChannel(realtimeChannelRef.current);
              realtimeChannelRef.current = null;
            }
          }, 3000);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ERP Realtime] ❌ Erro no canal Realtime');
        } else {
          console.log('[ERP Realtime] Status:', status);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('[ERP Realtime] 🔌 Desconectando Realtime (cleanup)');
      supabase.removeChannel(channel);
    };
  }, [supaLoaded, syncFromSupabase]);

  // ── ORDERS ───────────────────────────────────────────────────
  const addOrder = useCallback((order: Order) => {
    // Optimistic: insere imediatamente no estado local
    setOrders(prev => [order, ...prev]);
    console.log('[ERP] ✨ Ordem criada no state local:', order.number, order.id);
    
    // Tenta salvar no banco com até 3 tentativas
    const saveToDb = async (attempts = 0): Promise<void> => {
      try {
        console.log(`[ERP] 💾 Tentativa ${attempts + 1}/3 — Salvando no banco:`, order.number);
        await createOrder(order);
        console.log('[ERP] ✅ Pedido salvo no banco com sucesso:', order.number);
        
        // Re-busca do banco para garantir consistência
        try {
          const dbOrders = await fetchOrders();
          console.log('[ERP] ✅ Pedidos re-sincronizados do banco:', dbOrders.length);
          setOrders(dbOrders);
        } catch (err) {
          console.error('[ERP] ⚠️ Aviso: Pedido salvo mas não consegui re-sincronizar:', err);
          // Não falha aqui — o pedido já foi salvo
        }
      } catch (err: any) {
        const errMsg = err?.message ?? String(err);
        const errCode = err?.code ?? '';
        
        console.error(
          `[ERP] ❌ Tentativa ${attempts + 1}/3 — ERRO ao salvar no banco:`,
          `Código: ${errCode}`,
          `Mensagem: ${errMsg}`
        );
        
        const shouldRetry = attempts < 2 && (
          errMsg.toLowerCase().includes('duplicate') ||
          errMsg.toLowerCase().includes('unique') ||
          errMsg.toLowerCase().includes('timeout') ||
          errMsg.toLowerCase().includes('network') ||
          errMsg.toLowerCase().includes('econnrefused')
        );

        if (shouldRetry) {
          console.log(`[ERP] 🔄 Erro retentável — Retrying em 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return saveToDb(attempts + 1);
        } else {
          // Erro não-retentável — remove do state e lança erro
          console.error('[ERP] ❌ Erro não-retentável após tentativa', attempts + 1);
          setOrders(prev => prev.filter(o => o.id !== order.id));
          const error = new Error(`[ERP] Falha ao criar pedido: ${errMsg}`);
          (error as any).originalError = err;
          throw error;
        }
      }
    };
    
    // Executa save de forma assíncrona (sem await — permite que o frontend continuar)
    saveToDb().catch(err => {
      console.error('[ERP] 🚨 FALHA CRÍTICA ao salvar pedido:', err?.message ?? err);
      // Notifica que houve erro (pode ser usado por toast/notificação futura)
      setOrders(prev => {
        const updated = prev.map(o => 
          o.id === order.id ? { ...o, _saveError: err?.message } : o
        );
        return updated;
      });
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
    console.log('[ERP] ✨ Cliente criado no state local:', client.name, client.id);
    
    // Tenta salvar no banco com retry
    const saveToDb = async (attempts = 0): Promise<void> => {
      try {
        console.log(`[ERP] 💾 Tentativa ${attempts + 1}/3 — Salvando cliente no banco: ${client.name}`);
        await createClient(client);
        console.log('[ERP] ✅ Cliente salvo no banco com sucesso:', client.name);
        
        // Re-busca do banco para garantir consistência
        // ✅ IMPORTANTE: isto evita que o cliente desapareça após F5
        try {
          const dbClients = await fetchClients();
          console.log('[ERP] ✅ Clientes re-sincronizados do banco:', dbClients.length, 'clientes');
          setClients(dbClients);
          
          // Valida que o novo cliente aparece
          const novoClienteSalvo = dbClients.find(c => c.id === client.id);
          if (novoClienteSalvo) {
            console.log('[ERP] ✅ VALIDAÇÃO: Novo cliente confirmado no banco:', novoClienteSalvo.name);
          } else {
            console.warn('[ERP] ⚠️ ALERTA: Novo cliente não aparece na re-sincronização!');
          }
        } catch (err) {
          console.error('[ERP] ⚠️ Aviso: Cliente salvo mas não consegui re-sincronizar:', err);
          // Não falha aqui — o cliente já foi salvo
        }
      } catch (err: any) {
        const errMsg = err?.message ?? String(err);
        console.error(
          `[ERP] ❌ Tentativa ${attempts + 1}/3 — ERRO ao salvar cliente:`,
          errMsg
        );
        
        const shouldRetry = attempts < 2;
        if (shouldRetry) {
          console.log(`[ERP] 🔄 Retrying em 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return saveToDb(attempts + 1);
        } else {
          console.error('[ERP] ❌ Falha permanente ao salvar cliente');
          // Remove do state se falhar definitivamente
          setClients(prev => prev.filter(c => c.id !== client.id));
          throw err;
        }
      }
    };

    saveToDb().catch(err => {
      console.error('[ERP] 🚨 FALHA ao salvar cliente:', err?.message ?? err);
    });
  }, [setClients]);

  const editClient = useCallback((client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    console.log('[ERP] 📝 Cliente editado no state local:', client.name);
    
    updateClient(client).then(() => {
      console.log('[ERP] ✅ Cliente atualizado no banco:', client.name);
      // Re-sincroniza para garantir consistência
      return fetchClients().then(dbClients => {
        setClients(dbClients);
        console.log('[ERP] ✅ Clientes re-sincronizados após edição');
      });
    }).catch(err => {
      console.error('[ERP] ❌ Erro ao atualizar cliente no banco:', err?.message ?? err);
      // Tenta re-sincronizar para corrigir estado
      fetchClients().then(dbClients => setClients(dbClients)).catch(() => {});
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

  const deleteClient = useCallback(async (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    console.log('[ERP] 🗑️ Cliente deletado do state local:', clientId);
    try {
      await deleteClientDb(clientId);
      console.log('[ERP] ✅ Cliente deletado do banco:', clientId);
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao deletar cliente do banco:', err?.message ?? err);
      // Re-sincroniza para restaurar o cliente em caso de erro
      const updated = await fetchClients();
      setClients(updated);
      throw err;
    }
  }, [setClients]);

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
    
    // Salva no banco de dados em background
    createBarcodeScan({
      orderId: scan.orderId,
      orderNumber: scan.orderNumber,
      scannedBy: scan.scannedBy,
      success: scan.success,
      note: scan.note,
    }).catch(err => console.error('[ERP] Erro ao salvar barcode scan no banco:', err?.message ?? err));
  }, [setBarcodeScans]);

  // ── DELIVERY PICKUPS ─────────────────────────────────────────
  const addDeliveryPickup = useCallback((pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>): Promise<void> => {
    const newPickup: DeliveryPickup = {
      ...pickup,
      id: crypto.randomUUID(),
      pickedUpAt: new Date().toISOString(),
    };
    setDeliveryPickups(prev => [newPickup, ...prev]);
    console.log('[ERP] 📦 Retirada de entregador registrada localmente:', newPickup.orderNumber);
    
    // Salva no banco de dados com foto e assinatura
    return createDeliveryPickup({
      orderId: pickup.orderId,
      orderNumber: pickup.orderNumber,
      delivererName: pickup.delivererName,
      photoUrl: pickup.photoUrl,
      signatureUrl: pickup.signatureUrl,
    }).then(() => {
      console.log('[ERP] ✅ Pickup salvo com sucesso no Supabase');
    }).catch(err => {
      console.error('[ERP] ❌ Erro ao salvar pickup no banco:', err?.message ?? err);
      // Remove do estado local se falhar
      setDeliveryPickups(prev => prev.filter(p => p.id !== newPickup.id));
      throw err;
    });
  }, []);

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
      addProduct, updateProduct, deleteProduct, deleteClient, addDelayReport, markDelayReportRead, clearAll,
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
