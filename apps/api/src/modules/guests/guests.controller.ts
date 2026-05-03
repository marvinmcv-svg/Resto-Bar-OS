import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { SearchGuestDto } from './dto/search-guest.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VipTier } from '@prisma/client';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Create a new guest profile' })
  async create(@Body() dto: CreateGuestDto, @TenantId() tenantId: string) {
    return this.guestsService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all guests with optional filters' })
  async findAll(
    @TenantId() tenantId: string,
    @Query() filters: SearchGuestDto,
  ) {
    return this.guestsService.findAll(tenantId, filters.q, filters.tier as VipTier | undefined, filters.tag);
  }

  @Get('search')
  @ApiOperation({ summary: 'Quick search guests by name, email, phone' })
  async search(@Query('q') q: string, @TenantId() tenantId: string) {
    return this.guestsService.search(tenantId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest by ID' })
  async findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.guestsService.findOne(id, tenantId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get guest visit history' })
  async getHistory(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.guestsService.getHistory(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update guest profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGuestDto,
    @TenantId() tenantId: string,
  ) {
    return this.guestsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete guest' })
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.guestsService.delete(id, tenantId);
  }
}