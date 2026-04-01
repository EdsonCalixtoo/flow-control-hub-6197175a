import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/components/shared/StatusBadge';

export interface ClosingPdfData {
  sellerName: string;
  referenceMonth: string;
  closingDate: string;
  totalSold: number;
  orderCount: number;
  outstandingValue: number;
  kitsComSensor: number;
  kitsSemSensor: number;
  premios: number;
  totalProducts: number;
  estribos: number;
  others: number;
}

export const generateClosingPDF = (data: ClosingPdfData, shouldDownload: boolean = true): Blob => {
  const doc = new jsPDF();
  
  // Design Tokens
  const primaryColor = [14, 165, 233]; // Sky-500
  const secondaryColor = [30, 41, 59]; // Slate-800
  const accentColor = [241, 245, 249]; // Slate-100
  const textColor = [51, 65, 85]; // Slate-700
  const lightTextColor = [148, 163, 184]; // Slate-400

  // 1. Sleek Header
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Add Logo (Using requested JPG logo)
  try {
    // Add a light background container for the logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(150, 12, 50, 25, 2, 2, 'F');
    // Horizontal logo dimensions adjustment
    doc.addImage('/Automatiza-logo-rgb-01.jpg', 'JPEG', 152, 15, 46, 18);
  } catch (e) {
    // Fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('AUTOMATIZA', 160, 25);
    doc.text('VANS', 160, 30);
  }

  // Title on the Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text('Relatório de', 20, 25);
  doc.text('Fechamento', 20, 37);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`Ciclo Mensal: ${data.referenceMonth}`, 20, 44);

  // 2. Info Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('DETALHES DO VENDEDOR', 20, 65);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1);
  doc.line(20, 68, 40, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Nome do Profissional:', 20, 78);
  doc.setFont('helvetica', 'bold');
  doc.text(data.sellerName.toUpperCase(), 65, 78);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Data de Emissão:', 20, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(data.closingDate).toLocaleString('pt-BR'), 65, 85);

  // 3. Performance Grid (Modern Cards)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(20, 100, 80, 50, 4, 4, 'F');
  doc.roundedRect(110, 100, 80, 50, 4, 4, 'F');

  // Card Left: Financeiro
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DESEMPENHO FINANCEIRO', 25, 110);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Total Vendido', 25, 122);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totalSold), 95, 122, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('Qtd. de Pedidos', 25, 131);
  doc.setFont('helvetica', 'bold');
  doc.text(data.orderCount.toString(), 95, 131, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38); // Crimson-600
  doc.text('Valor em Aberto', 25, 140);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.outstandingValue), 95, 140, { align: 'right' });

  // Card Right: Kits
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PRODUTOS E BRINDES', 115, 110);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  doc.text('Total de Produtos', 115, 117);
  doc.setFont('helvetica', 'bold');
  doc.text(data.totalProducts.toString(), 185, 117, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9); // Font smaller for components
  doc.text('Kits c/ Sensor', 115, 126);
  doc.text(data.kitsComSensor.toString(), 185, 126, { align: 'right' });
  
  doc.text('Kits s/ Sensor', 115, 135);
  doc.text(data.kitsSemSensor.toString(), 185, 135, { align: 'right' });
  
  doc.text('Estribos', 115, 144);
  doc.text(data.estribos.toString(), 185, 144, { align: 'right' });

  // Outros Itens e Premiações REMOVIDOS da contagem principal conforme solicitação.
  // Manteremos as métricas nos dados para auditoria interna, mas não aparecem no PDF final de venda.

  // 4. Declaration Section
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 165, 170, 35, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('DECLARAÇÃO DE CONFORMIDADE', 25, 173);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const words = `Certificamos que o vendedor ${data.sellerName} completou o ciclo operacional de ${data.referenceMonth}. Foram validados ${data.orderCount} pedidos com receita bruta de ${formatCurrency(data.totalSold)}. Este documento serve como base para conciliação financeira entre as partes.`;
  const splitTitle = doc.splitTextToSize(words, 160);
  doc.text(splitTitle, 25, 182);

  // 5. Signatures (Modernized)
  const sigY = 240;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  
  // Financeiro Signature
  doc.line(25, sigY, 90, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Assinatura Financeiro', 57.5, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DEPARTAMENTO FINANCEIRO', 57.5, sigY + 11, { align: 'center' });

  // Vendedor Signature
  doc.line(120, sigY, 185, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Assinatura Vendedor', 152.5, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(data.sellerName.toUpperCase(), 152.5, sigY + 11, { align: 'center' });

  // 6. Footer
  doc.setFontSize(8);
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Este relatório foi gerado automaticamente pelo ERP Flow Control Hub.', 105, 285, { align: 'center' });
  doc.text('A reprodução não autorizada deste documento é proibida.', 105, 290, { align: 'center' });

  const fileName = `fechamento_${data.sellerName.replace(/\s+/g, '_')}_${data.referenceMonth.replace('/', '_')}.pdf`;
  
  if (shouldDownload) {
    doc.save(fileName);
  }

  return doc.output('blob');
};

export interface SellerItemsPdfData {
  sellerName: string;
  referenceMonth: string;
  items: {
    product: string;
    quantity: number;
    orderNumber: string;
    clientName: string;
    date: string;
  }[];
}

export const generateSellerItemsPDF = (data: SellerItemsPdfData): void => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Relatório de Itens Vendidos', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vendedor: ${data.sellerName} | Referência: ${data.referenceMonth}`, 20, 32);

  // --- 1. Resumo Agrupado (NOVA SEÇÃO) ---
  let y = 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('RESUMO DE VENDAS (TOTAL POR PRODUTO)', 20, y);
  
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, 170, 8, 'F');
  
  doc.setFontSize(9);
  doc.text('PRODUTO', 25, y + 5);
  doc.text('QTD TOTAL', 185, y + 5, { align: 'right' });

  // Agrupamento
  const productTotals: Record<string, number> = {};
  data.items.forEach(item => {
    productTotals[item.product] = (productTotals[item.product] || 0) + item.quantity;
  });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  Object.entries(productTotals).sort((a, b) => b[1] - a[1]).forEach(([name, qty]) => {
     doc.text(name, 25, y);
     doc.setFont('helvetica', 'bold');
     doc.text(qty.toString(), 185, y, { align: 'right' });
     doc.setFont('helvetica', 'normal');
     y += 7;
     doc.setDrawColor(241, 245, 249);
     doc.line(20, y - 2, 190, y - 2);
  });

  // --- 2. Detalhamento por Pedido ---
  y += 15;
  if (y > 250) { doc.addPage(); y = 20; }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('DETALHAMENTO DOS PEDIDOS', 20, y);

  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(20, y, 170, 8, 'F');
  
  doc.setFontSize(9);
  doc.text('DATA', 22, y + 5);
  doc.text('PEDIDO', 45, y + 5);
  doc.text('CLIENTE', 70, y + 5);
  doc.text('PRODUTO', 110, y + 5);
  doc.text('QTD', 185, y + 5, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  data.items.forEach((item, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(item.date, 22, y);
    doc.text(item.orderNumber, 45, y);
    
    const clientName = item.clientName.length > 20 ? item.clientName.substring(0, 18) + '...' : item.clientName;
    doc.text(clientName, 70, y);
    
    const productName = item.product.length > 40 ? item.product.substring(0, 38) + '...' : item.product;
    doc.text(productName, 110, y);
    
    doc.text(item.quantity.toString(), 185, y, { align: 'right' });
    
    y += 7;
    doc.setDrawColor(241, 245, 249);
    doc.line(20, y - 2, 190, y - 2);
  });

  // Footer resumo
  y += 10;
  const totalItems = data.items.reduce((sum, i) => sum + i.quantity, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL DE ITENS: ${totalItems}`, 185, y, { align: 'right' });

  const fileName = `itens_vendidos_${data.sellerName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};

export interface FinanceiroPdfData {
  totalPending: number;
  totalReceived: number;
  totalAproval: number;
  orders: {
    number: string;
    client: string;
    seller: string;
    status: string;
    total: number;
    pending: number;
  }[];
}

export const generateFinanceiroDashboardPDF = (data: FinanceiroPdfData) => {
  const doc = new jsPDF();
  const primaryColor = [16, 185, 129]; // Emerald-500
  const secondaryColor = [15, 23, 42]; // Slate-900
  const textColor = [51, 65, 85];
  
  // Header background
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Financeiro', 20, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`, 20, 32);

  // Stats Table
  let y = 60;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', 20, y);
  
  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y, 170, 25, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('A RECEBER TOTAL', 25, y + 8);
  doc.text('TOTAL RECEBIDO', 85, y + 8);
  doc.text('AGUARD. APROVAÇÃO', 145, y + 8);
  
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`R$ ${data.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, y + 18);
  doc.text(`R$ ${data.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 85, y + 18);
  doc.text(data.totalAproval.toString(), 145, y + 18);

  // Table Orders
  y += 40;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDOS EM MONITORAMENTO', 20, y);
  
  y += 8;
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(20, y, 170, 8, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PEDIDO', 25, y + 5);
  doc.text('CLIENTE', 45, y + 5);
  doc.text('STATUS', 100, y + 5);
  doc.text('TOTAL', 145, y + 5);
  doc.text('SALDO', 185, y + 5, { align: 'right' });

  y += 12;
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  data.orders.forEach((order) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(order.number, 25, y);
    doc.setFont('helvetica', 'normal');
    
    const clientName = order.client.length > 25 ? order.client.substring(0, 23) + '...' : order.client;
    doc.text(clientName, 45, y);
    
    doc.text(order.status.toUpperCase(), 100, y);
    doc.text(`R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 145, y);
    
    doc.setFont('helvetica', 'bold');
    if (order.pending > 0) doc.setTextColor(220, 38, 38);
    doc.text(`R$ ${order.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 185, y, { align: 'right' });
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    
    y += 7;
    doc.setDrawColor(241, 245, 249);
    doc.line(20, y - 2, 190, y - 2);
  });

  doc.save(`relatorio_financeiro_${new Date().getTime()}.pdf`);
};
