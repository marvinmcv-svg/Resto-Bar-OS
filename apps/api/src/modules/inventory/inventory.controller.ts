import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('ingredients')
  @ApiOperation({ summary: 'List all ingredients' })
  async getIngredients(@TenantId() tenantId: string, @Query('category') category?: string) {
    return this.inventoryService.getIngredients(tenantId, category);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get ingredients below reorder threshold' })
  async getLowStock(@TenantId() tenantId: string) {
    return this.inventoryService.getLowStockIngredients(tenantId);
  }

  @Get('menu-costs')
  @ApiOperation({ summary: 'Calculate cost and margin for all menu items' })
  async getMenuCosts(@TenantId() tenantId: string) {
    return this.inventoryService.calculateAllMenuCosts(tenantId);
  }

  @Get('menu-costs/:menuItemId')
  @ApiOperation({ summary: 'Calculate cost for a specific menu item' })
  async getMenuItemCost(@Param('menuItemId') menuItemId: string) {
    return this.inventoryService.calculateRecipeCost(menuItemId);
  }

  @Post('receive')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Receive inventory shipment' })
  async receive(@Body() body: { ingredientId: string; quantity: number; unitCost?: number }, @TenantId() tenantId: string) {
    return this.inventoryService.receiveInventory(tenantId, body.ingredientId, body.quantity, body.unitCost);
  }

  @Post('waste')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER', 'HEAD_CHEF')
  @ApiOperation({ summary: 'Log waste/spoilage' })
  async logWaste(@Body() body: { ingredientId: string; quantity: number; reason: string; notes?: string; loggedBy: string }, @TenantId() tenantId: string) {
    return this.inventoryService.logWaste(tenantId, body);
  }

  @Get('menu-engineering')
  @ApiOperation({ summary: 'Menu profitability quadrants (stars, puzzles, workhorses, dogs)' })
  async getMenuEngineering(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.inventoryService.getMenuEngineeringReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
