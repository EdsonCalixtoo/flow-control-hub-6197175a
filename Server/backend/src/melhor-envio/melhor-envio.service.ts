import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MelhorEnvioService {
  // URL base controlada pelo .env (sandbox ou oficial). Padrão é a oficial se não definido.
  private readonly baseUrl = process.env.MELHOR_ENVIO_URL || 'https://www.melhorenvio.com.br/api/v2/me';
  private readonly token = process.env.MELHOR_ENVIO_TOKEN; // O token será configurado no .env

  constructor(private prisma: PrismaService) {}

  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    if (!this.token) {
      throw new HttpException('Melhor Envio token not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'User-Agent': 'FlowControlHub (edson@example.com)', // Requisito do Melhor Envio
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Melhor Envio API Error:', JSON.stringify(data, null, 2));
      throw new HttpException(data.message || 'Erro na API do Melhor Envio', response.status);
    }
    return data;
  }

  // 1. Cotação de Frete
  async calculateShipping(payload: any) {
    return this.fetchApi('/shipment/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 2. Adicionar ao Carrinho
  async addToCart(payload: any) {
    return this.fetchApi('/cart', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 3. Fazer Checkout (Pagar)
  async checkout(orderId: string) {
    return this.fetchApi('/shipment/checkout', {
      method: 'POST',
      body: JSON.stringify({ orders: [orderId] }),
    });
  }

  // 4. Gerar Etiqueta
  async generateLabel(orderId: string) {
    return this.fetchApi('/shipment/generate', {
      method: 'POST',
      body: JSON.stringify({ orders: [orderId] }),
    });
  }

  // 5. Imprimir Etiqueta
  async printLabel(orderId: string) {
    return this.fetchApi('/shipment/print', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'public', // Retorna URL pública do PDF
        layout: 'zebra', // Zebra é o formato 10x15 termica
        orders: [orderId]
      }),
    });
  }

  // Método Principal: Processa a compra da etiqueta quando o financeiro aprova
  async processLabelForOrder(
    orderId: string, 
    nfKey: string,
    volumes: any[] = [{ peso: 1, altura: 10, largura: 20, comprimento: 30 }],
    insuranceValue?: number
  ) {
    // 1. Busca o pedido no banco
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    
    // Busca o invoice_value separadamente via query raw pois ele não está no schema.prisma ainda!
    let rawInvoiceValue: number | null = null;
    try {
      const rawRes: any[] = await this.prisma.$queryRaw`SELECT invoice_value FROM orders WHERE id = ${orderId}`;
      if (rawRes && rawRes.length > 0 && rawRes[0].invoice_value) {
        rawInvoiceValue = Number(rawRes[0].invoice_value);
      }
    } catch (e) {
      console.log('Erro ao buscar invoice_value raw:', e);
    }
    
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
    
    if (order.carrier !== 'MELHOR ENVIO') {
      return { success: false, message: 'Pedido não é do Melhor Envio' };
    }

    let client: any = null;
    if (order.client_id) {
      client = await this.prisma.clients.findUnique({ where: { id: order.client_id } });
    }

    const extractNumbers = (str: string) => (str || '').replace(/\D/g, '');
    
    const clientDoc = extractNumbers(client?.cpf_cnpj || '') || '07173887780';
    const clientPhone = extractNumbers(client?.phone || '') || '11999999999';
    const clientCep = extractNumbers(client?.cep || '') || '20040002';
    
    let addressName = client?.address || 'Endereço não informado';
    let addressNum = 'S/N';
    if (addressName.includes(',')) {
      const parts = addressName.split(',');
      addressName = parts[0].trim();
      addressNum = parts[1].trim();
    }

    const cartVolumes = volumes.map(v => ({
      height: Number(v.altura) || 10,
      width: Number(v.largura) || 20,
      length: Number(v.comprimento) || 30,
      weight: Number(v.peso) || 1
    }));

    // 2.5 Configura opções de envio (Com ou sem Nota Fiscal)
    // Se recebeu um valor de seguro específico ou tem salvo no banco (digitado no Financeiro), usa ele. Senão, usa o total do pedido.
    const orderTotal = insuranceValue ? Number(insuranceValue) : (rawInvoiceValue ? rawInvoiceValue : (Number(order.total) || 100));
    const shippingOptions: any = {
      receipt: false,
      own_hand: false,
    };

    if (nfKey && nfKey.trim().length > 0) {
      // Com Nota Fiscal: Seguro total
      shippingOptions.invoice = { key: nfKey.trim() };
      shippingOptions.insurance_value = orderTotal;
    } else {
      // Sem Nota Fiscal (Declaração de Conteúdo): Limita seguro a R$ 1.500
      shippingOptions.non_commercial = true;
      shippingOptions.insurance_value = Math.min(orderTotal, 1500);
    }

        // 3. Monta o payload genérico para cálculo (sem a transportadora ainda)
    const basePayload = {
      from: {
        name: "Grupo Automatiza",
        phone: "19981984593",
        email: "grupoautomatiza@gmail.com",
        document: "38584898832",
        company_document: "13559664000137",
        address: "Rua Doutor Élton Cesar",
        number: "910",
        district: "Campos Dos Amarais",
        city: "Campinas",
        state_abbr: "SP",
        country_id: "BR",
        postal_code: "13082025"
      },
      to: {
        name: order.client_name || client?.name || 'Cliente',
        phone: clientPhone,
        email: client?.email || "cliente@email.com",
        document: clientDoc.length > 11 ? '07173887780' : clientDoc,
        company_document: clientDoc.length > 11 ? clientDoc : undefined,
        address: addressName,
        number: addressNum,
        district: client?.bairro || "Centro",
        city: client?.city || "Rio de Janeiro",
        state_abbr: client?.state || "RJ",
        country_id: "BR",
        postal_code: clientCep
      },
      products: [
        {
          name: "Produtos do Pedido",
          quantity: 1,
          unitary_value: orderTotal
        }
      ],
      volumes: cartVolumes,
      options: shippingOptions
    };
    try {
      // Monta o payload final fixo na Jadlog .Com (ID 4) conforme solicitado
      const cartPayload = {
        ...basePayload,
        service: 4 // 4 = Jadlog .Com
      };

      // Passo 1: Adiciona ao Carrinho
      const cartResponse = await this.addToCart(cartPayload);const melhorEnvioOrderId = cartResponse.id;
      console.log('[MelhorEnvio] Cart response:', JSON.stringify(cartResponse, null, 2));

      // Passo 2: Checkout (Usa o saldo da carteira para pagar)
      await this.checkout(melhorEnvioOrderId);

      // Passo 3: Gera a Etiqueta
      const generateResponse = await this.generateLabel(melhorEnvioOrderId);
      console.log('[MelhorEnvio] Generate response:', JSON.stringify(generateResponse, null, 2));

      // Passo 4: Pega a URL de Impressão
      const printResponse = await this.printLabel(melhorEnvioOrderId);
      const labelUrl = printResponse.url;

      // Passo 5: Busca detalhes do pedido para pegar o código de rastreio real
      let trackingCode = cartResponse.tracking || cartResponse.tracking_code || null;
      try {
        const orderDetails = await this.fetchApi(`/shipment/order/${melhorEnvioOrderId}`);
        console.log('[MelhorEnvio] Order details:', JSON.stringify(orderDetails, null, 2));
        trackingCode = orderDetails?.tracking 
          || orderDetails?.tracking_code 
          || orderDetails?.protocol 
          || cartResponse.tracking 
          || cartResponse.tracking_code 
          || null;
      } catch (detailErr) {
        console.warn('[MelhorEnvio] Não foi possível buscar detalhes do pedido para tracking:', detailErr);
      }

      // Atualiza o banco de dados
      await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          melhor_envio_order_id: melhorEnvioOrderId,
          melhor_envio_label_url: labelUrl,
          melhor_envio_status: 'label_generated',
          ...(trackingCode ? { melhor_envio_tracking: trackingCode } : {})
        }
      });

      return { success: true, labelUrl, trackingCode };

    } catch (error: any) {
      console.error('Erro ao processar Melhor Envio:', error);
      // Se o erro já for uma HttpException (que criamos no fetchApi com a mensagem original), repassamos ela
      if (error instanceof HttpException) {
        throw error;
      }
      // Caso contrário, enviamos uma mensagem genérica com o texto do erro
      throw new HttpException(
        error.message || 'Falha na integração com Melhor Envio', 
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
