import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'SERVER')
  @ApiOperation({ summary: 'Create a new order' })
  async create(@Body() dto: any, @TenantId() tenantId: string) {
    return this.ordersService.createOrder(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List orders' })
  async findAll(@TenantId() tenantId: string, @Query('status') status?: OrderStatus) {
    return this.ordersService.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.ordersService.findAll(tenantId).then(orders => orders.find(o => o.id === id));
  }
}
