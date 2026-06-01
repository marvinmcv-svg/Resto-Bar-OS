import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Station } from '@prisma/client';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active menu items' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'station', required: false, enum: Station })
  async getMenuItems(
    @TenantId() tenantId: string,
    @Query('category') category?: string,
    @Query('station') station?: Station,
  ) {
    return this.menuService.getMenuItems(tenantId, category, station);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all menu categories' })
  async getCategories(@TenantId() tenantId: string) {
    return this.menuService.getCategories(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single menu item' })
  async getMenuItem(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.menuService.getMenuItem(id, tenantId);
  }

  @Patch(':id/86')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Toggle 86 status on a menu item' })
  async setEightySix(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body('is86') is86: boolean,
  ) {
    return this.menuService.setEightySix(id, tenantId, is86);
  }
}
