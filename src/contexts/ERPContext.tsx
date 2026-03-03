import React, { createContext, useContext, useCallback } from 'react';
import type { Order, Client, FinancialEntry, Product, OrderStatus, StatusHistoryEntry, DelayReport, ChatMessage, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup } from '@/types/erp';
import { useLocalStorage } from '@/hooks/useLocalStorage';

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
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => Promise<void>;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  editOrderFull: (order: Order) => Promise<void>;
  addClient: (client: Client) => Promise<void>;
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
  const [barcodeScans, setBarcodeScans] = React.useState<BarcodeScan[]>([]);
  const [deliveryPickups, setDeliveryPickups] = React.useState<DeliveryPickup[]>([]);
  const [chatMessages, setChatMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = React.useState(false);

  // ── ORDERS ───────────────────────────────────────────────────
  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev]);
    console.log('[ERP] ✨ Ordem criada:', order.number, order.id);
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

    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        return { ...o, status, updatedAt: now, statusHistory: [...o.statusHistory, historyEntry], ...extra };
      })
    );
    console.log('[ERP] Status atualizado:', status);
  }, [setOrders]);

  const updateOrder = useCallback((orderId: string, fields: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...fields, updatedAt: new Date().toISOString() } : o));
  }, [setOrders]);

  const editOrderFull = useCallback(async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...order, updatedAt: new Date().toISOString() } : o));
  }, [setOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    console.log('[ERP] ✅ Pedido deletado:', orderId);
  }, [setOrders]);

  // ── CLIENTS ──────────────────────────────────────────────────
  const addClient = useCallback(async (client: Client): Promise<void> => {
    setClients(prev => [client, ...prev]);
    console.log('[ERP] ✨ Cliente criado:', client.name, client.id);
  }, [setClients]);

  const editClient = useCallback((client: Client) => {
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
    console.log('[ERP] 📝 Cliente editado:', client.name);
  }, [setClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    console.log('[ERP] 🗑️ Cliente deletado:', clientId);
  }, [setClients]);

  // ── FINANCIAL ENTRIES ────────────────────────────────────────
  const addFinancialEntry = useCallback((entry: FinancialEntry) => {
    setFinancialEntries(prev => {
      if (prev.some(e => e.id === entry.id)) return prev;
      return [entry, ...prev];
    });
    console.log('[ERP] Lançamento financeiro criado:', entry.description);
  }, [setFinancialEntries]);

  // ── PRODUCTS ─────────────────────────────────────────────────
  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [product, ...prev]);
    console.log('[ERP] Produto criado:', product.name);
  }, [setProducts]);

  const updateProduct = useCallback((product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    console.log('[ERP] Produto atualizado:', product.name);
  }, [setProducts]);

  const deleteProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    console.log('[ERP] Produto deletado:', productId);
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
    console.log('[ERP] Relatório de atraso criado:', newReport.orderNumber);
  }, [setDelayReports]);

  const markDelayReportRead = useCallback((reportId: string) => {
    setDelayReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, readAt: new Date().toISOString() } : r
    ));
  }, [setDelayReports]);

  const unreadDelayReports = delayReports.filter(r => !r.readAt).length;

  // ── CHAT ─────────────────────────────────────────────────────
  const loadChat = useCallback(async (orderId: string) => {
    // Placeholder - sem backend
    setChatMessages(prev => ({ ...prev, [orderId]: [] }));
  }, []);

  const sendMessage = useCallback(async (msg: Omit<ChatMessage, 'id' | 'createdAt' | 'readBy'>) => {
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
  }, []);

  const markChatAsRead = useCallback(async (orderId: string, role: string) => {
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
    console.log('[ERP] Devolução criada');
  }, [setOrderReturns]);

  // ── PRODUCTION ERRORS ─────────────────────────────────────────
  const addProductionError = useCallback(async (err: Omit<ProductionError, 'id' | 'createdAt'>) => {
    const newErr: ProductionError = { ...err, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setProductionErrors(prev => [newErr, ...prev]);
    console.log('[ERP] Erro de produção criado');
  }, [setProductionErrors]);

  const resolveError = useCallback(async (errorId: string) => {
    setProductionErrors(prev => prev.map(e => e.id === errorId ? { ...e, resolved: true, resolvedAt: new Date().toISOString() } : e));
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
  const addDeliveryPickup = useCallback((pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>): Promise<void> => {
    const newPickup: DeliveryPickup = {
      ...pickup,
      id: crypto.randomUUID(),
      pickedUpAt: new Date().toISOString(),
    };
    setDeliveryPickups(prev => [newPickup, ...prev]);
    console.log('[ERP] 📦 Retirada de entregador registrada:', newPickup.orderNumber);
    return Promise.resolve();
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
    console.log('[ERP] Todos os dados locais foram removidos.');
  }, [setOrders, setClients, setFinancialEntries, setProducts, setDelayReports, setOrderReturns, setProductionErrors, setBarcodeScans, setDeliveryPickups]);

  return (
    <ERPContext.Provider value={{
      orders, clients, financialEntries, products, delayReports, unreadDelayReports, loading,
      chatMessages, sendMessage, loadChat, markChatAsRead, getUnreadCount,
      orderReturns, addOrderReturn,
      productionErrors, addProductionError, resolveError,
      barcodeScans, addBarcodeScan,
      deliveryPickups, addDeliveryPickup,
      addOrder, deleteOrder, updateOrderStatus, updateOrder, editOrderFull,
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
