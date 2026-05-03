import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'SERVER')
  @ApiOperation({ summary: 'Process a payment' })
  async process(@Body() dto: any, @TenantId() tenantId: string) {
    return this.paymentsService.processPayment(tenantId, dto);
  }

  @Post('refund')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Refund a payment' })
  async refund(@Body() body: { paymentId: string; amount?: number }, @TenantId() tenantId: string) {
    return this.paymentsService.processRefund(tenantId, body.paymentId, body.amount);
  }

  @Get()
  @ApiOperation({ summary: 'List payments' })
  async getAll(@TenantId() tenantId: string) {
    return this.paymentsService.getPayments(tenantId);
  }
}
