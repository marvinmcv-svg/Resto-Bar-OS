import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/live')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Live service dashboard' })
  async liveDashboard(@TenantId() tenantId: string) {
    return this.analyticsService.getLiveDashboard(tenantId);
  }

  @Get('reports/revenue')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Revenue report by period' })
  async revenueReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getRevenueReport(tenantId, new Date(startDate), new Date(endDate), granularity);
  }

  @Get('guests/summary')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Guest analytics summary' })
  async guestSummary(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getGuestAnalytics(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('reports/menu')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Menu item performance' })
  async menuPerformance(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getMenuPerformance(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('reports/operational')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Operational statistics' })
  async operationalStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getOperationalStats(tenantId, new Date(startDate), new Date(endDate));
  }
}