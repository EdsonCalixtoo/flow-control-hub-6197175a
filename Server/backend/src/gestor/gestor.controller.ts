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

@Controller('gestor')
@UseGuards(JwtAuthGuard)
export class GestorController {
  constructor(private prisma: PrismaService) {}

  // ── System Logs ──────────────────────────────────────────────────────────────
  @Get('system-logs')
  async findSystemLogs(@Query('limit') limit?: string) {
    return this.prisma.system_logs.findMany({
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Post('system-logs')
  async createSystemLog(@Body() body: any) {
    return this.prisma.system_logs.create({
      data: body,
    });
  }

  // ── Financial Entries ────────────────────────────────────────────────────────
  @Get('financial')
  async findFinancialEntries() {
    return this.prisma.financial_entries.findMany({
      orderBy: { created_at: 'desc' },
      take: 2000,
    });
  }

  @Get('financial/order/:orderId')
  async findFinancialEntriesByOrder(@Param('orderId') orderId: string) {
    return this.prisma.financial_entries.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('financial')
  async createFinancialEntry(@Body() body: any) {
    return this.prisma.financial_entries.create({
      data: {
        ...body,
        amount: body.amount ? Number(body.amount) : undefined,
      },
    });
  }

  @Put('financial/:id')
  async updateFinancialEntry(@Param('id') id: string, @Body() body: any) {
    return this.prisma.financial_entries.update({
      where: { id },
      data: {
        ...body,
        amount: body.amount ? Number(body.amount) : undefined,
      },
    });
  }

  // ── Delay Reports ───────────────────────────────────────────────────────────
  @Get('delay-reports')
  async findDelayReports() {
    return this.prisma.delay_reports.findMany({
      orderBy: { sent_at: 'desc' },
      take: 1000,
    });
  }

  @Post('delay-reports')
  async createDelayReport(@Body() body: any) {
    return this.prisma.delay_reports.create({
      data: {
        ...body,
        order_total: body.order_total ? Number(body.order_total) : undefined,
      },
    });
  }

  @Put('delay-reports/:id/read')
  async markDelayReportRead(@Param('id') id: string) {
    return this.prisma.delay_reports.update({
      where: { id },
      data: {
        read_at: new Date(),
      },
    });
  }

  // ── Order Returns ────────────────────────────────────────────────────────────
  @Get('order-returns')
  async findOrderReturns() {
    return this.prisma.order_returns.findMany({
      orderBy: { created_at: 'desc' },
      take: 1000,
    });
  }

  @Post('order-returns')
  async createOrderReturn(@Body() body: any) {
    return this.prisma.order_returns.create({
      data: body,
    });
  }

  @Put('order-returns/:id/resolve')
  async resolveOrderReturn(@Param('id') id: string) {
    return this.prisma.order_returns.update({
      where: { id },
      data: {
        resolved: true,
        resolved_at: new Date(),
      },
    });
  }

  // ── Production Errors ────────────────────────────────────────────────────────
  @Get('production-errors')
  async findProductionErrors() {
    return this.prisma.production_errors.findMany({
      orderBy: { created_at: 'desc' },
      take: 1000,
    });
  }

  @Post('production-errors')
  async createProductionError(@Body() body: any) {
    return this.prisma.production_errors.create({
      data: body,
    });
  }

  @Put('production-errors/:id/resolve')
  async resolveProductionError(@Param('id') id: string) {
    return this.prisma.production_errors.update({
      where: { id },
      data: {
        resolved: true,
      },
    });
  }

  @Get('stats')
  async getStats() {
    const usersCount = await this.prisma.users.count();
    const ordersCount = await this.prisma.orders.count();
    const logsCount = await this.prisma.system_logs.count();
    return { usersCount, ordersCount, logsCount };
  }

  @Put('users/promote')
  async promoteUser(@Body() body: { email: string }) {
    if (!body.email) throw new Error('Email is required');
    const name = body.email.split('@')[0];
    return this.prisma.users.upsert({
      where: { email: body.email },
      update: { role: 'admin' },
      create: {
        email: body.email,
        role: 'admin',
        name,
        created_at: new Date(),
      }
    });
  }

  @Get('backup')
  async getFullBackup() {
    const tables = [
      'users', 'orders', 'clients', 'products', 
      'financial_entries', 'delay_reports', 'order_returns', 
      'production_errors', 'barcode_scans', 'delivery_pickups', 
      'installations', 'warranties', 'system_logs'
    ];
    const backup: any = {};
    for (const table of tables) {
      try {
        backup[table] = await (this.prisma as any)[table].findMany({ take: 50000 });
      } catch (err) {
        backup[table] = [];
      }
    }
    return backup;
  }

  // ── Barcode Scans ────────────────────────────────────────────────────────────
  @Get('barcode-scans')
  async findBarcodeScans() {
    return this.prisma.barcode_scans.findMany({
      orderBy: { created_at: 'desc' },
      take: 1000,
    });
  }

  @Post('barcode-scans')
  async createBarcodeScan(@Body() body: any) {
    return this.prisma.barcode_scans.create({
      data: body,
    });
  }

  // ── Delivery Pickups ─────────────────────────────────────────────────────────
  @Get('delivery-pickups')
  async findDeliveryPickups() {
    return this.prisma.delivery_pickups.findMany({
      orderBy: { created_at: 'desc' },
      take: 1000,
    });
  }

  @Post('delivery-pickups')
  async createDeliveryPickup(@Body() body: any) {
    return this.prisma.delivery_pickups.create({
      data: body,
    });
  }

  // ── Installations ────────────────────────────────────────────────────────────
  @Get('installations')
  async findInstallations(@Query('date') date?: string) {
    const where: any = {};
    if (date) where.date = date;
    return this.prisma.installations.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  @Get('installations/conflict')
  async checkInstallationConflict(
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('exclude_order_id') excludeOrderId?: string,
  ) {
    const where: any = { date, time };
    if (excludeOrderId) {
      where.order_id = { not: excludeOrderId };
    }
    const result = await this.prisma.installations.findFirst({
      where,
    });
    return result;
  }

  @Post('installations')
  async createInstallation(@Body() body: any) {
    return this.prisma.installations.create({
      data: body,
    });
  }

  @Delete('installations/order/:orderId')
  async removeInstallationByOrder(@Param('orderId') orderId: string) {
    return this.prisma.installations.deleteMany({
      where: { order_id: orderId },
    });
  }

  // ── Client Rewards ───────────────────────────────────────────────────────────
  @Get('rewards/client/:clientId')
  async findClientRewards(@Param('clientId') clientId: string) {
    return this.prisma.client_rewards.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: 'asc' },
    });
  }

  @Get('rewards/:id')
  async findClientReward(@Param('id') id: string) {
    return this.prisma.client_rewards.findUnique({
      where: { id },
    });
  }

  @Post('rewards')
  async createClientReward(@Body() body: any) {
    return this.prisma.client_rewards.create({
      data: {
        ...body,
        kits_required: body.kits_required ? Number(body.kits_required) : 0,
        kits_completed: body.kits_completed ? Number(body.kits_completed) : 0,
        kits_consumed: body.kits_consumed ? Number(body.kits_consumed) : 0,
        kits_adjustment: body.kits_adjustment ? Number(body.kits_adjustment) : 0,
      },
    });
  }

  @Put('rewards/:id')
  async updateClientReward(@Param('id') id: string, @Body() body: any) {
    return this.prisma.client_rewards.update({
      where: { id },
      data: {
        ...body,
        kits_required: body.kits_required !== undefined ? Number(body.kits_required) : undefined,
        kits_completed: body.kits_completed !== undefined ? Number(body.kits_completed) : undefined,
        kits_consumed: body.kits_consumed !== undefined ? Number(body.kits_consumed) : undefined,
        kits_adjustment: body.kits_adjustment !== undefined ? Number(body.kits_adjustment) : undefined,
        reward_redeemed_at: body.reward_redeemed_at !== undefined ? (body.reward_redeemed_at ? new Date(body.reward_redeemed_at) : null) : undefined,
        updated_at: new Date(),
      },
    });
  }

  @Delete('rewards/:id')
  async removeClientReward(@Param('id') id: string) {
    return this.prisma.client_rewards.delete({
      where: { id },
    });
  }

  // ── Warranties ───────────────────────────────────────────────────────────────
  @Get('warranties')
  async findWarranties() {
    return this.prisma.warranties.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('warranties')
  async createWarranty(@Body() body: any) {
    return this.prisma.warranties.create({
      data: body,
    });
  }

  @Put('warranties/:id')
  async updateWarranty(@Param('id') id: string, @Body() body: any) {
    return this.prisma.warranties.update({
      where: { id },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });
  }

  // ── Monthly Closings ──────────────────────────────────────────────────────────
  @Get('monthly-closings')
  async findMonthlyClosings() {
    return this.prisma.monthly_closings.findMany({
      orderBy: { closing_date: 'desc' },
    });
  }

  @Post('monthly-closings')
  async createMonthlyClosing(@Body() body: any) {
    return this.prisma.monthly_closings.create({
      data: {
        ...body,
        total_sold: body.total_sold ? Number(body.total_sold) : 0,
        order_count: body.order_count ? Number(body.order_count) : 0,
        outstanding_value: body.outstanding_value ? Number(body.outstanding_value) : 0,
      },
    });
  }

  @Put('monthly-closings/:id')
  async updateMonthlyClosing(@Param('id') id: string, @Body() body: any) {
    return this.prisma.monthly_closings.update({
      where: { id },
      data: {
        ...body,
        total_sold: body.total_sold !== undefined ? Number(body.total_sold) : undefined,
        order_count: body.order_count !== undefined ? Number(body.order_count) : undefined,
        outstanding_value: body.outstanding_value !== undefined ? Number(body.outstanding_value) : undefined,
      },
    });
  }

  @Put('delivery-pickups/batch/:batchId')
  async updateDeliveryPickupsByBatch(@Param('batchId') batchId: string, @Body() body: any) {
    return this.prisma.delivery_pickups.updateMany({
      where: { batch_id: batchId },
      data: { deliverer_name: body.deliverer_name },
    });
  }

  @Delete('delivery-pickups/order/:orderId')
  async removeDeliveryPickupsByOrder(@Param('orderId') orderId: string) {
    return this.prisma.delivery_pickups.deleteMany({
      where: { order_id: orderId },
    });
  }

  @Delete('barcode-scans/order/:orderId')
  async removeBarcodeScansByOrder(@Param('orderId') orderId: string) {
    return this.prisma.barcode_scans.deleteMany({
      where: { order_id: orderId },
    });
  }
}
