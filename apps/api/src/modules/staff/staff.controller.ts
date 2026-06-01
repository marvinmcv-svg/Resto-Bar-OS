import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Role } from '@prisma/client';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // Time Clock
  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in' })
  async clockIn(@TenantId() tenantId: string, @Body('userId') userId: string, @Body('shiftId') shiftId?: string) {
    return this.staffService.clockIn(tenantId, userId, shiftId);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out' })
  async clockOut(@TenantId() tenantId: string, @Body('userId') userId: string) {
    return this.staffService.clockOut(tenantId, userId);
  }

  @Get('time-entries')
  @ApiOperation({ summary: 'Get time clock entries' })
  async getTimeEntries(@TenantId() tenantId: string, @Query('userId') userId?: string) {
    return this.staffService.getTimeEntries(tenantId, userId);
  }

  // Scheduling
  @Get('shifts')
  @ApiOperation({ summary: 'Get shifts' })
  async getShifts(@TenantId() tenantId: string, @Query('date') date?: string) {
    return this.staffService.getShifts(tenantId, date);
  }

  @Post('shifts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a shift' })
  async createShift(@TenantId() tenantId: string, @Body() body: { userId: string; date: Date; startTime: string; endTime: string; role: Role }) {
    return this.staffService.createShift(tenantId, body);
  }

  @Patch('shifts/:id/status')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update shift status' })
  async updateShiftStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.staffService.updateShiftStatus(id, status as any);
  }

  // Performance
  @Get('performance')
  @ApiOperation({ summary: 'Get staff performance metrics' })
  async getPerformance(
    @TenantId() tenantId: string,
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.staffService.getPerformance(tenantId, userId, new Date(startDate), new Date(endDate));
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'List staff users' })
  async getUsers(@TenantId() tenantId: string, @Query('role') role?: Role) {
    return this.staffService.getUsers(tenantId, role);
  }

  // Tips
  @Post('tips/distribute')
  @ApiOperation({ summary: 'Distribute tips for an order' })
  async distributeTips(
    @TenantId() tenantId: string,
    @Body('orderId') orderId: string,
    @Body('tipAmount') tipAmount: number,
  ) {
    return this.staffService.distributeTips(tenantId, orderId, tipAmount);
  }
}