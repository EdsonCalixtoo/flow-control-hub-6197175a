import { Module } from '@nestjs/common';
import { MelhorEnvioService } from './melhor-envio.service';
import { MelhorEnvioController } from './melhor-envio.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MelhorEnvioController],
  providers: [MelhorEnvioService, PrismaService],
  exports: [MelhorEnvioService],
})
export class MelhorEnvioModule {}
