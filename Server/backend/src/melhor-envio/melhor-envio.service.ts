import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MelhorEnvioService {
  private readonly baseUrl = 'https://sandbox.melhorenvio.com.br/api/v2/me'; // Sandbox para testes
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
    volumes: any[] = [{ peso: 1, altura: 10, largura: 20, comprimento: 30 }]
  ) {
    // 1. Busca o pedido no banco
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    
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

    // 2. Monta o payload para o carrinho (Aqui estamos mockando os dados do rementente, mas usando os dados reais do destinatario)
    const cartPayload = {
      service: 3, // 3 = Jadlog Package (Evita o erro 'Transportadora não atende este trecho' do Correios no Sandbox)
      // agency: Number(process.env.MELHOR_ENVIO_AGENCY) || 12120, // Removido para testes com Correios
      from: {
        name: "Sua Empresa",
        phone: "11999999999",
        email: "contato@empresa.com",
        document: "82223576036", // CPF válido do responsável
        company_document: "00000000000191", // CNPJ que bate com a Chave da NFe
        address: "Rua Exemplo",
        number: "123",
        district: "Centro",
        city: "São Paulo",
        state_abbr: "SP",
        country_id: "BR",
        postal_code: "01001000"
      },
      to: {
        name: order.client_name || client?.name || 'Cliente',
        phone: clientPhone,
        email: client?.email || "cliente@email.com",
        document: clientDoc,
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
          unitary_value: Number(order.total) || 100
        }
      ],
      volumes: cartVolumes,
      options: {
        insurance_value: Number(order.total) || 100,
        receipt: false,
        own_hand: false,
        invoice: {
          key: nfKey // A chave da NF enviada pelo financeiro
        }
      }
    };

    try {
      // Passo 1: Adiciona ao Carrinho
      const cartResponse = await this.addToCart(cartPayload);
      const melhorEnvioOrderId = cartResponse.id;

      // Passo 2: Checkout (Usa o saldo da carteira para pagar)
      await this.checkout(melhorEnvioOrderId);

      // Passo 3: Gera a Etiqueta
      await this.generateLabel(melhorEnvioOrderId);

      // Passo 4: Pega a URL de Impressão e o Rastreio
      const printResponse = await this.printLabel(melhorEnvioOrderId);
      const labelUrl = printResponse.url;

      // Atualiza o banco de dados
      await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          melhor_envio_order_id: melhorEnvioOrderId,
          melhor_envio_label_url: labelUrl,
          melhor_envio_status: 'label_generated',
          // melhor_envio_tracking: cartResponse.tracking // Pegaria daqui dependendo da resposta
        }
      });

      return { success: true, labelUrl };

    } catch (error) {
      console.error('Erro ao processar Melhor Envio:', error);
      throw new HttpException('Falha na integração com Melhor Envio', HttpStatus.BAD_REQUEST);
    }
  }
}
