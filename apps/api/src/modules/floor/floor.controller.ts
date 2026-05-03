import { Controller, Get, Patch, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PrismaService } from '../../database/prisma.service';
import { TableStatus } from '@prisma/client';
import { FloorService } from './floor.service';

@ApiTags('floor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/floor')
export class FloorController {
  constructor(
    private prisma: PrismaService,
    private floorService: FloorService,
  ) {}

  @Get('tables')
  @ApiOperation({ summary: 'Get all tables with status' })
  async getTables(@TenantId() tenantId: string) {
    return this.floorService.getTables(tenantId);
  }

  @Get('tables/:id')
  @ApiOperation({ summary: 'Get table by ID' })
  async getTable(@Param('id') id: string, @TenantId() tenantId: string) {
    const table = await this.floorService.getTable(id, tenantId);
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  @Patch('tables/:id/status')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HOST', 'SERVER')
  @ApiOperation({ summary: 'Update table status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: TableStatus },
    @TenantId() tenantId: string,
  ) {
    return this.floorService.updateTableStatus(id, tenantId, body.status);
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Get current coverage stats' })
  async getCoverage(@TenantId() tenantId: string) {
    const tables = await this.prisma.table.findMany({ where: { tenantId } });
    const total = tables.length;
    const seated = tables.filter(t => t.status === 'SEATED').length;
    const available = tables.filter(t => t.status === 'AVAILABLE').length;
    return { total, seated, available, occupancyRate: total > 0 ? Math.round((seated / total) * 100) : 0 };
  }

  @Get('coverage/by-date')
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  @ApiOperation({ summary: 'Get per-slot table coverage for a specific date' })
  async getCoverageByDate(
    @Query('date') date: string,
    @TenantId() tenantId: string,
  ) {
    return this.floorService.getCoverageByDate(tenantId, date);
  }
}
