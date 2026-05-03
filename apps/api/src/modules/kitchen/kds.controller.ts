import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KDSService } from './kds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Station } from '@prisma/client';

@ApiTags('kds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/kds')
export class KDSController {
  constructor(private readonly kdsService: KDSService) {}

  @Get('station/:station')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Get tickets for a kitchen station' })
  async getStationTickets(@Param('station') station: string, @TenantId() tenantId: string) {
    return this.kdsService.getStationTickets(tenantId, station as Station);
  }

  @Get('expo')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Get expo/pass overview of all active tickets' })
  async getExpoView(@TenantId() tenantId: string) {
    return this.kdsService.getExpoView(tenantId);
  }

  @Patch('item/:id/fire')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Fire an item to kitchen' })
  async fireItem(@Param('id') id: string) {
    return this.kdsService.fireItem(id);
  }

  @Patch('item/:id/bump')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF', 'SERVER')
  @ApiOperation({ summary: 'Bump an item as complete' })
  async bumpItem(@Param('id') id: string) {
    return this.kdsService.bumpItem(id);
  }
}
