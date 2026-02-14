import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Order, Client, FinancialEntry, OrderStatus, StatusHistoryEntry } from '@/types/erp';

interface ERPContextType {
  orders: Order[];
  clients: Client[];
  financialEntries: FinancialEntry[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => void;
  addClient: (client: Client) => void;
  addFinancialEntry: (entry: FinancialEntry) => void;
}

const ERPContext = createContext<ERPContextType | null>(null);

const h = (status: OrderStatus, user: string, ts: string, note?: string): StatusHistoryEntry => ({ status, timestamp: ts, user, note });

const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Tech Solutions Ltda', cpfCnpj: '12.345.678/0001-90', phone: '11999887766', email: 'contato@techsolutions.com', address: 'Rua Augusta, 1500', city: 'São Paulo', state: 'SP', cep: '01304-001', notes: 'Cliente premium', createdAt: '2025-01-15' },
  { id: 'c2', name: 'João Pereira', cpfCnpj: '123.456.789-00', phone: '21988776655', email: 'joao@email.com', address: 'Av. Copacabana, 200', city: 'Rio de Janeiro', state: 'RJ', cep: '22070-001', notes: '', createdAt: '2025-02-01' },
  { id: 'c3', name: 'Indústria ABC S.A.', cpfCnpj: '98.765.432/0001-10', phone: '31977665544', email: 'compras@abc.com', address: 'Rod. BR-040, Km 12', city: 'Belo Horizonte', state: 'MG', cep: '30000-000', notes: 'Grandes volumes', createdAt: '2025-01-20' },
  { id: 'c4', name: 'Maria Fernandes ME', cpfCnpj: '45.678.901/0001-23', phone: '41966554433', email: 'maria@fernandes.com', address: 'Rua XV de Novembro, 300', city: 'Curitiba', state: 'PR', cep: '80020-310', notes: '', createdAt: '2025-03-05' },
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'o1', number: 'PED-001', clientId: 'c1', clientName: 'Tech Solutions Ltda', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i1', product: 'Servidor Dell PowerEdge', quantity: 2, unitPrice: 15000, discount: 5, discountType: 'percent', total: 28500 }],
    subtotal: 28500, taxes: 2850, total: 31350, status: 'aguardando_financeiro', notes: 'Urgente', createdAt: '2025-12-01', updatedAt: '2025-12-02',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-12-01T10:00:00', 'Orçamento criado'),
      h('aguardando_financeiro', 'Carlos Silva', '2025-12-02T09:00:00', 'Enviado para aprovação financeira'),
    ],
  },
  {
    id: 'o2', number: 'PED-002', clientId: 'c2', clientName: 'João Pereira', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i2', product: 'Notebook Lenovo ThinkPad', quantity: 5, unitPrice: 4500, discount: 10, discountType: 'percent', total: 20250 }],
    subtotal: 20250, taxes: 2025, total: 22275, status: 'em_producao', notes: '', createdAt: '2025-11-28', updatedAt: '2025-12-05', productionStartedAt: '2025-12-05',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-11-28T08:00:00'),
      h('aguardando_financeiro', 'Carlos Silva', '2025-11-28T14:00:00'),
      h('aprovado_financeiro', 'Ana Costa', '2025-11-29T10:00:00', 'Pagamento confirmado via Pix'),
      h('aguardando_gestor', 'Ana Costa', '2025-11-29T10:05:00'),
      h('aprovado_gestor', 'Ricardo Souza', '2025-12-01T11:00:00'),
      h('aguardando_producao', 'Ricardo Souza', '2025-12-01T11:05:00'),
      h('em_producao', 'Equipe Produção', '2025-12-05T08:00:00', 'Produção iniciada'),
    ],
  },
  {
    id: 'o3', number: 'PED-003', clientId: 'c3', clientName: 'Indústria ABC S.A.', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i3', product: 'Switch Cisco 48 portas', quantity: 10, unitPrice: 3200, discount: 0, discountType: 'percent', total: 32000 }],
    subtotal: 32000, taxes: 3200, total: 35200, status: 'aprovado_financeiro', notes: '', paymentMethod: 'Boleto', paymentStatus: 'pago', createdAt: '2025-11-25', updatedAt: '2025-12-03',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-11-25T09:00:00'),
      h('aguardando_financeiro', 'Carlos Silva', '2025-11-25T15:00:00'),
      h('aprovado_financeiro', 'Ana Costa', '2025-12-03T14:00:00', 'Boleto compensado'),
    ],
  },
  {
    id: 'o4', number: 'PED-004', clientId: 'c4', clientName: 'Maria Fernandes ME', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i4', product: 'Monitor LG 27"', quantity: 3, unitPrice: 1800, discount: 200, discountType: 'value', total: 5200 }],
    subtotal: 5200, taxes: 520, total: 5720, status: 'rascunho', notes: 'Aguardando confirmação', createdAt: '2025-12-08', updatedAt: '2025-12-08',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-12-08T10:00:00', 'Orçamento criado'),
    ],
  },
  {
    id: 'o5', number: 'PED-005', clientId: 'c1', clientName: 'Tech Solutions Ltda', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i5', product: 'Cabo de rede Cat6 (cx)', quantity: 50, unitPrice: 180, discount: 15, discountType: 'percent', total: 7650 }],
    subtotal: 7650, taxes: 765, total: 8415, status: 'producao_finalizada', notes: '', createdAt: '2025-11-20', updatedAt: '2025-12-06', productionStartedAt: '2025-12-04', productionFinishedAt: '2025-12-06',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-11-20T08:00:00'),
      h('aguardando_financeiro', 'Carlos Silva', '2025-11-20T16:00:00'),
      h('aprovado_financeiro', 'Ana Costa', '2025-11-21T09:00:00'),
      h('aguardando_gestor', 'Ana Costa', '2025-11-21T09:05:00'),
      h('aprovado_gestor', 'Ricardo Souza', '2025-11-22T10:00:00'),
      h('aguardando_producao', 'Ricardo Souza', '2025-11-22T10:05:00'),
      h('em_producao', 'Equipe Produção', '2025-12-04T07:00:00'),
      h('producao_finalizada', 'Equipe Produção', '2025-12-06T16:00:00', 'Produção concluída'),
    ],
  },
  {
    id: 'o6', number: 'PED-006', clientId: 'c2', clientName: 'João Pereira', sellerId: '1', sellerName: 'Carlos Silva',
    items: [{ id: 'i6', product: 'Teclado Mecânico', quantity: 20, unitPrice: 350, discount: 0, discountType: 'percent', total: 7000 }],
    subtotal: 7000, taxes: 700, total: 7700, status: 'aguardando_gestor', notes: '', paymentMethod: 'Pix', paymentStatus: 'pago', createdAt: '2025-12-02', updatedAt: '2025-12-07',
    statusHistory: [
      h('rascunho', 'Carlos Silva', '2025-12-02T08:00:00'),
      h('aguardando_financeiro', 'Carlos Silva', '2025-12-02T14:00:00'),
      h('aprovado_financeiro', 'Ana Costa', '2025-12-05T10:00:00', 'Pix confirmado'),
      h('aguardando_gestor', 'Ana Costa', '2025-12-07T09:00:00'),
    ],
  },
];

const MOCK_FINANCIAL: FinancialEntry[] = [
  { id: 'f1', type: 'receita', description: 'Pagamento PED-003', amount: 35200, category: 'Vendas', date: '2025-12-03', status: 'pago' },
  { id: 'f2', type: 'despesa', description: 'Aluguel escritório', amount: 5500, category: 'Infraestrutura', date: '2025-12-01', status: 'pago' },
  { id: 'f3', type: 'despesa', description: 'Energia elétrica', amount: 1200, category: 'Infraestrutura', date: '2025-12-05', status: 'pendente' },
  { id: 'f4', type: 'receita', description: 'Pagamento PED-006', amount: 7700, category: 'Vendas', date: '2025-12-07', status: 'pago' },
  { id: 'f5', type: 'despesa', description: 'Folha de pagamento', amount: 28000, category: 'Pessoal', date: '2025-12-05', status: 'pago' },
  { id: 'f6', type: 'receita', description: 'Pagamento PED-005', amount: 8415, category: 'Vendas', date: '2025-12-06', status: 'pago' },
];

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(MOCK_FINANCIAL);

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus, extra?: Partial<Order>, userName?: string, note?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const historyEntry: StatusHistoryEntry = {
        status,
        timestamp: new Date().toISOString(),
        user: userName || 'Sistema',
        note,
      };
      return {
        ...o,
        status,
        updatedAt: new Date().toISOString(),
        statusHistory: [...o.statusHistory, historyEntry],
        ...extra,
      };
    }));
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients(prev => [client, ...prev]);
  }, []);

  const addFinancialEntry = useCallback((entry: FinancialEntry) => {
    setFinancialEntries(prev => [entry, ...prev]);
  }, []);

  return (
    <ERPContext.Provider value={{ orders, clients, financialEntries, addOrder, updateOrderStatus, addClient, addFinancialEntry }}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be used within ERPProvider');
  return ctx;
};
