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
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Kits c/ Sensor', 115, 122);
  doc.setFont('helvetica', 'bold');
  doc.text(data.kitsComSensor.toString(), 185, 122, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('Kits s/ Sensor', 115, 131);
  doc.setFont('helvetica', 'bold');
  doc.text(data.kitsSemSensor.toString(), 185, 131, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(13, 148, 136); // Teal-600
  doc.text('Premiações', 115, 140);
  doc.setFont('helvetica', 'bold');
  doc.text(data.premios.toString(), 185, 140, { align: 'right' });

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
