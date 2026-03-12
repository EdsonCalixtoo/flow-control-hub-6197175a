import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, formatCurrency } from '@/components/shared/StatusBadge';
import { OrderPipeline, OrderHistory } from '@/components/shared/OrderTimeline';
import { ComprovanteUpload } from '@/components/shared/ComprovanteUpload';
import { FileText, Plus, Send, Eye, ArrowLeft, Search, X, Trash2, History, MessageCircle, Edit2, Check, Download, Link2, DollarSign, CheckCircle } from 'lucide-react';
import type { Order, QuoteItem } from '@/types/erp';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { InstallationCalendar } from '@/components/shared/InstallationCalendar';
import { checkInstallationConflict, saveInstallation, deleteInstallationByOrder, InstallationAppointment } from '@/lib/installationServiceSupabase';

// Função local para gerar próximo número de ordem
const getNextOrderNumber = (existingOrders: Order[]): number => {
  if (existingOrders.length === 0) return 1;
  const numbers = existingOrders
    .map(o => parseInt(o.number.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  return Math.max(...numbers, 0) + 1;
};

// Status que bloqueiam a edição do orçamento
// Fluxo: Vendedor → Financeiro → Produção (sem etapa de Gestor)
const STATUS_BLOQUEIAM_EDICAO = ['aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
  'aguardando_producao', 'em_producao', 'producao_finalizada', 'produto_liberado'];

const OrcamentosPage: React.FC = () => {
  const { orders, addOrder, updateOrderStatus, editOrderFull, clients, products, deleteOrder } = useERP();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const detailRef = useRef<HTMLDivElement>(null);

  // Se navegado desde a ficha do cliente, abre o form já com cliente pré-selecionado
  const preSelectedClientId: string = (location.state as any)?.clientId ?? '';
  const preSelectedReward: any = (location.state as any)?.reward ?? null;

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(() => !!preSelectedClientId);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [comprovantesAttached, setComprovantesAttached] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [sendingToFinance, setSendingToFinance] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // ✅ Isolamento: vendedor vê apenas seus pedidos
  const myOrders = orders.filter(o =>
    user?.role !== 'vendedor' || o.sellerId === user.id
  );

  // ✅ TODOS OS VENDEDORES VÊM TODOS OS CLIENTES (compartilhados)
  // Isolamento de ORDERS já garante que cada vendedor só edita seus próprios
  const myClients = clients;

  // Form state for new/edit order
  const [newClientId, setNewClientId] = useState(preSelectedClientId);
  const [newItems, setNewItems] = useState<{ product: string; description: string; quantity: number; unitPrice: string | number; sensorType?: 'com_sensor' | 'sem_sensor'; isReward?: boolean; rewardId?: string }[]>(
    [{ product: '', description: '', quantity: 1, unitPrice: '' }]
  );
  const [newNotes, setNewNotes] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newOrderType, setNewOrderType] = useState<'entrega' | 'instalacao' | 'manutencao' | 'retirada'>('entrega');
  const [newInstallationTime, setNewInstallationTime] = useState('');
  const [newInstallationPaymentType, setNewInstallationPaymentType] = useState<'pago' | 'pagar_na_hora'>('pago');
  const [newCarrier, setNewCarrier] = useState('');
  const [newRequiresInvoice, setNewRequiresInvoice] = useState(false);

  // Abre pedido via URL (?view=ID)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewId = params.get('view');
    if (viewId) {
      const order = orders.find(o => o.id === viewId);
      if (order) setSelectedOrder(order);
    }
  }, [location.search, orders]);

  // Se vier um clientId novo pelo estado, atualiza
  useEffect(() => {
    if (preSelectedClientId) {
      setNewClientId(preSelectedClientId);
      setShowCreate(true);
    }
  }, [preSelectedClientId]);

  // Se vier um prêmio pelo estado, inicializa o item premiado
  useEffect(() => {
    if (preSelectedReward && !editingOrder && products.length > 0) {
      const rewardId = preSelectedReward.id;
      const type = preSelectedReward.type;

      let rewardProduct = '';
      let rewardDescription = 'ITEM PREMIADO';

      if (type === 'tier_1') {
        const prod = products.find(p => p.name.toUpperCase().includes('PLAQUINHA') && p.name.toUpperCase().includes('NYLON'));
        rewardProduct = prod ? prod.name : '';
        rewardDescription = 'RESGATE DE PRÊMIO: 5 KITS COMPRADOS';
      } else if (type === 'tier_2') {
        rewardDescription = 'RESGATE DE PRÊMIO: 7 KITS (VALOR CHEIO)';
      } else if (type === 'tier_3') {
        rewardDescription = 'RESGATE DE PRÊMIO: 10 KITS (VALOR PROMO)';
      }

      setNewItems([{
        product: rewardProduct,
        description: rewardDescription,
        quantity: 1,
        unitPrice: 0,
        isReward: true,
        rewardId: rewardId
      }]);
      setNewObservation(`PEDIDO COM RESGATE DE PRÊMIO: ${rewardDescription}`);
      setShowCreate(true);

      const helpMsg = type === 'tier_1'
        ? 'Prêmio de 5 kits: Selecione o item (Kits desativados para este prêmio).'
        : 'Prêmio de Meta de Kits: Selecione o modelo de KIT para o resgate.';

      toast.success('Modo de resgate de prêmio!', {
        description: helpMsg,
        duration: 8000
      });
    }
  }, [preSelectedReward, products, editingOrder]);

  const filtered = myOrders.filter(o =>
    String(o.number).toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase())
  );

  // Envia para o financeiro — apenas via botão explícito
  const enviarFinanceiro = async (orderId: string) => {
    try {
      setSendingToFinance(true);
      const receipts = comprovantesAttached.length > 0 ? comprovantesAttached : (selectedOrder?.receiptUrls || []);
      await updateOrderStatus(
        orderId, 'aguardando_financeiro',
        receipts.length > 0 ? { receiptUrls: receipts } : undefined,
        user?.name || 'Vendedor',
        receipts.length > 0 ? 'Enviado para aprovação financeira com comprovante(s)' : 'Enviado para aprovação financeira'
      );
      console.log('[OrcamentosPage] ✅ Orçamento enviado para financeiro');
      setSelectedOrder(null);
      setComprovantesAttached([]);
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ Erro ao enviar para financeiro:', err?.message ?? err);
      alert('❌ Erro ao enviar: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSendingToFinance(false);
    }
  };

  // Status que permitem excluir o orçamento (não enviados ou rejeitados pelo financeiro)
  const podeExcluir = (status: string) =>
    ['rascunho', 'enviado', 'aprovado_cliente', 'rejeitado_financeiro'].includes(status);

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Tem certeza que deseja excluir o orçamento ${orderNumber}? Esta ação não pode ser desfeita.`)) return;
    try {
      setDeletingOrderId(orderId);
      await deleteOrder(orderId);
      await deleteInstallationByOrder(orderId); // Limpa agendamento se existir
      setSelectedOrder(null);
      console.log('[OrcamentosPage] ✅ Orçamento excluído:', orderNumber);
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ Erro ao excluir orçamento:', err?.message ?? err);
      alert('❌ Erro ao excluir: ' + (err?.message || 'Tente novamente'));
    } finally {
      setDeletingOrderId(null);
    }
  };

  const addItem = () => setNewItems(prev => [...prev, { product: '', description: '', quantity: 1, unitPrice: '' }]);
  const removeItem = (i: number) => setNewItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => {
    setNewItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const calcTotal = () => newItems.reduce((s, item) => {
    const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
    return s + (item.quantity * price);
  }, 0);

  // Abre o formulário de edição para um orçamento existente
  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setNewClientId(order.clientId);
    setNewItems(order.items.map(i => ({
      product: i.product,
      description: i.description || '',
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      sensorType: i.sensorType,
    })));
    setNewNotes(order.notes || '');
    setNewObservation(order.observation || '');
    setNewDeliveryDate(order.deliveryDate || '');
    setNewOrderType(order.orderType || 'entrega');
    setNewInstallationTime(order.installationTime || '');
    setNewInstallationPaymentType(order.installationPaymentType || 'pago');
    setNewCarrier(order.carrier || '');
    setNewRequiresInvoice(order.requiresInvoice || false);
    setFormError('');
  };

  const resetForm = () => {
    setEditingOrder(null);
    setShowCreate(false);
    setNewClientId('');
    setNewItems([{ product: '', description: '', quantity: 1, unitPrice: '' }]);
    setNewNotes('');
    setNewObservation('');
    setNewDeliveryDate('');
    setNewOrderType('entrega');
    setNewInstallationTime('');
    setNewInstallationPaymentType('pago');
    setNewCarrier('');
    setNewRequiresInvoice(false);
    setFormError('');
  };

  const handleCopyTracking = (orderId: string) => {
    const url = `${window.location.origin}/rastreio/${orderId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de rastreio copiado!', {
      description: 'Envie para o cliente acompanhar o pedido.'
    });
  };

  const handleCreateOrder = async () => {
    setFormError('');

    // ────────────────────────────
    // VALIDAÇÕES
    // ────────────────────────────
    const client = clients.find(c => c.id === newClientId);
    if (!client) {
      setFormError('⚠️ Por favor, selecione um cliente.');
      return;
    }

    if (newItems.some(i => !i.product)) {
      setFormError('⚠️ Todos os itens devem ter um produto selecionado.');
      return;
    }

    if (newItems.some(i => !i.quantity || i.quantity <= 0)) {
      setFormError('⚠️ Todos os itens devem ter quantidade maior que 0.');
      return;
    }

    if (newItems.some(i => {
      const price = typeof i.unitPrice === 'string' ? parseFloat(i.unitPrice) : i.unitPrice;
      return isNaN(price) || price < 0;
    })) {
      setFormError('⚠️ Todos os itens devem ter preço unitário válido (0 ou maior).');
      return;
    }

    const subtotal = calcTotal();
    if (subtotal < 0) {
      setFormError('⚠️ O valor total do orçamento deve ser maior ou igual a R$ 0,00.');
      return;
    }

    const now = new Date().toISOString();

    // Validação extra para instalação/manutenção
    if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
      if (!newDeliveryDate || !newInstallationTime) {
        setFormError(`⚠️ Informe a data e o horário da ${newOrderType === 'instalacao' ? 'instalação' : 'manutenção'}.`);
        return;
      }

      // Verifica conflito de horário
      const hasConflict = await checkInstallationConflict(newDeliveryDate, newInstallationTime);
      if (hasConflict && !editingOrder) { 
        setFormError('⚠️ Este horário já está ocupado. Escolha outro.');
        return;
      }
    }

    // ────────────────────────────
    // MODO EDIÇÃO
    // ────────────────────────────
    if (editingOrder) {
      try {
        setSavingOrder(true);
        const now = new Date().toISOString();
        const updatedOrder: Order = {
          ...editingOrder,
          clientId: client.id,
          clientName: client.name,
          items: newItems.map((item, i) => {
            const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
            return {
              id: editingOrder.items[i]?.id || `ni${i}`,
              product: item.product,
              description: item.description,
              quantity: item.quantity,
              unitPrice: price,
              discount: editingOrder.items[i]?.discount || 0,
              discountType: editingOrder.items[i]?.discountType || 'percent',
              total: item.quantity * price,
              sensorType: item.sensorType,
              isReward: (item as any).isReward,
              rewardId: (item as any).rewardId,
            };
          }),
          subtotal,
          taxes: 0,
          total: subtotal,
          notes: newNotes,
          observation: newObservation,
          deliveryDate: newDeliveryDate || undefined,
          orderType: newOrderType,
          installationPaymentType: (newOrderType === 'instalacao' || newOrderType === 'manutencao' || newOrderType === 'retirada') ? newInstallationPaymentType : undefined,
          carrier: newOrderType === 'entrega' ? newCarrier : undefined,
          isConsigned: client.consignado,
          requiresInvoice: newRequiresInvoice,
          updatedAt: now,
        };

        console.log('[OrcamentosPage] 📝 Editando orçamento:', updatedOrder.number);
        await editOrderFull(updatedOrder);

        // Se mudou para instalação/manutenção ou alterou dados, atualiza agenda
        if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
          await deleteInstallationByOrder(updatedOrder.id);
          await saveInstallation({
            order_id: updatedOrder.id,
            seller_id: user?.id || '1',
            client_name: client.name,
            date: newDeliveryDate,
            time: newInstallationTime,
            payment_type: newInstallationPaymentType,
            type: newOrderType
          });
        } else if ((editingOrder.orderType === 'instalacao' || editingOrder.orderType === 'manutencao') && newOrderType === 'entrega') {
          await deleteInstallationByOrder(updatedOrder.id);
        }

        setFormError('');
        resetForm();
      } catch (err: any) {
        console.error('[OrcamentosPage] ❌ Erro ao editar orçamento:', err?.message ?? err);
        const errMsg = err?.message ?? String(err);
        if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique') || errMsg.includes('409')) {
          setFormError('❌ Conflito: Este horário de instalação já foi ocupado ou o número do pedido já existe.');
        } else {
          setFormError(`❌ Erro ao editar orçamento: ${errMsg || 'Tente novamente'}`);
        }
      } finally {
        setSavingOrder(false);
      }
      return;
    }

    // ────────────────────────────
    // MODO CRIAÇÃO (com retry)
    // ────────────────────────────
    setSavingOrder(true);
    const createOrderWithRetry = async (maxAttempts = 3) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[OrcamentosPage] 🔄 TENTATIVA ${attempt}/${maxAttempts}: Gerando número do pedido...`);
          const nextNumber = getNextOrderNumber(orders);
          console.log(`[OrcamentosPage] ✅ Número gerado: ${nextNumber}`);

          const now = new Date().toISOString();
          const order: Order = {
            id: crypto.randomUUID(),
            number: `PED-${String(nextNumber).padStart(3, '0')}`,
            clientId: client.id,
            clientName: client.name,
            sellerId: user?.id || '1',
            sellerName: user?.name || 'Vendedor',
            items: newItems.map((item, i) => {
              const price = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice;
              return {
                id: `ni${i}`,
                product: item.product,
                description: item.description,
                quantity: item.quantity,
                unitPrice: price,
                discount: 0,
                discountType: 'percent' as const,
                total: item.quantity * price,
                sensorType: item.sensorType || (item.product.toUpperCase().includes('KIT') ? 'com_sensor' : undefined),
                isReward: (item as any).isReward,
                rewardId: (item as any).rewardId,
              };
            }),
            subtotal,
            taxes: 0,
            total: subtotal,
            status: 'rascunho',
            paymentStatus: 'pendente',
            notes: newNotes,
            observation: newObservation,
            deliveryDate: newDeliveryDate || undefined,
            orderType: newOrderType,
            isConsigned: client.consignado,
            requiresInvoice: newRequiresInvoice,
            createdAt: now,
            updatedAt: now,
            statusHistory: [{
              status: 'rascunho',
              timestamp: now,
              user: user?.name || 'Vendedor',
              note: 'Orçamento criado'
            }],
          };

          if (newOrderType === 'instalacao' || newOrderType === 'manutencao' || newOrderType === 'retirada') {
            order.installationDate = newDeliveryDate || undefined;
            order.installationTime = newInstallationTime || undefined;
            order.installationPaymentType = newInstallationPaymentType;
          }
          if (newOrderType === 'entrega') {
            order.carrier = newCarrier;
          }

          await addOrder(order);

          if (newOrderType === 'instalacao' || newOrderType === 'manutencao') {
            await saveInstallation({
              order_id: order.id,
              seller_id: user?.id || '1',
              client_name: client.name,
              date: newDeliveryDate,
              time: newInstallationTime,
              payment_type: newInstallationPaymentType,
              type: newOrderType
            });
          }

          setFormError('');
          resetForm();
          console.log(`[OrcamentosPage] ✨ SUCESSO! Orçamento ${order.number} criado.`);
          return;
        } catch (err: any) {
          const errMsg = err?.message ?? String(err);
          console.error(`[OrcamentosPage] ❌ Tentativa ${attempt} falhou:`, errMsg);

          const isDuplicate = errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique');
          const shouldRetry = attempt < maxAttempts && (
            isDuplicate ||
            errMsg.toLowerCase().includes('timeout') ||
            errMsg.toLowerCase().includes('network')
          );

          if (shouldRetry) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw err;
          }
        }
      }
    };

    try {
      await createOrderWithRetry();
    } catch (err: any) {
      console.error('[OrcamentosPage] ❌ ERRO CRÍTICO:', err?.message ?? err);
      const errMsg = err?.message ?? String(err);
      let userMessage = 'Erro ao criar orçamento. Tente novamente.';

      if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique') || errMsg.includes('409')) {
        userMessage = '❌ Erro: Conflito de dados. O número do pedido ou o horário já existe.';
      } else if (errMsg.toLowerCase().includes('permission')) {
        userMessage = '❌ Erro de permissão. Verifique se você está logado.';
      } else if (errMsg.toLowerCase().includes('foreign key')) {
        userMessage = '❌ Erro de integridade: O pedido não pôde ser vinculado à instalação.';
      }

      setFormError(userMessage);
    } finally {
      setSavingOrder(false);
    }
  };

  const openWhatsApp = (phone: string) =>
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');

  // Função para baixar PDF do orçamento - Profissional e bem formatado
  const downloadPDF = async (order: Order) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // ═══ HEADER ═══
      pdf.setFontSize(24);
      pdf.setTextColor(0, 102, 204); // Azul
      pdf.text('ORÇAMENTO', 15, yPosition);

      yPosition += 12;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, 15, yPosition);
      pdf.text(`Validade: 30 dias`, 90, yPosition);
      pdf.text(`Número: ${order.number}`, 150, yPosition);

      yPosition += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ INFORMAÇÕES DO CLIENTE ═══
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 51, 102);
      pdf.text('CLIENTE', 15, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${order.clientName}`, 15, yPosition);

      const client = clients.find(c => c.id === order.clientId);
      if (client) {
        yPosition += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`CPF/CNPJ: ${client.cpfCnpj || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Telefone: ${client.phone || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Email: ${client.email || '—'}`, 15, yPosition);

        yPosition += 4;
        pdf.text(`Endereço: ${client.address} - ${client.city}/${client.state} - ${client.cep}`, 15, yPosition);
      }

      yPosition += 12;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ INFORMAÇÕES DO VENDEDOR ═══
      yPosition += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 51, 102);
      pdf.text('VENDEDOR RESPONSÁVEL', 15, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${order.sellerName}`, 15, yPosition);

      if (order.orderType === 'entrega' && order.carrier) {
        pdf.setFontSize(11);
        pdf.setTextColor(0, 51, 102);
        pdf.text('TRANSPORTADORA', 120, yPosition - 6);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(order.carrier, 120, yPosition);
      }

      yPosition += 12;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      // ═══ TABELA DE PRODUTOS ═══
      yPosition += 10;

      // Headers da tabela
      pdf.setFillColor(0, 102, 204);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.rect(15, yPosition - 5, 180, 6, 'F');
      pdf.text('PRODUTO', 18, yPosition);
      pdf.text('QTDE', 120, yPosition);
      pdf.text('VLR UNIT.', 145, yPosition);
      pdf.text('SUBTOTAL', 175, yPosition);

      yPosition += 8;
      pdf.setTextColor(0, 0, 0);

      // Linhas de produtos
      order.items.forEach((item, idx) => {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 15;

          // Repetir headers em nova página
          pdf.setFillColor(0, 102, 204);
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.rect(15, yPosition - 5, 180, 6, 'F');
          pdf.text('PRODUTO', 18, yPosition);
          pdf.text('QTDE', 120, yPosition);
          pdf.text('VLR UNIT.', 145, yPosition);
          pdf.text('SUBTOTAL', 175, yPosition);

          yPosition += 8;
          pdf.setTextColor(0, 0, 0);
        }

        // Fundo alternado para melhor legibilidade
        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(15, yPosition - 4, 180, 6, 'F');
        }

        pdf.setFontSize(9);
        // Produto com sensor destacado
        let productName = item.product;
        if (item.product.toUpperCase().includes('KIT') && item.sensorType) {
          productName += ` (${item.sensorType === 'com_sensor' ? 'COM SENSOR' : 'SEM SENSOR'})`;
        }

        // Truncar texto longo
        const lines = pdf.splitTextToSize(productName, 95);
        lines.forEach((line, i) => {
          pdf.text(line, 18, yPosition + (i * 3));
        });

        pdf.text(item.quantity.toString(), 122, yPosition);
        pdf.text(`R$ ${item.unitPrice.toFixed(2)}`, 147, yPosition);
        pdf.text(`R$ ${item.total.toFixed(2)}`, 172, yPosition);

        yPosition += 7;
      });

      // ═══ LINHAS DE TOTAIS ═══
      yPosition += 3;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPosition, 195, yPosition);

      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('SUBTOTAL:', 140, yPosition);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`R$ ${order.subtotal.toFixed(2)}`, 172, yPosition);

      yPosition += 6;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 102, 204);
      pdf.setFont(undefined, 'bold');
      pdf.text('TOTAL:', 140, yPosition);
      pdf.setFontSize(14);
      pdf.text(`R$ ${order.total.toFixed(2)}`, 165, yPosition);

      // ═══ OBSERVAÇÕES ═══
      if (order.observation) {
        yPosition += 12;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(15, yPosition, 195, yPosition);

        yPosition += 6;
        pdf.setFontSize(10);
        pdf.setTextColor(0, 51, 102);
        pdf.setFont(undefined, 'bold');
        pdf.text('OBSERVAÇÕES:', 15, yPosition);

        yPosition += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        const obsLines = pdf.splitTextToSize(order.observation, 180);
        obsLines.forEach((line, i) => {
          pdf.text(line, 15, yPosition + (i * 4));
        });
      }

      // ═══ RODAPÉ ═══
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Este orçamento é válido por 30 dias. Para confirmar seu pedido, favor retornar assinado ou via email.', 15, pageHeight - 10);
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 6);

      pdf.save(`Orcamento_${order.number}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  // ── Formulário de criação/edição ────────────────────────────
  if (showCreate || editingOrder) {
    const isEdit = !!editingOrder;
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{isEdit ? '✏️ Editar Orçamento' : 'Novo Orçamento'}</h1>
            <p className="page-subtitle">
              {isEdit ? `Editando ${editingOrder?.number} — Status: ${editingOrder?.status}` : 'Preencha os dados do orçamento'}
            </p>
          </div>
          <button onClick={resetForm} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Cancelar
          </button>
        </div>

        <div className="card-section p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="input-modern">
              <option value="">Selecione um cliente...</option>
              {myClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.consignado ? ' ⭐ Consignado' : ''}</option>)}
            </select>
            {newClientId && clients.find(c => c.id === newClientId)?.consignado && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mt-2">
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-xs font-bold text-amber-400">Cliente Consignado</p>
                  <p className="text-[11px] text-amber-400/70">Este cliente opera em regime de consignação. Verifique as condições especiais.</p>
                </div>
              </div>
            )}
          </div>

          {/* NOTA FISCAL - POSIÇÃO DE DESTAQUE NO TOPO */}
          <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${newRequiresInvoice ? 'bg-primary/10 border-primary ring-4 ring-primary/5' : 'bg-muted/30 border-border/40'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${newRequiresInvoice ? 'bg-primary rotate-0 scale-110' : 'bg-muted-foreground/30 scale-100'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-tight transition-colors ${newRequiresInvoice ? 'text-primary' : 'text-foreground'}`}>Com Nota Fiscal?</h3>
                  <p className="text-[10px] text-muted-foreground font-bold italic">Ative se este pedido precisa de emissão de NF</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewRequiresInvoice(!newRequiresInvoice)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all focus:outline-none ring-offset-2 shadow-inner ${newRequiresInvoice ? 'bg-primary ring-2 ring-primary/20' : 'bg-muted-foreground/20 ring-0'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${newRequiresInvoice ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>

            {newRequiresInvoice && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 border border-primary/20 animate-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-black text-primary uppercase tracking-wider">Atenção: Este pedido será enviado ao financeiro com exigência de NF</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Produtos</label>
              <button onClick={addItem} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar item
              </button>
            </div>
            {newItems.map((item, i) => (
              <div key={i} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="text-[10px] text-muted-foreground block mb-1">Produto</label>
                    {products.length > 0 ? (
                      <select
                        value={item.product}
                        onChange={e => {
                          const selectedProduct = products.find(p => p.name === e.target.value);
                          const newItem = { ...item, product: e.target.value };
                          if (selectedProduct) {
                            // Removido auto-preenchimento de unitPrice a pedido do usuário
                            newItem.description = selectedProduct.description;

                            // Initialize sensorType for KITs
                            if (e.target.value.toUpperCase().includes('KIT')) {
                              newItem.sensorType = 'com_sensor';
                            } else {
                              delete newItem.sensorType;
                            }
                          }
                          const updated = [...newItems];
                          updated[i] = newItem;
                          setNewItems(updated);
                        }}
                        className="input-modern py-2 text-xs"
                      >
                        <option value="">Selecione um produto...</option>
                        {products
                          .filter(p => {
                            // Restrição para produtos de Carenagem
                            if (p.category === 'Carenagem' && user?.email !== 'higorfeerreira9@gmail.com') {
                              return false;
                            }
                            // Se não for o item do prêmio, mostra tudo
                            if (!(item as any).isReward || !preSelectedReward) return true;

                            const isKitProd = p.name.toUpperCase().includes('KIT');
                            const rewardType = preSelectedReward.type;

                            // 1ª Premiação (5 kits): NÃO pode ser KIT
                            if (rewardType === 'tier_1') return !isKitProd;

                            // 2ª e 3ª Premiação (Meta de Kits): TEM que ser KIT
                            if (rewardType === 'tier_2' || rewardType === 'tier_3') return isKitProd;

                            return true;
                          })
                          .map(p => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <>
                        <input type="text" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} placeholder="Nome do produto" className="input-modern py-2 text-xs" />
                        <p className="text-[9px] text-orange-600 mt-1 font-medium">⚠️ Nenhum produto carregou. Verifique estoque ou recarregue a página.</p>
                      </>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground block mb-1">Qtd</label>
                    <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="input-modern py-2 text-xs" min={1} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-muted-foreground block mb-1">Valor Unit.</label>
                    <input
                      type="text"
                      value={(item as any).isReward ? '0.00' : item.unitPrice}
                      disabled={(item as any).isReward}
                      onChange={e => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          updateItem(i, 'unitPrice', val);
                        }
                      }}
                      placeholder="0.00"
                      className={`input-modern py-2 text-xs ${(item as any).isReward ? 'bg-success/10 text-success font-bold border-success/30 cursor-not-allowed' : ''}`}
                    />
                    {(item as any).isReward && (
                      <p className="text-[9px] text-success font-black uppercase mt-1">Item Premiado (R$ 0,00)</p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{formatCurrency(item.quantity * (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) || 0 : item.unitPrice))}</span>
                    {newItems.length > 1 && (
                      <button onClick={() => removeItem(i)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive inline-flex items-center justify-center hover:bg-destructive/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Campo para Sensor - aparece apenas se for KIT */}
                {item.product && item.product.toUpperCase().includes('KIT') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Opção do KIT</label>
                      <select
                        value={item.sensorType || 'com_sensor'}
                        onChange={e => updateItem(i, 'sensorType', e.target.value as 'com_sensor' | 'sem_sensor')}
                        className="input-modern py-2 text-xs"
                      >
                        <option value="com_sensor">✅ COM SENSOR</option>
                        <option value="sem_sensor">⚪ SEM SENSOR</option>
                      </select>
                    </div>
                    <div className="pt-6 text-xs text-muted-foreground">
                      Seu produto será: <strong className="text-foreground">{item.product} {item.sensorType === 'com_sensor' ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}</strong>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Descrição do Produto</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    placeholder="Descrição completa do produto..."
                    className="input-modern py-2 text-xs w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Data de entrega + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data de Entrega</label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={e => setNewDeliveryDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="input-modern"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo do Pedido</label>
              <div className="flex gap-2">
                {(['entrega', 'instalacao', 'manutencao', 'retirada'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewOrderType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newOrderType === t
                      ? t === 'entrega'
                        ? 'bg-primary/10 border-primary text-primary'
                        : t === 'instalacao'
                          ? 'bg-producao/10 border-producao text-producao'
                          : t === 'manutencao'
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500'
                            : 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'border-border/40 text-muted-foreground hover:border-primary/30'
                      }`}
                  >
                    {t === 'entrega' ? '🚚 Entrega' : t === 'instalacao' ? '🔧 Instalação' : t === 'manutencao' ? '🛠️ Manutenção' : '📦 Retirada'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transportadora - aparece SOMENTE se for entrega */}
          {newOrderType === 'entrega' && (
            <div className="space-y-3 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Transportadora</h3>
                  <p className="text-[10px] text-muted-foreground font-bold italic">Selecione o método de entrega para este pedido</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['JADLOG', 'MOTOBOY', 'CLEYTON', 'LALAMOVE'].map(carrier => (
                  <button
                    key={carrier}
                    type="button"
                    onClick={() => setNewCarrier(prev => prev === carrier ? '' : carrier)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${newCarrier === carrier
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500 scale-[1.02] shadow-md border-opacity-100 ring-2 ring-blue-500/10'
                      : 'bg-muted/30 border-transparent text-muted-foreground grayscale hover:grayscale-0 hover:bg-muted/50'
                      }`}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">{carrier}</span>
                    {newCarrier === carrier && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opções de Pagamento para RETIRADA */}
          {newOrderType === 'retirada' && (
            <div className="space-y-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Status de Pagamento (Retirada)</h3>
                  <p className="text-[10px] text-muted-foreground font-bold">O cliente já pagou ou pagará na retirada?</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewInstallationPaymentType('pago')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${newInstallationPaymentType === 'pago'
                    ? 'bg-success/10 border-success text-success scale-[1.02] shadow-sm'
                    : 'bg-muted/30 border-transparent text-muted-foreground grayscale hover:grayscale-0'
                    }`}
                >
                  <Check className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">Pago</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewInstallationPaymentType('pagar_na_hora')}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${newInstallationPaymentType === 'pagar_na_hora'
                    ? 'bg-warning/10 border-warning text-warning scale-[1.02] shadow-sm'
                    : 'bg-muted/30 border-transparent text-muted-foreground grayscale hover:grayscale-0'
                    }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">Cobrar no Local</span>
                </button>
              </div>
            </div>
          )}

          {/* Calendário de Instalação / Manutenção */}
          {(newOrderType === 'instalacao' || newOrderType === 'manutencao') && (
            <div className={`space-y-4 p-5 rounded-2xl border animate-in fade-in duration-500 ${newOrderType === 'instalacao' ? 'bg-producao/5 border-producao/20' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${newOrderType === 'instalacao' ? 'bg-producao' : 'bg-indigo-500'}`}>
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Agendamento de {newOrderType === 'instalacao' ? 'Instalação' : 'Manutenção'}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold">Escolha um horário disponível para a equipe</p>
                </div>
              </div>

              <InstallationCalendar
                selectedDate={newDeliveryDate}
                selectedTime={newInstallationTime}
                onSelect={(date, time) => {
                  setNewDeliveryDate(date);
                  setNewInstallationTime(time);
                  toast.success(`Horário selecionado: ${time} no dia ${format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')}`);
                }}
              />

              <div className="space-y-2 pt-4 border-t border-producao/10">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forma de Pagamento da {newOrderType === 'instalacao' ? 'Instalação' : 'Manutenção'}</label>
                <div className="flex gap-2">
                  {(['pago', 'pagar_na_hora'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewInstallationPaymentType(p)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newInstallationPaymentType === p
                        ? 'bg-success/10 border-success text-success'
                        : 'border-border/40 text-muted-foreground hover:border-success/30'
                        }`}
                    >
                      {p === 'pago' ? '✅ Já Pago' : '💰 Pagar na Hora'}
                    </button>
                  ))}
                </div>
              </div>

              {(newDeliveryDate && newInstallationTime) && (
                <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-[11px] text-success font-medium">
                  ✨ Agendado para <strong>{format(new Date(newDeliveryDate + 'T12:00:00'), 'dd/MM/yyyy')}</strong> às <strong>{newInstallationTime}</strong>.
                  Pagamento: <strong>{newInstallationPaymentType === 'pago' ? 'Já Pago' : 'A pagar na hora'}</strong>.
                </div>
              )}
            </div>
          )}


          {/* Observações */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Observação</label>
            <textarea
              value={newObservation}
              onChange={e => setNewObservation(e.target.value)}
              placeholder="Observações importantes sobre o pedido (aparecem no financeiro e produção)..."
              className="input-modern w-full min-h-[80px] resize-y text-sm"
              rows={3}
            />
          </div>

          {/* Notas internas */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas Internas (opcional)</label>
            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Notas internas sobre o orçamento..."
              className="input-modern w-full resize-y text-sm"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <div className="text-sm text-muted-foreground">
              Total de itens: {newItems.reduce((s, i) => s + i.quantity, 0)} produto(s)
            </div>
            <div className="text-xl font-extrabold text-foreground">{formatCurrency(calcTotal())}</div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-scale-in">
              <span className="text-base">⚠</span>
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreateOrder}
              disabled={savingOrder}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingOrder ? (
                <><span className="animate-spin">⚙️</span> Processando...</>
              ) : isEdit ? (
                <><Check className="w-4 h-4" /> Salvar Alterações</>
              ) : (
                <><FileText className="w-4 h-4" /> Criar Orçamento</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detalhe do orçamento selecionado ────────────────────────
  if (selectedOrder) {
    const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(selectedOrder.status);
    const podeEnviarFinanceiro = ['rascunho', 'enviado', 'aprovado_cliente', 'rejeitado_financeiro', 'aguardando_financeiro'].includes(selectedOrder.status);

    return (
      <div ref={detailRef} className="card-section p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-foreground text-lg">{selectedOrder.number}</h2>
            {clients.find(c => c.id === selectedOrder.clientId)?.consignado && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                ⭐ Consignado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Botão Copiar Link de Rastreio */}
            <button
              onClick={() => handleCopyTracking(selectedOrder.id)}
              className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-1.5 hover:bg-primary/20"
              title="Copiar link de rastreio para o cliente"
            >
              <Link2 className="w-3.5 h-3.5" /> Rastreio
            </button>
            {/* Botão Download PDF */}
            <button
              onClick={() => downloadPDF(selectedOrder)}
              className="btn-modern bg-blue-500/10 text-blue-500 shadow-none text-xs px-3 py-1.5 hover:bg-blue-500/20"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            {/* Botão Editar — bloqueado se status avançado */}
            {podeEditar ? (
              <button
                onClick={() => { openEdit(selectedOrder); setSelectedOrder(null); }}
                className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-1.5 hover:bg-primary/20"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground px-3 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                🔒 Edição bloqueada
              </span>
            )}
            {/* Botão Excluir — apenas para rascunho ou rejeitado */}
            {podeExcluir(selectedOrder.status) && (
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.number)}
                disabled={deletingOrderId === selectedOrder.id}
                className="btn-modern bg-destructive/10 text-destructive shadow-none text-xs px-3 py-1.5 hover:bg-destructive/20 disabled:opacity-50"
                title="Excluir orçamento"
              >
                {deletingOrderId === selectedOrder.id
                  ? <span className="animate-spin">⚙️</span>
                  : <><Trash2 className="w-3.5 h-3.5" /> Excluir</>}
              </button>
            )}
            <button onClick={() => setSelectedOrder(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          </div>
        </div>

        {/* Pipeline visual */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progresso do Pedido</p>
          <OrderPipeline order={selectedOrder} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Cliente</span><span className="font-semibold text-foreground">{selectedOrder.clientName}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Status</span><StatusBadge status={selectedOrder.status} /></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Data</span><span className="text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}</span></div>
          <div className="p-3 rounded-xl bg-muted/30"><span className="text-xs text-muted-foreground block mb-1">Total</span><span className="font-extrabold text-foreground text-lg">{formatCurrency(selectedOrder.total)}</span></div>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="modern-table">
            <thead><tr><th>Produto</th><th>Descrição</th><th className="text-right">Qtd</th><th className="text-right hidden sm:table-cell">Unit.</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {selectedOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="text-foreground font-medium">
                    {item.product}
                    {item.product.toUpperCase().includes('KIT') && (
                      <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${(!item.sensorType || item.sensorType === 'com_sensor') ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'} border border-primary/30`}>
                        {(!item.sensorType || item.sensorType === 'com_sensor') ? '✅ COM SENSOR' : '⚪ SEM SENSOR'}
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground text-xs">{item.description || '—'}</td>
                  <td className="text-right text-foreground">{item.quantity}</td>
                  <td className="text-right text-foreground hidden sm:table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end pt-3 border-t border-border/40">
          <div className="text-xl font-extrabold text-foreground">Total: {formatCurrency(selectedOrder.total)}</div>
        </div>

        {/* Observação */}
        {selectedOrder.observation && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">📋 Observação</p>
            <p className="text-sm text-foreground">{selectedOrder.observation}</p>
          </div>
        )}

        {/* Histórico de status */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <History className="w-3 h-3" /> Histórico de Movimentações
          </p>
          <OrderHistory order={selectedOrder} />
        </div>

        {/* Botão "Enviar para Financeiro" — apenas para status corretos */}
        {podeEnviarFinanceiro && (() => {
          const clienteConsignado = !!clients.find(c => c.id === selectedOrder.clientId)?.consignado;
          const isInstalacao = selectedOrder.orderType === 'instalacao';
          const isManutencao = selectedOrder.orderType === 'manutencao';
          const isRetirada = selectedOrder.orderType === 'retirada';
          const isWaiting = selectedOrder.status === 'aguardando_financeiro';
          const temComprovante = (comprovantesAttached.length > 0) || (selectedOrder.receiptUrls && selectedOrder.receiptUrls.length > 0);

          // Consignado, Instalação, Manutenção ou Retirada: pode enviar sem comprovante. Normal: precisa de comprovante.
          const podeEnviar = (clienteConsignado || isInstalacao || isManutencao || isRetirada) ? true : temComprovante;

          return (
            <>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <ComprovanteUpload
                  values={comprovantesAttached.length > 0 ? comprovantesAttached : (selectedOrder.receiptUrls || [])}
                  onChange={setComprovantesAttached}
                  label={clienteConsignado
                    ? "Comprovantes de Pagamento (opcional para clientes consignados)"
                    : "Comprovantes de Pagamento (obrigatório para enviar ao Financeiro)"}
                />
                {clienteConsignado && !temComprovante && (
                  <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                    ⭐ Cliente consignado — pode enviar sem comprovante. O financeiro registrará os pagamentos parciais.
                  </p>
                )}
                {isInstalacao && !temComprovante && (
                  <p className="text-[10px] text-producao mt-2 flex items-center gap-1">
                    🔧 Pedido de Instalação — pode enviar sem comprovante (especialmente se for "Pagar na hora").
                  </p>
                )}
                {isManutencao && !temComprovante && (
                  <p className="text-[10px] text-indigo-500 mt-2 flex items-center gap-1">
                    🛠️ Pedido de Manutenção — pode enviar sem comprovante (especialmente se for "Pagar na hora").
                  </p>
                )}
                {isRetirada && !temComprovante && (
                  <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                    📦 Pedido de Retirada — pode enviar sem comprovante (especialmente se for "Cobrar no Local").
                  </p>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                {clients.find(c => c.id === selectedOrder.clientId)?.phone && (
                  <button
                    onClick={() => openWhatsApp(clients.find(c => c.id === selectedOrder.clientId)!.phone)}
                    className="btn-modern bg-success/10 text-success hover:bg-success/20 shadow-none text-xs"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Cliente
                  </button>
                )}
                <button
                  onClick={() => enviarFinanceiro(selectedOrder.id)}
                  disabled={(!podeEnviar && !isWaiting) || sendingToFinance}
                  className="btn-modern bg-gradient-to-r from-vendedor to-vendedor/80 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                >
                  <Send className="w-4 h-4" /> {sendingToFinance ? '⏳ Enviando...' : isWaiting ? '🔄 Atualizar Comprovantes' : '🟢 Enviar para Financeiro'}
                </button>
              </div>

              {!clienteConsignado && !isInstalacao && !isManutencao && !isRetirada && !temComprovante && (
                <p className="text-[10px] text-muted-foreground text-center">
                  ⚠️ Anexe o comprovante de pagamento para habilitar o envio ao financeiro
                </p>
              )}
            </>
          );
        })()}
      </div>
    );
  }

  // ── Lista de orçamentos ─────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Orçamentos</h1>
          <p className="page-subtitle">Gerencie seus orçamentos e vendas</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Orçamento
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input type="text" placeholder="Buscar pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-11" />
      </div>

      <div className="card-section">
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th className="hidden md:table-cell text-right">Valor</th>
                <th className="hidden lg:table-cell">Progresso</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const podeEditar = !STATUS_BLOQUEIAM_EDICAO.includes(order.status);
                return (
                  <tr key={order.id}>
                    <td className="font-bold text-foreground">{order.number}</td>
                    <td className="text-foreground">
                      <button
                        onClick={() => navigate('/vendedor/clientes', { state: { search: order.clientName } })}
                        className="hover:text-primary transition-colors text-left"
                        title="Ver ficha do cliente"
                      >
                        {order.clientName}
                      </button>
                    </td>
                    <td className="text-right font-semibold text-foreground hidden md:table-cell">{formatCurrency(order.total)}</td>
                    <td className="hidden lg:table-cell"><OrderPipeline order={order} compact /></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedOrder(order); setComprovantesAttached(order.receiptUrls || []); }}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center justify-center transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {podeEditar && (
                          <button
                            onClick={() => openEdit(order)}
                            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary inline-flex items-center justify-center transition-colors"
                            title="Editar orçamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(order.status === 'rascunho' || order.status === 'enviado' || order.status === 'aprovado_cliente') && (
                          <button
                            onClick={() => { setSelectedOrder(order); setComprovantesAttached(order.receiptUrls || []); }}
                            className="w-8 h-8 rounded-lg bg-vendedor/10 text-vendedor hover:bg-vendedor/20 inline-flex items-center justify-center transition-colors"
                            title="Enviar ao Financeiro"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {podeExcluir(order.status) && (
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.number)}
                            disabled={deletingOrderId === order.id}
                            className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Excluir orçamento"
                          >
                            {deletingOrderId === order.id
                              ? <span className="text-[10px] animate-spin">⚙️</span>
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {clients.find(c => c.id === order.clientId)?.phone && (
                          <button
                            onClick={() => openWhatsApp(clients.find(c => c.id === order.clientId)!.phone)}
                            className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 inline-flex items-center justify-center transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum orçamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrcamentosPage;
