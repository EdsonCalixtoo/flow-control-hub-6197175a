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

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    if (search) {
      return this.prisma.clients.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { cpf_cnpj: { contains: search } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.clients.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.clients.findUnique({
      where: { id },
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.clients.create({
      data: body,
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.clients.update({
      where: { id },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.clients.delete({
      where: { id },
    });
  }
}
