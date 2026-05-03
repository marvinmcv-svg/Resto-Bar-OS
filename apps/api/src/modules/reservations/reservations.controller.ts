import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HOST')
  @ApiOperation({ summary: 'Create a new reservation' })
  async create(@Body() dto: CreateReservationDto, @TenantId() tenantId: string) {
    return this.reservationsService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List reservations (default: today)' })
  async findAll(@TenantId() tenantId: string, @Query('date') date?: string) {
    return this.reservationsService.findAll(tenantId, date);
  }

  @Get('by-date/:date')
  @ApiOperation({ summary: 'Get reservations by date' })
  async byDate(@Param('date') date: string, @TenantId() tenantId: string) {
    return this.reservationsService.getByDate(tenantId, date);
  }

  @Get('by-guest/:guestId')
  @ApiOperation({ summary: 'Get reservation history for a guest' })
  async byGuest(@Param('guestId') guestId: string, @TenantId() tenantId: string) {
    return this.reservationsService.getByGuest(guestId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reservationsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HOST')
  @ApiOperation({ summary: 'Update reservation' })
  async update(@Param('id') id: string, @Body() dto: UpdateReservationDto, @TenantId() tenantId: string) {
    return this.reservationsService.update(id, dto, tenantId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HOST')
  @ApiOperation({ summary: 'Change reservation status' })
  async changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @TenantId() tenantId: string) {
    return this.reservationsService.changeStatus(id, dto.status, tenantId, dto.reason);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Cancel reservation' })
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.reservationsService.delete(id, tenantId);
  }
}