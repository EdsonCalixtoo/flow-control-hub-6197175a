import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MelhorEnvioService } from './melhor-envio.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adicionar se existir autenticação

@Controller('melhor-envio')
export class MelhorEnvioController {
  constructor(private readonly melhorEnvioService: MelhorEnvioService) {}

  @Post('calculate')
  async calculateShipping(@Body() payload: any) {
    return this.melhorEnvioService.calculateShipping(payload);
  }

  // Rota que o financeiro vai chamar ao aprovar o pedido e gerar a NF
  @Post('process-label/:orderId')
  async processLabel(
    @Param('orderId') orderId: string,
    @Body('nfKey') nfKey: string,
    @Body('volumes') volumes?: any[]
  ) {
    return this.melhorEnvioService.processLabelForOrder(orderId, nfKey, volumes);
  }
}
