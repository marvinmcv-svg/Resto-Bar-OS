import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Station } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuItems(tenantId: string, category?: string, station?: Station) {
    return this.prisma.menuItem.findMany({
      where: {
        tenantId,
        is86: false,
        ...(category ? { category } : {}),
        ...(station ? { station } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategories(tenantId: string) {
    const items = await this.prisma.menuItem.findMany({
      where: { tenantId, is86: false },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return items.map((i) => i.category);
  }

  async getMenuItem(id: string, tenantId: string) {
    return this.prisma.menuItem.findFirst({
      where: { id, tenantId },
    });
  }

  async setEightySix(id: string, tenantId: string, is86: boolean) {
    return this.prisma.menuItem.update({
      where: { id },
      data: { is86 },
    });
  }
}
