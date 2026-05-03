import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(name: string) {
    return this.prisma.restaurantGroup.create({
      data: { name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    });
  }

  async getGroups() {
    return this.prisma.restaurantGroup.findMany({
      include: { tenants: { select: { id: true, name: true, slug: true } } },
    });
  }

  async addLocationToGroup(groupId: string, tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { groupId },
    });
  }

  async getGroupOverview(groupId: string) {
    const group = await this.prisma.restaurantGroup.findUnique({
      where: { id: groupId },
      include: {
        tenants: {
          include: {
            orders: {
              where: {
                status: 'COMPLETED',
                orderedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            },
          },
        },
      },
    });
    if (!group) return null;

    const locations = group.tenants.map(t => ({
      tenantId: t.id,
      name: t.name,
      revenueToday: t.orders.reduce((sum, o) => sum + Number(o.total), 0),
      coversToday: t.orders.reduce((sum, o) => sum + o.items.reduce((s: number, i: any) => s + i.quantity, 0), 0),
    }));

    return {
      groupName: group.name,
      totalLocations: group.tenants.length,
      locations,
      totalRevenueToday: locations.reduce((sum, l) => sum + l.revenueToday, 0),
    };
  }
}
