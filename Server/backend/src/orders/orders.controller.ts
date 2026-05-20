import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private prisma: PrismaService) {}

  @Get('max-number')
  async findMaxNumber() {
    const result = await this.prisma.orders.findMany({
      select: { number: true },
      orderBy: { created_at: 'desc' },
      take: 3000,
    });
    if (result.length === 0) return { max: 0 };
    const allNumbers = result.map(item => {
      const num = parseInt(item.number.replace(/\D/g, ''), 10);
      return isNaN(num) ? 0 : num;
    });
    const maxFound = Math.max(...allNumbers, 0);
    const max = Math.max(maxFound, 8801);
    return { max };
  }

  @Get()
  async findAll(
    @Query('seller_id') sellerId?: string,
    @Query('client_id') clientId?: string,
    @Query('parent_order_id') parentOrderId?: string,
    @Query('status') status?: string,
    @Query('number') number?: string,
  ) {
    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (clientId) where.client_id = clientId;
    if (parentOrderId) {
      where.parent_order_id = parentOrderId === 'null' ? null : parentOrderId;
    }
    if (status) where.status = status;
    if (number) {
      where.number = {
        contains: number,
        mode: 'insensitive',
      };
    }

    return this.prisma.orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        other_orders: true, // Includes sub-orders relation
      },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.orders.findUnique({
      where: { id },
      include: {
        orders: true, // Parent order
        other_orders: true, // Sub-orders
      },
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.orders.create({
      data: body,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.orders.update({
      where: { id },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.orders.delete({
      where: { id },
    });
  }
}
