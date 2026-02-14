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
  city: string;
  state: string;
  cep: string;
  notes: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  product: string;
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
  | 'produto_liberado';

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
  statusHistory: StatusHistoryEntry[];
}

export const STATUS_FLOW: OrderStatus[] = [
  'rascunho',
  'aguardando_financeiro',
  'aprovado_financeiro',
  'aguardando_gestor',
  'aprovado_gestor',
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
