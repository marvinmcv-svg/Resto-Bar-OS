import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { VipTier } from '@prisma/client';

const VIP_TIER_THRESHOLDS = {
  BRONZE: { minSpend: 1000, minVisits: 3 },
  SILVER: { minSpend: 3000, minVisits: 6 },
  GOLD: { minSpend: 7000, minVisits: 12 },
  PLATINUM: { minSpend: 15000, minVisits: 24 },
};

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGuestDto, tenantId: string) {
    return this.prisma.guest.create({
      data: {
        ...dto,
        tenantId,
        tags: ['FIRST_VISIT'],
        vipTier: VipTier.NONE,
      },
    });
  }

  async findAll(tenantId: string, q?: string, tier?: VipTier, tag?: string) {
    const where: Record<string, unknown> = { tenantId };

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    if (tier) where.vipTier = tier;
    if (tag) where.tags = { has: tag };

    return this.prisma.guest.findMany({ where, orderBy: { lastVisit: 'desc' } });
  }

  async findOne(id: string, tenantId: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, tenantId },
      include: {
        orders: {
          include: { table: true, server: true },
          orderBy: { orderedAt: 'desc' },
          take: 20,
        },
        reservations: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async update(id: string, dto: UpdateGuestDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.guest.update({
      where: { id, tenantId },
      data: dto as Parameters<typeof this.prisma.guest.update>[0]['data'],
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.guest.delete({ where: { id, tenantId } });
  }

  async search(tenantId: string, query: string) {
    return this.prisma.guest.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { lastVisit: 'desc' },
    });
  }

  async getHistory(id: string, tenantId: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, tenantId },
      include: {
        orders: {
          include: { table: true, server: { select: { firstName: true, lastName: true } } },
          orderBy: { orderedAt: 'desc' },
        },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found');

    const totalSpend = guest.orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgSpend = guest.orders.length > 0 ? totalSpend / guest.orders.length : 0;

    return {
      guestId: guest.id,
      name: `${guest.firstName} ${guest.lastName ?? ''}`,
      totalVisits: guest.visitCount,
      totalSpend,
      averageSpend: avgSpend,
      lastVisit: guest.lastVisit,
      visits: guest.orders.map((o) => ({
        date: o.orderedAt,
        table: o.table.number,
        server: `${o.server.firstName} ${o.server.lastName ?? ''}`.trim(),
        coverCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        totalSpend: Number(o.total),
        items: o.items.map((i) => i.menuItemId),
      })),
    };
  }

  async recalculateTier(guestId: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) return;

    const tiers = Object.entries(VIP_TIER_THRESHOLDS) as [VipTier, { minSpend: number; minVisits: number }][];
    let newTier: VipTier = VipTier.NONE;

    for (const [tier, thresholds] of tiers) {
      if (Number(guest.lifetimeValue) >= thresholds.minSpend && guest.visitCount >= thresholds.minVisits) {
        newTier = tier;
      }
    }

    if (guest.vipTier !== newTier) {
      await this.prisma.guest.update({ where: { id: guestId }, data: { vipTier: newTier } });
    }
    return newTier;
  }

  async recalculateTags(guestId: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { orders: { include: { items: true } } },
    });
    if (!guest) return;

    const tags = new Set<string>();

    if (guest.visitCount === 1) tags.add('FIRST_VISIT');
    if (guest.vipTier !== 'NONE') tags.add('VIP');
    if (Number(guest.averageSpend) > 300) tags.add('HIGH_SPENDER');

    const daysSinceLastVisit = guest.lastVisit
      ? Math.floor((Date.now() - new Date(guest.lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceLastVisit > 90) tags.add('LAPSED_90');
    if (daysSinceLastVisit > 60) tags.add('LAPSED_60');

    const wineOrders = guest.orders.filter((o) => o.items.some((i) => i.menuItemId.includes('wine')));
    if (wineOrders.length > guest.orders.length * 0.2) tags.add('WINE_ENTHUSIAST');

    await this.prisma.guest.update({
      where: { id: guestId },
      data: { tags: Array.from(tags) },
    });
  }
}