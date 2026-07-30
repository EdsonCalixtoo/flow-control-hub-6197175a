import type { FinancialEntry } from '@/types/erp';

export const cleanNum = (n: string) => n.replace('#', '').trim().toLowerCase();

export const getSaldoDevedor = (
  orderId: string, 
  orderTotal: number, 
  financialEntries: FinancialEntry[],
  paymentStatus?: string, 
  orderNumber?: string
): number => {
  // Se o status já é PAGO, o saldo devedor é ABSOLUTAMENTE zero
  if (paymentStatus?.toLowerCase() === 'pago') return 0;

  const targetNum = orderNumber ? cleanNum(orderNumber) : null;

  // Busca pagamentos por ID ou por Número Limpo (PED-024 === #PED-024)
  const pagos = financialEntries
    .filter(e => {
      const matchesId = e.orderId === orderId;
      const matchesNumber = targetNum && e.orderNumber && cleanNum(e.orderNumber) === targetNum;
      const isReceita = e.type?.toLowerCase() === 'receita';
      const isNotCancelled = e.status?.toLowerCase() !== 'cancelado';
      return (matchesId || matchesNumber) && isReceita && isNotCancelled;
    })
    .reduce((s, e) => s + e.amount, 0);
  
  const saldo = orderTotal - pagos;
  // Retorna o saldo, garantindo que não fique negativo (por erros de arredondamento)
  return saldo > 0 ? saldo : 0;
};
