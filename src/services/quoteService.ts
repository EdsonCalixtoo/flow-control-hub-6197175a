import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, QuoteItem, StatusHistoryEntry } from '@/types/erp';

/**
 * Gerar número único para orçamento
 */
async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Buscar último orçamento do mês
  const { data } = await supabase
    .from('quotes')
    .select('number')
    .ilike('number', `ORC-${year}${month}-%`)
    .order('created_at', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].number;
    const lastSequence = parseInt(lastNumber.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  return `ORC-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Criar novo orçamento
 */
export async function createQuote(
  clientId: string,
  sellerId: string,
  items: Omit<QuoteItem, 'id'>[],
  notes?: string,
  observation?: string
): Promise<Order> {
  try {
    // Gerar número do orçamento
    const quoteNumber = await generateQuoteNumber();

    // Calcular totais
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += item.total;
    });

    const taxes = subtotal * 0.1; // 10% de impostos (ajuste conforme necessário)
    const total = subtotal + taxes;

    // Criar orçamento
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .insert([
        {
          number: quoteNumber,
          client_id: clientId,
          seller_id: sellerId,
          subtotal: parseFloat(subtotal.toFixed(2)),
          taxes: parseFloat(taxes.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          notes: notes || '',
          observation: observation || '',
          status: 'rascunho',
        },
      ])
      .select()
      .single();

    if (quoteError) throw quoteError;

    // Criar itens do orçamento
    const itemsWithQuoteId = items.map((item) => ({
      quote_id: quoteData.id,
      product: item.product,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount: item.discount,
      discount_type: item.discountType,
      total: item.total,
      sensor_type: item.sensorType,
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(itemsWithQuoteId);

    if (itemsError) throw itemsError;

    // Buscar ordem completa
    return await getQuoteById(quoteData.id) as Order;
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    throw error;
  }
}

/**
 * Obter orçamento por ID
 */
export async function getQuoteById(quoteId: string): Promise<Order | null> {
  try {
    // Buscar o orçamento
    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError) throw quoteError;

    // Buscar itens
    const { data: itemsData, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) throw itemsError;

    // Buscar histórico de status
    const { data: historyData, error: historyError } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    return mapQuoteFromDb(quoteData, itemsData, historyData);
  } catch (error) {
    console.error('Erro ao obter orçamento:', error);
    return null;
  }
}

/**
 * Listar orçamentos do vendedor
 */
export async function getSellerQuotes(sellerId: string): Promise<Order[]> {
  try {
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    const orders: Order[] = [];

    for (const quote of quotesData) {
      const order = await getQuoteById(quote.id);
      if (order) orders.push(order);
    }

    return orders;
  } catch (error) {
    console.error('Erro ao listar orçamentos do vendedor:', error);
    return [];
  }
}

/**
 * Listar orçamentos por status (para financeiro, gestor, etc)
 */
export async function getQuotesByStatus(status: OrderStatus): Promise<Order[]> {
  try {
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    const orders: Order[] = [];

    for (const quote of quotesData) {
      const order = await getQuoteById(quote.id);
      if (order) orders.push(order);
    }

    return orders;
  } catch (error) {
    console.error('Erro ao listar orçamentos por status:', error);
    return [];
  }
}

/**
 * Listar todos os orçamentos
 */
export async function getAllQuotes(): Promise<Order[]> {
  try {
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    const orders: Order[] = [];

    for (const quote of quotesData) {
      const order = await getQuoteById(quote.id);
      if (order) orders.push(order);
    }

    return orders;
  } catch (error) {
    console.error('Erro ao listar todos os orçamentos:', error);
    return [];
  }
}

/**
 * Atualizar status do orçamento
 */
export async function updateQuoteStatus(
  quoteId: string,
  newStatus: OrderStatus,
  userId: string,
  note?: string
): Promise<Order> {
  try {
    // Atualizar status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: newStatus })
      .eq('id', quoteId);

    if (updateError) throw updateError;

    // Registrar no histórico
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert([
        {
          quote_id: quoteId,
          status: newStatus,
          user_id: userId,
          note: note || '',
        },
      ]);

    if (historyError) throw historyError;

    // Retornar orçamento atualizado
    const quote = await getQuoteById(quoteId);
    if (!quote) throw new Error('Falha ao obter orçamento atualizado');

    return quote;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    throw error;
  }
}

/**
 * Enviar orçamento do rascunho
 */
export async function sendQuote(quoteId: string, sellerId: string): Promise<Order> {
  return updateQuoteStatus(quoteId, 'enviado', sellerId, 'Orçamento enviado para cliente');
}

/**
 * Aprovar orçamento (Financeiro)
 */
export async function approveQuoteFinanceiro(
  quoteId: string,
  userId: string,
  note?: string
): Promise<Order> {
  return updateQuoteStatus(
    quoteId,
    'aprovado_financeiro',
    userId,
    note || 'Aprovado pelo departamento financeiro'
  );
}

/**
 * Rejeitar orçamento (Financeiro)
 */
export async function rejectQuoteFinanceiro(
  quoteId: string,
  userId: string,
  rejectionReason: string
): Promise<Order> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ rejection_reason: rejectionReason })
      .eq('id', quoteId);

    if (error) throw error;

    return updateQuoteStatus(
      quoteId,
      'rejeitado_financeiro',
      userId,
      `Rejeitado: ${rejectionReason}`
    );
  } catch (error) {
    console.error('Erro ao rejeitar orçamento:', error);
    throw error;
  }
}

/**
 * Aprovar para produção (Gestor)
 */
export async function approveQuoteProduction(
  quoteId: string,
  userId: string,
  scheduledDate?: Date
): Promise<Order> {
  try {
    const updates: any = {};

    if (scheduledDate) {
      updates.scheduled_date = scheduledDate.toISOString().split('T')[0];
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('quotes').update(updates).eq('id', quoteId);
      if (error) throw error;
    }

    return updateQuoteStatus(
      quoteId,
      'aguardando_producao',
      userId,
      'Aprovado para produção'
    );
  } catch (error) {
    console.error('Erro ao aprovar para produção:', error);
    throw error;
  }
}

/**
 * Iniciar produção
 */
export async function startProduction(quoteId: string, userId: string): Promise<Order> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ production_started_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (error) throw error;

    return updateQuoteStatus(quoteId, 'em_producao', userId, 'Produção iniciada');
  } catch (error) {
    console.error('Erro ao iniciar produção:', error);
    throw error;
  }
}

/**
 * Finalizar produção
 */
export async function finishProduction(quoteId: string, userId: string): Promise<Order> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ production_finished_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (error) throw error;

    return updateQuoteStatus(quoteId, 'producao_finalizada', userId, 'Produção finalizada');
  } catch (error) {
    console.error('Erro ao finalizar produção:', error);
    throw error;
  }
}

/**
 * Liberar produto
 */
export async function releaseProduct(quoteId: string, userId: string): Promise<Order> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({
        released_at: new Date().toISOString(),
        released_by: userId,
      })
      .eq('id', quoteId);

    if (error) throw error;

    return updateQuoteStatus(quoteId, 'produto_liberado', userId, 'Produto liberado');
  } catch (error) {
    console.error('Erro ao liberar produto:', error);
    throw error;
  }
}

/**
 * Deletar orçamento (apenas em rascunho)
 */
export async function deleteQuote(quoteId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('quotes').delete().eq('id', quoteId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    throw error;
  }
}

/**
 * Subscribe para mudanças em tempo real em um orçamento
 */
export function subscribeToQuote(
  quoteId: string,
  callback: (quote: Order | null) => void
) {
  const subscription = supabase
    .channel(`quote-${quoteId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quotes' },
      async () => {
        const quote = await getQuoteById(quoteId);
        callback(quote);
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Subscribe para mudanças em tempo real na lista de orçamentos
 */
export function subscribeToQuotes(
  callback: (quotes: Order[]) => void
) {
  const subscription = supabase
    .channel('quotes-all')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quotes' },
      async () => {
        const quotes = await getAllQuotes();
        callback(quotes);
      }
    )
    .subscribe();

  return subscription;
}

// ─────────────────────────────────────────────────────────────────
// Função auxiliar para mapear dados do banco para o tipo Order
// ─────────────────────────────────────────────────────────────────

function mapQuoteFromDb(
  quoteData: any,
  itemsData: any[],
  historyData: any[]
): Order {
  const items: QuoteItem[] = itemsData.map((item) => ({
    id: item.id,
    product: item.product,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    discount: item.discount,
    discountType: item.discount_type,
    total: item.total,
    sensorType: item.sensor_type,
  }));

  const statusHistory: StatusHistoryEntry[] = historyData.map((entry) => ({
    status: entry.status,
    timestamp: entry.created_at,
    user: entry.user_id,
    note: entry.note,
  }));

  return {
    id: quoteData.id,
    number: quoteData.number,
    clientId: quoteData.client_id,
    clientName: quoteData.client_name,
    sellerId: quoteData.seller_id,
    sellerName: quoteData.seller_name,
    items,
    subtotal: quoteData.subtotal,
    taxes: quoteData.taxes,
    total: quoteData.total,
    status: quoteData.status,
    notes: quoteData.notes,
    observation: quoteData.observation,
    paymentMethod: quoteData.payment_method,
    paymentStatus: quoteData.payment_status,
    installments: quoteData.installments,
    rejectionReason: quoteData.rejection_reason,
    createdAt: quoteData.created_at,
    updatedAt: quoteData.updated_at,
    qrCode: quoteData.qr_code,
    receiptUrl: quoteData.receipt_url,
    productionStartedAt: quoteData.production_started_at,
    productionFinishedAt: quoteData.production_finished_at,
    releasedAt: quoteData.released_at,
    releasedBy: quoteData.released_by,
    deliveryDate: quoteData.delivery_date,
    scheduledDate: quoteData.scheduled_date,
    orderType: quoteData.order_type,
    productionStatus: quoteData.production_status,
    statusHistory,
  };
}
