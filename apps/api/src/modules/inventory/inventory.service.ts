import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async calculateRecipeCost(menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredient: true },
            },
          },
        },
      },
    });

    if (!menuItem?.recipe) {
      return { menuItemId, totalCost: 0, ingredientCosts: [], marginPercentage: 0 };
    }

    const ingredientCosts: { name: string; quantity: number; unit: string; cost: number }[] = [];
    let totalCost = 0;

    for (const ri of menuItem.recipe.ingredients) {
      const cost = Number(ri.quantity) * Number(ri.ingredient.unitCost);
      totalCost += cost;
      ingredientCosts.push({
        name: ri.ingredient.name,
        quantity: Number(ri.quantity),
        unit: ri.ingredient.unit,
        cost,
      });
    }

    const price = Number(menuItem.price);
    const marginPercentage = price > 0 ? ((price - totalCost) / price) * 100 : 0;

    return {
      menuItemId,
      name: menuItem.name,
      price,
      totalCost: Math.round(totalCost * 100) / 100,
      ingredientCosts,
      costPercentage: Math.round((totalCost / price) * 100 * 100) / 100,
      margin: Math.round((price - totalCost) * 100) / 100,
      marginPercentage: Math.round(marginPercentage * 100) / 100,
    };
  }

  async calculateAllMenuCosts(tenantId: string) {
    const menuItems = await this.prisma.menuItem.findMany({
      where: { tenantId },
      include: {
        recipe: {
          include: {
            ingredients: { include: { ingredient: true } },
          },
        },
      },
    });

    return Promise.all(menuItems.map(m => this.calculateRecipeCost(m.id)));
  }

  async getIngredients(tenantId: string, category?: string) {
    const where: any = { tenantId };
    if (category) where.category = category;
    return this.prisma.ingredient.findMany({
      where,
      include: { supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  async receiveInventory(tenantId: string, ingredientId: string, quantity: number, unitCost?: number) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id: ingredientId, tenantId } });
    if (!ingredient) throw new BadRequestException('Ingredient not found');

    const data: any = { currentStock: { increment: quantity } };
    if (unitCost !== undefined) data.unitCost = unitCost;

    return this.prisma.ingredient.update({
      where: { id: ingredientId },
      data,
    });
  }

  async logWaste(tenantId: string, dto: { ingredientId: string; quantity: number; reason: string; notes?: string; loggedBy: string }) {
    const ingredient = await this.prisma.ingredient.findFirst({ where: { id: dto.ingredientId, tenantId } });
    if (!ingredient) throw new BadRequestException('Ingredient not found');

    const cost = Number(ingredient.unitCost) * dto.quantity;

    return this.prisma.$transaction([
      this.prisma.ingredient.update({
        where: { id: dto.ingredientId },
        data: { currentStock: { decrement: dto.quantity } },
      }),
      this.prisma.wasteLog.create({
        data: {
          tenantId,
          ingredientId: dto.ingredientId,
          quantity: dto.quantity,
          reason: dto.reason,
          cost,
          notes: dto.notes,
          loggedBy: dto.loggedBy,
        },
      }),
    ]);
  }

  async getLowStockIngredients(tenantId: string) {
    return this.prisma.ingredient.findMany({
      where: {
        tenantId,
        currentStock: { lte: 1 }, // will be refined per ingredient
      },
      include: { supplier: true },
      orderBy: { currentStock: 'asc' },
    });
  }

  async getMenuEngineeringReport(tenantId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        orderedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    const itemStats = new Map<string, { name: string; category: string; qty: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const stats = itemStats.get(item.menuItemId) || { name: item.menuItem.name, category: item.menuItem.category, qty: 0, revenue: 0 };
        stats.qty += item.quantity;
        stats.revenue += Number(item.price) * item.quantity;
        itemStats.set(item.menuItemId, stats);
      }
    }

    const items = Array.from(itemStats.entries()).map(([id, stats]) => ({
      menuItemId: id,
      ...stats,
    }));

    const withCosts = await Promise.all(items.map(async item => {
      const costInfo = await this.calculateRecipeCost(item.menuItemId);
      return {
        ...item,
        cost: costInfo.totalCost,
        margin: item.revenue - (costInfo.totalCost * item.qty),
        marginPercentage: item.revenue > 0 ? ((item.revenue - (costInfo.totalCost * item.qty)) / item.revenue) * 100 : 0,
      };
    }));

    const stars = withCosts.filter(i => i.marginPercentage > 65 && i.qty > 10);
    const puzzles = withCosts.filter(i => i.marginPercentage > 65 && i.qty <= 10);
    const workhorses = withCosts.filter(i => i.marginPercentage <= 65 && i.qty > 10);
    const dogs = withCosts.filter(i => i.marginPercentage <= 65 && i.qty <= 10);

    return { stars, puzzles, workhorses, dogs };
  }
}
