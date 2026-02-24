export type UserRole = 'vendedor' | 'financeiro' | 'gestor' | 'producao';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
  bairro?: string;          // campo bairro
  city: string;
  state: string;
  cep: string;
  notes: string;
  consignado?: boolean;
  createdBy?: string;       // ID do vendedor que cadastrou o cliente
  createdAt: string;
}


export interface QuoteItem {
  id: string;
  product: string;
  description?: string;   // descrição completa do produto
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percent' | 'value';
  total: number;
}

export type OrderStatus =
  | 'rascunho'
  | 'enviado'
  | 'aprovado_cliente'
  | 'aguardando_financeiro'
  | 'aprovado_financeiro'
  | 'rejeitado_financeiro'
  | 'aguardando_gestor'
  | 'aprovado_gestor'
  | 'rejeitado_gestor'
  | 'aguardando_producao'
  | 'em_producao'
  | 'producao_finalizada'
  | 'produto_liberado'
  | 'retirado_entregador';

export type ProductionStatus = 'em_producao' | 'agendado' | 'atrasado' | 'finalizado';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  user: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  sellerId: string;
  sellerName: string;
  items: QuoteItem[];
  subtotal: number;
  taxes: number;
  total: number;
  status: OrderStatus;
  notes: string;
  observation?: string;         // campo de observação do orçamento
  paymentMethod?: string;
  paymentStatus?: 'pago' | 'parcial' | 'pendente';
  installments?: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: string;
  productionStartedAt?: string;
  productionFinishedAt?: string;
  releasedAt?: string;
  releasedBy?: string;
  receiptUrl?: string;
  deliveryDate?: string;
  scheduledDate?: string;        // data de agendamento da produção
  orderType?: 'entrega' | 'instalacao';
  productionStatus?: ProductionStatus;  // status detalhado de produção
  statusHistory: StatusHistoryEntry[];
  // chat
  chatMessages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId?: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
  readBy: string[];  // array de roles que já leram
}

export interface OrderReturn {
  id: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  reason: string;
  reportedBy: string;
  createdAt: string;
}

// Leitura de código de barras pela produção
export interface BarcodeScan {
  id: string;
  orderId: string;
  orderNumber: string;
  scannedBy: string;
  scannedAt: string;
  success: boolean;
  note?: string;
}

// Retirada confirmada pelo entregador
export interface DeliveryPickup {
  id: string;
  orderId: string;
  orderNumber: string;
  delivererName: string;
  photoUrl: string;       // base64 da foto do rosto
  signatureUrl: string;  // base64 da assinatura
  pickedUpAt: string;
  note?: string;
}

export interface ProductionError {
  id: string;
  orderId?: string;
  orderNumber?: string;
  clientName?: string;
  description: string;
  reportedBy: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export const STATUS_FLOW: OrderStatus[] = [
  'rascunho',
  'aguardando_financeiro',
  'aprovado_financeiro',
  'aguardando_producao',
  'em_producao',
  'producao_finalizada',
  'produto_liberado',
];

export interface FinancialEntry {
  id: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'pago' | 'pendente';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: string;
  supplier: string;
  status: 'ativo' | 'inativo' | 'esgotado';
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado_cliente: 'Aprovado pelo Cliente',
  aguardando_financeiro: 'Aguardando Financeiro',
  aprovado_financeiro: 'Aprovado Financeiro',
  rejeitado_financeiro: 'Rejeitado Financeiro',
  aguardando_gestor: 'Aguardando Gestor',
  aprovado_gestor: 'Aprovado Gestor',
  rejeitado_gestor: 'Rejeitado Gestor',
  aguardando_producao: 'Aguardando Produção',
  em_producao: 'Em Produção',
  producao_finalizada: 'Produção Finalizada',
  produto_liberado: 'Produto Liberado',
  retirado_entregador: 'Retirado pelo Entregador',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  enviado: 'bg-info/10 text-info',
  aprovado_cliente: 'bg-info/10 text-info',
  aguardando_financeiro: 'bg-warning/10 text-warning',
  aprovado_financeiro: 'bg-success/10 text-success',
  rejeitado_financeiro: 'bg-destructive/10 text-destructive',
  aguardando_gestor: 'bg-warning/10 text-warning',
  aprovado_gestor: 'bg-success/10 text-success',
  rejeitado_gestor: 'bg-destructive/10 text-destructive',
  aguardando_producao: 'bg-warning/10 text-warning',
  em_producao: 'bg-producao/10 text-producao',
  producao_finalizada: 'bg-success/10 text-success',
  produto_liberado: 'bg-success/10 text-success',
  retirado_entregador: 'bg-primary/10 text-primary',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
  gestor: 'Gestor',
  producao: 'Produção',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  vendedor: 'bg-vendedor',
  financeiro: 'bg-financeiro',
  gestor: 'bg-gestor',
  producao: 'bg-producao',
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  em_producao: 'Em Produção',
  agendado: 'Agendado',
  atrasado: 'Atrasado',
  finalizado: 'Finalizado',
};

export const PRODUCTION_STATUS_COLORS: Record<ProductionStatus, string> = {
  em_producao: 'bg-producao/10 text-producao',
  agendado: 'bg-primary/10 text-primary',
  atrasado: 'bg-destructive/10 text-destructive',
  finalizado: 'bg-success/10 text-success',
};

// Relatorio de atraso enviado da producao para o gestor
export interface DelayReport {
  id: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  orderType: 'entrega' | 'instalacao';
  deliveryDate?: string;
  orderTotal: number;
  reason: string;
  sentAt: string;
  readAt?: string;
  sentBy: string;
}
