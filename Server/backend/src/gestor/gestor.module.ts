import { Module } from '@nestjs/common';
import { GestorController } from './gestor.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GestorController],
})
export class GestorModule {}
