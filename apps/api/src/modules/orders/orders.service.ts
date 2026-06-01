import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { OrderStatus, OrderSource, ItemStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async createOrder(dto: any, tenantId: string) {
    const table = await this.prisma.table.findFirst({ where: { id: dto.tableId, tenantId } });
    if (!table) throw new BadRequestException('Table not found');

    const menuItemIds = dto.items.map((i: any) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
    });

    const is86 = menuItems.find(m => m.is86);
    if (is86) throw new BadRequestException(`Item "${is86.name}" is currently 86'd (unavailable)`);

    let allergies: string[] = [];
    if (dto.guestId) {
      const guest = await this.prisma.guest.findUnique({ where: { id: dto.guestId } });
      allergies = guest?.allergies || [];
    }

    let subtotal = 0;
    const orderItems = dto.items.map((item: any) => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId)!;
      const itemTotal = Number(menuItem.price) * item.quantity;
      subtotal += itemTotal;
      return {
        menuItemId: menuItem.id,
        seatNumber: item.seatNumber,
        quantity: item.quantity,
        price: menuItem.price,
        modifiers: item.modifiers || [],
        station: menuItem.station,
        courseNumber: item.courseNumber || 1,
        status: ItemStatus.PENDING,
        allergies,
      };
    });

    const tax = subtotal * 0.0875;
    const total = subtotal + tax;

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        tableId: dto.tableId,
        serverId: dto.serverId,
        guestId: dto.guestId,
        items: { create: orderItems },
        status: OrderStatus.PENDING,
        source: dto.source || OrderSource.DINE_IN,
        occasion: dto.occasion,
        guestNotes: dto.guestNotes,
        subtotal,
        tax,
        total,
        orderedAt: new Date(),
      },
      include: { items: true },
    });

    await this.deductInventory(order.id);
    this.events.emitOrderFired(tenantId, order);
    return order;
  }

  async deductInventory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipe: { include: { ingredients: true } },
              },
            },
          },
        },
      },
    });

    if (!order) return;

    for (const item of order.items) {
      if (!item.menuItem.recipe) continue;
      for (const ri of item.menuItem.recipe.ingredients) {
        const deductQty = Number(ri.quantity) * item.quantity;
        await this.prisma.ingredient.update({
          where: { id: ri.ingredientId },
          data: { currentStock: { decrement: deductQty } },
        });

        const ingredient = await this.prisma.ingredient.findUnique({ where: { id: ri.ingredientId } });
        if (ingredient && Number(ingredient.currentStock) <= Number(ingredient.reorderThreshold)) {
          await this.prisma.notification.create({
            data: {
              tenantId: order.tenantId,
              type: 'LOW_STOCK',
              title: `Low Stock: ${ingredient.name}`,
              message: `Below threshold (${ingredient.currentStock} ${ingredient.unit} remaining)`,
            },
          });
        }
      }
    }
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { table: true, server: true, guest: true, items: { include: { menuItem: true } } },
    });
  }

  async findAll(tenantId: string, status?: OrderStatus) {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.prisma.order.findMany({
      where,
      include: { table: true, server: true, guest: true, items: { include: { menuItem: true } } },
      orderBy: { orderedAt: 'desc' },
    });
  }
}
