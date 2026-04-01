import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import type { Order, Client, FinancialEntry, Product, OrderStatus, StatusHistoryEntry, DelayReport, ChatMessage, OrderReturn, ProductionError, BarcodeScan, DeliveryPickup, Warranty } from '@/types/erp';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { fetchClients, createClient as createClientSupabase, updateClient as updateClientSupabase, deleteClient as deleteClientSupabase } from '@/lib/clientServiceSupabase';
import { fetchProducts, createProduct as createProductSupabase, updateProductSupabase, deleteProductSupabase } from '@/lib/productServiceSupabase';
import { fetchOrders, fetchOrderById, createOrderSupabase, updateOrderSupabase, deleteOrderSupabase, supabaseToOrder } from '@/lib/orderServiceSupabase';
import {
  fetchFinancialEntries, fetchFinancialEntriesByOrderId, createFinancialEntrySupabase, updateFinancialEntrySupabase,
  fetchDelayReports, createDelayReportSupabase, markDelayReportReadSupabase,
  fetchOrderReturns, createOrderReturnSupabase,
  fetchProductionErrors, createProductionErrorSupabase, resolveProductionErrorSupabase,
  fetchBarcodeScans, createBarcodeScanSupabase,
  fetchDeliveryPickups, createDeliveryPickupSupabase
} from '@/lib/gestorServiceSupabase';
import { fetchWarranties, createWarranty as createWarrantySupabase, updateWarranty as updateWarrantySupabase } from '@/lib/warrantyServiceSupabase';
import { fetchMonthlyClosings, createMonthlyClosing } from '@/lib/fechamentoServiceSupabase';

import type { MonthlyClosing } from '@/types/erp';

interface ERPContextType {
  orders: Order[];
  clients: Client[];
  financialEntries: FinancialEntry[];
  products: Product[];
  delayReports: DelayReport[];
  unreadDelayReports: number;
  overduePaymentsCount: number;
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
  resolveOrderReturn: (returnId: string) => Promise<void>;
  // barcode scans
  barcodeScans: BarcodeScan[];
  addBarcodeScan: (scan: Omit<BarcodeScan, 'id' | 'scannedAt'>) => Promise<void>;
  // delivery pickups
  deliveryPickups: DeliveryPickup[];
  addDeliveryPickup: (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>) => Promise<void>;
  // warrantries
  warranties: Warranty[];
  addWarranty: (warranty: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  updateWarrantyStatus: (id: string, status: Warranty['status'], resolution?: string, userName?: string, note?: string) => Promise<void>;
  editWarranty: (id: string, updates: Partial<Warranty>) => Promise<void>;
  // order ops
  addOrder: (order: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => Promise<void>;
  updateOrder: (orderId: string, fields: Partial<Order>) => void;
  editOrderFull: (order: Order) => Promise<void>;
  addClient: (client: Client) => Promise<void>;
  editClient: (client: Client) => void;
  deleteClient: (clientId: string) => Promise<void>;
  addFinancialEntry: (entry: FinancialEntry) => void;
  updateFinancialEntry: (id: string, fields: Partial<FinancialEntry>) => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addDelayReport: (report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>) => void;
  markDelayReportRead: (reportId: string) => void;
  clearAll: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  loadOrderDetails: (orderId: string) => Promise<Order | null>;
  // monthly closings
  monthlyClosings: MonthlyClosing[];
  closeMonth: (closing: Omit<MonthlyClosing, 'id' | 'createdAt'>) => Promise<void>;
}

const ERPContext = createContext<ERPContextType | null>(null);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // ── Persistência local (Somente para itens não críticos ou ainda não migrados) ──────
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [financialEntries, setFinancialEntries] = React.useState<FinancialEntry[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [delayReports, setDelayReports] = React.useState<DelayReport[]>([]);
  const [orderReturns, setOrderReturns] = React.useState<OrderReturn[]>([]);
  const [productionErrors, setProductionErrors] = React.useState<ProductionError[]>([]);
  const [barcodeScans, setBarcodeScans] = React.useState<BarcodeScan[]>([]);
  const [deliveryPickups, setDeliveryPickups] = React.useState<DeliveryPickup[]>([]);
  const [warranties, setWarranties] = React.useState<Warranty[]>([]);
  const [chatMessages, setChatMessages] = React.useState<Record<string, ChatMessage[]>>({});
  const [monthlyClosings, setMonthlyClosings] = React.useState<MonthlyClosing[]>([]);
  const loadingRef = React.useRef(false);
  const [loading, setLoading] = React.useState(false);

  // ── Carregar DADOS do Supabase quando autenticado ──────────
  const loadFromSupabase = useCallback(async () => {
    if (!isAuthenticated || loadingRef.current) return;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      loadingRef.current = true;
      setLoading(true);
      console.log('[ERP] 📥 Sincronizando com Supabase (em batches)...');

      // Batch 1: Dados essenciais — executados individualmente para garantir resiliência
      try {
        const supabaseClients = await fetchClients();
        setClients(supabaseClients);
        console.log('[ERP] ✅ Clientes carregados');
      } catch (e: any) { console.warn('[ERP] ⚠️ Erro Clientes:', e.message); }

      try {
        const supabaseProducts = await fetchProducts();
        setProducts(supabaseProducts);
        console.log('[ERP] ✅ Produtos carregados');
      } catch (e: any) { console.warn('[ERP] ⚠️ Erro Produtos:', e.message); }

      try {
        const supabaseOrders = await fetchOrders();
        setOrders(supabaseOrders);
        console.log('[ERP] ✅ Pedidos carregados');
      } catch (e: any) { console.warn('[ERP] ⚠️ Erro Pedidos:', e.message); }

      console.log('[ERP] ✅ Batch 1 concluído');

      await delay(300);

      // Batch 2: Financeiro e atrasos
      const [supabaseFinancial, supabaseDelays, supabaseWarranties] = await Promise.all([
        fetchFinancialEntries(),
        fetchDelayReports(),
        fetchWarranties(),
      ]);
      setFinancialEntries(supabaseFinancial);
      setDelayReports(supabaseDelays);
      setWarranties(supabaseWarranties);
      console.log('[ERP] ✅ Batch 2 concluído');

      await delay(300);

      // Batch 3: Dados operacionais secundários
      const [supabaseReturns, supabaseErrors, supabaseScans, supabasePickups] = await Promise.all([
        fetchOrderReturns(),
        fetchProductionErrors(),
        fetchBarcodeScans(),
        fetchDeliveryPickups(),
      ]);
      setOrderReturns(supabaseReturns);
      setProductionErrors(supabaseErrors);
      setBarcodeScans(supabaseScans);
      setDeliveryPickups(supabasePickups);
      console.log('[ERP] ✅ Batch 3 concluído');

      await delay(300);

      // Batch 4: Fechamentos mensais
      const supabaseClosings = await fetchMonthlyClosings();
      setMonthlyClosings(supabaseClosings);
      console.log('[ERP] ✅ Batch 4 concluído');

      console.log('[ERP] ✅ Sincronização completa');
    } catch (err: any) {
      console.error('[ERP] ❌ Erro na sincronização:', err.message);
      toast.error('Erro ao sincronizar dados. Verifique sua conexão.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ── Polling de Fallback (30 segundos) ──────────────────────
  // Garante sincronização se o Realtime falhar.
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Sincronização inicial
    loadFromSupabase();

    const interval = setInterval(() => {
      // ⚡ OTIMIZAÇÃO: Polling de segurança aumentado para 5 minutos (300.000ms)
      // O Realtime já cuida de atualizações imediatas de pedidos.
      // O polling serve apenas como fallback para inconsistências.
      console.log('[ERP] 🔄 Polling de segurança (refetch de 5 min)...');
      loadFromSupabase();
    }, 300000);

    return () => clearInterval(interval);
  }, [loadFromSupabase, isAuthenticated]);


  // ── PRODUCTS ─────────────────────────────────────────────────
  const addProduct = useCallback(async (product: Product) => {
    try {
      console.log('[ERP] 📦 Criando produto:', product.name);
      const { id, createdAt, updatedAt, ...productData } = product;
      const newProduct = await createProductSupabase(productData);
      if (newProduct) {
        setProducts(prev => [newProduct, ...prev]);
        console.log('[ERP] ✅ Produto criado no Supabase:', newProduct.id);
      } else {
        throw new Error('Falha ao criar produto no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao criar produto:', err.message);
      // fallback local
      setProducts(prev => [product, ...prev]);
      throw err;
    }
  }, [setProducts]);

  const updateProduct = useCallback(async (product: Product) => {
    try {
      console.log('[ERP] 📦 Atualizando produto:', product.name);
      const updated = await updateProductSupabase(product);
      if (updated) {
        setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
        console.log('[ERP] ✅ Produto atualizado no Supabase:', updated.id);
      } else {
        throw new Error('Falha ao atualizar produto no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao atualizar produto:', err.message);
      // fallback local
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
      throw err;
    }
  }, []); // estável — setProducts vem do useState

  // Refs para evitar loop infinito em updateOrderStatus
  const productsRef = React.useRef(products);
  React.useEffect(() => { productsRef.current = products; }, [products]);
  const updateProductRef = React.useRef(updateProduct);
  React.useEffect(() => { updateProductRef.current = updateProduct; }, [updateProduct]);

  const deleteProduct = useCallback(async (productId: string) => {
    try {
      console.log('[ERP] 🗑️ Deletando produto:', productId);
      await deleteProductSupabase(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      console.log('[ERP] ✅ Produto deletado do Supabase:', productId);
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao deletar produto:', err.message);
      // fallback local
      setProducts(prev => prev.filter(p => p.id !== productId));
      throw err;
    }
  }, [setProducts]);

  // ── ORDERS ───────────────────────────────────────────────────
  const addOrder = useCallback(async (order: Order) => {
    try {
      const newOrder = await createOrderSupabase(order);
      if (newOrder) {
        setOrders(prev => [newOrder, ...prev]);
        console.log('[ERP] ✨ Pedido criado no Supabase:', newOrder.number);
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar pedido:', err.message);
      throw err;
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: OrderStatus,
    extra?: Partial<Order>,
    userName?: string,
    note?: string,
  ) => {
    const now = new Date().toISOString();
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const historyEntry: StatusHistoryEntry = {
      status, timestamp: now, user: userName || 'Sistema', note,
    };

    const updateFields: any = {
      status,
      updatedAt: now,
      statusHistory: [...currentOrder.statusHistory, historyEntry],
      ...extra
    };

    // ⚡ SINCRONIZAÇÃO: Garante que o link da foto vá para as duas colunas possíveis (vitrine e lista)
    if (extra?.receiptUrls && extra.receiptUrls.length > 0) {
      updateFields.receiptUrl = extra.receiptUrls[0];
      updateFields.receipt_url = extra.receiptUrls[0];
    }

    try {
      const updated = await updateOrderSupabase(orderId, updateFields);
      if (updated) {
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        console.log('[ERP] Status atualizado no Supabase:', status);

        // 📦 GESTÃO AUTOMÁTICA DE ESTOQUE

        // 1. DEDUÇÃO (RESERVA): Quando o pedido é enviado para o financeiro ou pula para produção
        const isReserving = (status === 'aguardando_financeiro' || status === 'aguardando_producao') &&
          !['aguardando_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(currentOrder.status);

        if (isReserving) {
          console.log('[ERP] 📦 Deduzindo estoque (Reserva):', currentOrder.number);
          // Busca produtos mais recentes para evitar desync de estoque
          const latestProducts = await fetchProducts();

          for (const item of currentOrder.items) {
            const product = latestProducts.find(p => p.name === item.product);
            if (product) {
              const newQuantity = Math.max(0, product.stockQuantity - item.quantity);
              await updateProduct({
                ...product,
                stockQuantity: newQuantity,
                status: newQuantity === 0 ? 'esgotado' : product.status
              });
              // Atualiza o objeto local para o próximo item no loop (caso o mesmo produto apareça 2x)
              product.stockQuantity = newQuantity;
            }
          }
          toast.success('Estoque reservado/deduzido com sucesso!');
        }

        // 2. ESTORNO: Quando o pedido é rejeitado pelo financeiro e estava anteriormente reservado
        if (status === 'rejeitado_financeiro' && currentOrder.status === 'aguardando_financeiro') {
          try {
            console.log('[ERP] 📦 Estornando estoque (Pedido Rejeitado):', currentOrder.number);
            for (const item of currentOrder.items) {
              const product = productsRef.current.find(p => p.name === item.product);
              if (product) {
                const newQuantity = product.stockQuantity + item.quantity;
                await updateProductRef.current({
                  ...product,
                  stockQuantity: newQuantity,
                  status: 'ativo'
                });
              }
            }
            toast.info('Estoque retornado ao sistema.');
          } catch (stockErr: any) {
            console.warn('[ERP] ⚠️ Erro ao estornar estoque (não crítico):', stockErr.message);
            // Não bloqueia a rejeição do pedido
          }
        }
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao atualizar status:', err.message);
      throw err;
    }
  }, [orders]); // Removido products e updateProduct das deps para evitar loop infinito

  const loadOrderDetails = useCallback(async (orderId: string) => {
    try {
      const fullOrder = await fetchOrderById(orderId);
      if (fullOrder) {
        setOrders(prev => prev.map(o => o.id === orderId ? fullOrder : o));
        
        // ⚡ OTIMIZAÇÃO: Carrega lançamentos financeiros completos (com fotos) apenas para o pedido solicitado
        const fullEntries = await fetchFinancialEntriesByOrderId(orderId);
        if (fullEntries.length > 0) {
          setFinancialEntries(prev => {
            const others = prev.filter(e => e.orderId !== orderId);
            return [...others, ...fullEntries];
          });
        }
        
        return fullOrder;
      }
      return null;
    } catch (err: any) {
      console.error('[ERP] Erro ao carregar detalhes do pedido:', err.message);
      return null;
    }
  }, []);

  const updateOrder = useCallback(async (orderId: string, fields: Partial<Order>) => {
    try {
      const updated = await updateOrderSupabase(orderId, fields);
      if (updated) {
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao atualizar pedido:', err.message);
    }
  }, []);

  const editOrderFull = useCallback(async (order: Order) => {
    try {
      const updated = await updateOrderSupabase(order.id, order);
      if (updated) {
        setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao editar pedido:', err.message);
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    try {
      await deleteOrderSupabase(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      console.log('[ERP] ✅ Pedido deletado do Supabase');

      // 3. ESTORNO NA EXCLUSÃO: Se o pedido já tinha deduzido estoque
      if (orderToDelete && ['aguardando_financeiro', 'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'].includes(orderToDelete.status)) {
        console.log('[ERP] 📦 Estornando estoque (Pedido Excluído):', orderToDelete.number);
        for (const item of orderToDelete.items) {
          const product = productsRef.current.find(p => p.name === item.product);
          if (product) {
            const newQuantity = product.stockQuantity + item.quantity;
            await updateProductRef.current({
              ...product,
              stockQuantity: newQuantity,
              status: 'ativo'
            });
          }
        }
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao deletar pedido:', err.message);
    }
  }, [orders]); // Usando refs para products/updateProduct — evita loop

  // ── CLIENTS ──────────────────────────────────────────────────
  const addClient = useCallback(async (client: Client): Promise<void> => {
    try {
      console.log('[ERP] 📝 Criando cliente:', client.name);

      // Extrair apenas os campos que o Supabase precisa (sem id, createdAt, createdBy)
      const clientData: Omit<Client, 'id' | 'createdAt' | 'createdBy'> = {
        name: client.name,
        cpfCnpj: client.cpfCnpj,
        email: client.email,
        phone: client.phone,
        address: client.address,
        bairro: client.bairro,
        city: client.city,
        state: client.state,
        cep: client.cep,
        notes: client.notes,
        consignado: client.consignado,
      };

      // Salva no Supabase — o banco gera o ID automaticamente
      const newClient = await createClientSupabase(clientData);

      if (newClient) {
        setClients(prev => [newClient, ...prev]);
        console.log('[ERP] ✅ Cliente criado com sucesso:', newClient.id);
      } else {
        throw new Error('Falha ao criar cliente no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao criar cliente:', err.message);
      throw err;
    }
  }, [setClients]);

  const editClient = useCallback(async (client: Client) => {
    try {
      console.log('[ERP] 📝 Atualizando cliente:', client.name);

      // Atualiza no Supabase
      const updated = await updateClientSupabase(client);

      if (updated) {
        setClients(prev => prev.map(c => c.id === client.id ? updated : c));
        console.log('[ERP] ✅ Cliente atualizado com sucesso');
      } else {
        throw new Error('Falha ao atualizar cliente no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao atualizar cliente:', err.message);
      // Fallback: atualiza localmente se Supabase falhar
      setClients(prev => prev.map(c => c.id === client.id ? client : c));
      throw err;
    }
  }, [setClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      console.log('[ERP] 🗑️ Deletando cliente:', clientId);

      // Deleta do Supabase
      const success = await deleteClientSupabase(clientId);

      if (success) {
        setClients(prev => prev.filter(c => c.id !== clientId));
        console.log('[ERP] ✅ Cliente deletado com sucesso');
      } else {
        throw new Error('Falha ao deletar cliente no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] ❌ Erro ao deletar cliente:', err.message);
      // Fallback: deleta localmente se Supabase falhar
      setClients(prev => prev.filter(c => c.id !== clientId));
      throw err;
    }
  }, [setClients]);

  // ── FINANCIAL ENTRIES ────────────────────────────────────────
  const addFinancialEntry = useCallback(async (entry: FinancialEntry) => {
    try {
      const newEntry = await createFinancialEntrySupabase(entry);
      if (newEntry) {
        setFinancialEntries(prev => [newEntry, ...prev]);
        console.log('[ERP] Lançamento financeiro criado no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar financeiro:', err.message);
    }
  }, []);

  const updateFinancialEntry = useCallback(async (id: string, fields: Partial<FinancialEntry>) => {
    try {
      const updated = await updateFinancialEntrySupabase(id, fields);
      if (updated) {
        setFinancialEntries(prev => prev.map(e => e.id === id ? updated : e));
        console.log('[ERP] Lançamento financeiro atualizado no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao atualizar financeiro:', err.message);
    }
  }, []);

  // ── DELAY REPORTS ────────────────────────────────────────────
  const addDelayReport = useCallback(async (report: Omit<DelayReport, 'id' | 'sentAt' | 'readAt'>) => {
    try {
      const newReport = await createDelayReportSupabase(report);
      if (newReport) {
        setDelayReports(prev => [newReport, ...prev]);
        console.log('[ERP] Alerta de atraso criado no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar alerta:', err.message);
    }
  }, []);

  const markDelayReportRead = useCallback(async (reportId: string) => {
    try {
      const updated = await markDelayReportReadSupabase(reportId);
      if (updated) {
        setDelayReports(prev => prev.map(r => r.id === reportId ? updated : r));
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao marcar como lido:', err.message);
    }
  }, []);

  const unreadDelayReports = delayReports.filter(r => !r.readAt).length;

  const overduePaymentsCount = useMemo(() => {
    return orders.filter(o => {
      // Apenas status que o financeiro controla
      const STATUS_FINANCEIRO = [
        'aguardando_financeiro', 'aprovado_financeiro',
        'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado', 'retirado_entregador'
      ];
      if (!STATUS_FINANCEIRO.includes(o.status)) return false;

      // Calcula saldo devedor
      const pagos = financialEntries
        .filter(e => e.orderId === o.id && e.type === 'receita' && e.status === 'pago')
        .reduce((s, e) => s + e.amount, 0);
      const saldo = Math.max(0, o.total - pagos);

      if (saldo <= 0) return false;

      // Calcula dias de atraso (3 dias ou mais)
      const criada = new Date(o.createdAt);
      const hoje = new Date();
      const diffTime = Math.abs(hoje.getTime() - criada.getTime());
      const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return dias >= 3;
    }).length;
  }, [orders, financialEntries]);

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
  const addOrderReturn = useCallback(async (ret: Omit<OrderReturn, 'id' | 'createdAt' | 'resolvedAt'>) => {
    try {
      const newRet = await createOrderReturnSupabase(ret);
      if (newRet) {
        setOrderReturns(prev => [newRet, ...prev]);
        console.log('[ERP] Devolução criada no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar devolução:', err.message);
    }
  }, []);

  const resolveOrderReturn = useCallback(async (returnId: string) => {
    try {
      const { resolveOrderReturnSupabase } = await import('@/lib/gestorServiceSupabase');
      const updated = await resolveOrderReturnSupabase(returnId);
      if (updated) {
        setOrderReturns(prev => prev.map(r => r.id === returnId ? updated : r));
      }
    } catch (error) {
      console.error('Error resolving order return:', error);
    }
  }, []);

  // ── PRODUCTION ERRORS ─────────────────────────────────────────
  const addProductionError = useCallback(async (err: Omit<ProductionError, 'id' | 'createdAt'>) => {
    try {
      const newErr = await createProductionErrorSupabase({ ...err, resolved: false });
      if (newErr) {
        setProductionErrors(prev => [newErr, ...prev]);
        console.log('[ERP] Erro de produção criado no Supabase');
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar erro de produção:', err.message);
    }
  }, []);

  const resolveError = useCallback(async (errorId: string) => {
    try {
      const updated = await resolveProductionErrorSupabase(errorId);
      if (updated) {
        setProductionErrors(prev => prev.map(e => e.id === errorId ? updated : e));
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao resolver erro:', err.message);
    }
  }, []);

  // ── barcode scans ───────────────────────────────────────────
  const addBarcodeScan = useCallback(async (scan: Omit<BarcodeScan, 'id' | 'scannedAt'>) => {
    try {
      const newScan = await createBarcodeScanSupabase(scan);
      if (newScan) {
        setBarcodeScans(prev => [newScan, ...prev]);
        console.log('[ERP] 📡 Leitura sincronizada com Supabase:', scan.orderNumber);
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao sincronizar leitura:', err.message);
      throw err;
    }
  }, []);

  // ── delivery pickups ─────────────────────────────────────────
  const addDeliveryPickup = useCallback(async (pickup: Omit<DeliveryPickup, 'id' | 'pickedUpAt'>) => {
    try {
      const newPickup = await createDeliveryPickupSupabase(pickup);
      if (newPickup) {
        setDeliveryPickups(prev => [newPickup, ...prev]);
        console.log('[ERP] 🚚 Retirada sincronizada com Supabase:', pickup.orderNumber);
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao sincronizar retirada:', err.message);
      throw err;
    }
  }, []);

  // ── warranties ─────────────────────────────────────────────
  const addWarranty = useCallback(async (warranty: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newW = await createWarrantySupabase(warranty);
      if (newW) {
        setWarranties(prev => [newW, ...prev]);
        console.log('[ERP] Garantia criada no Supabase');
        return newW;
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao criar garantia:', err.message);
      throw err;
    }
  }, []);

  const editWarranty = useCallback(async (id: string, updates: Partial<Warranty>) => {
    try {
      const updated = await updateWarrantySupabase(id, updates);
      setWarranties(prev => prev.map(w => w.id === id ? updated : w));
    } catch (error) {
      console.error('[ERP] Erro ao editar garantia:', error);
      throw error;
    }
  }, []);

  const updateWarrantyStatus = useCallback(async (id: string, status: Warranty['status'], resolution?: string, userName?: string, note?: string) => {
    try {
      const current = warranties.find(w => w.id === id);
      if (!current) return;

      const now = new Date().toISOString();
      const historyEntry = {
        status,
        timestamp: now,
        user: userName || 'Sistema',
        note
      };

      const updated = await updateWarrantySupabase(id, {
        status,
        resolution,
        history: [...(current.history || []), historyEntry],
        updatedAt: now
      });

      if (updated) {
        setWarranties(prev => prev.map(w => w.id === id ? updated : w));
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao atualizar garantia:', err.message);
    }
  }, [warranties]);

  // ── MONTHLY CLOSINGS ──────────────────────────────────────────
  const closeMonth = useCallback(async (closing: Omit<MonthlyClosing, 'id' | 'createdAt'>) => {
    try {
      const newClosing = await createMonthlyClosing(closing);
      if (newClosing) {
        setMonthlyClosings(prev => [newClosing, ...prev]);
        toast.success(`Mês ${closing.referenceMonth} fechado para ${closing.sellerName}`);
      }
    } catch (err: any) {
      console.error('[ERP] Erro ao fechar mês:', err.message);
      toast.error('Erro ao fechar mês.');
    }
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
    console.log('[ERP] Todos os dados locais foram removidos.');
  }, [setOrders, setClients, setFinancialEntries, setProducts, setDelayReports, setOrderReturns, setProductionErrors, setBarcodeScans, setDeliveryPickups]);

  return (
    <ERPContext.Provider value={{
      orders, clients, financialEntries, products, delayReports, unreadDelayReports, overduePaymentsCount, loading,
      chatMessages, sendMessage, loadChat, markChatAsRead, getUnreadCount,
      orderReturns, addOrderReturn, resolveOrderReturn,
      productionErrors, addProductionError, resolveError,
      barcodeScans, addBarcodeScan,
      deliveryPickups, addDeliveryPickup,
      addOrder, deleteOrder, updateOrderStatus, updateOrder, editOrderFull,
      addClient, editClient, addFinancialEntry, updateFinancialEntry,
      warranties, addWarranty, updateWarrantyStatus, editWarranty,
      addProduct, updateProduct, deleteProduct, deleteClient, addDelayReport, markDelayReportRead, clearAll,
      loadFromSupabase, loadOrderDetails,
      monthlyClosings, closeMonth
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
