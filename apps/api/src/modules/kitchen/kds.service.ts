import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Station } from '@prisma/client';

interface KDSState {
  id: string;
  orderId: string;
  tableNumber: number;
  guestName: string;
  guestId?: string;
  isVip: boolean;
  vipTier: string;
  occasion?: string;
  allergies: string[];
  items: {
    id: string;
    name: string;
    quantity: number;
    seatNumber?: number;
    modifiers: string[];
    courseNumber: number;
  }[];
  createdAt: Date;
  targetSeconds: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY';
  station: Station;
}

@Injectable()
export class KDSService {
  constructor(private prisma: PrismaService) {}

  async createTicketsForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    ingredients: { include: { ingredient: true } },
                  },
                },
              },
            },
          },
        },
        table: true,
        guest: true,
      },
    });

    if (!order) return [];
    const ticketsByStation = new Map<Station, any[]>();

    for (const item of order.items) {
      const station = item.station;
      if (!ticketsByStation.has(station)) ticketsByStation.set(station, []);
      ticketsByStation.get(station)!.push({
        orderItemId: item.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        seatNumber: item.seatNumber,
        modifiers: item.modifiers,
        courseNumber: item.courseNumber,
        allergies: item.allergies,
      });
    }

    const tickets: KDSState[] = [];
    for (const [station, items] of ticketsByStation.entries()) {
      const ticket: KDSState = {
        id: `ticket-${orderId}-${station}`,
        orderId: order.id,
        tableNumber: order.table.number,
        guestName: order.guest?.firstName || 'Walk-in',
        guestId: order.guestId || undefined,
        isVip: !!order.guest?.vipTier && order.guest.vipTier !== 'NONE',
        vipTier: order.guest?.vipTier || 'NONE',
        occasion: order.occasion || undefined,
        allergies: items.flatMap(i => i.allergies || []),
        items,
        createdAt: new Date(),
        targetSeconds: items.length * 120,
        status: 'PENDING',
        station,
      };
      tickets.push(ticket);
    }

    return tickets;
  }

  async getStationTickets(tenantId: string, station: Station) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'FIRED', 'IN_PROGRESS'] },
        items: { some: { station, status: { not: 'SERVED' } } },
      },
      include: {
        items: { include: { menuItem: true }, where: { station } },
        table: true,
        guest: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    return orders.map(order => ({
      id: `ticket-${order.id}-${station}`,
      orderId: order.id,
      tableNumber: order.table.number,
      guestName: order.guest?.firstName || 'Walk-in',
      isVip: !!order.guest?.vipTier && order.guest.vipTier !== 'NONE',
      allergies: order.items.flatMap(i => i.allergies || []),
      items: order.items.map(i => ({
        id: i.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        seatNumber: i.seatNumber,
        modifiers: i.modifiers,
        status: i.status,
      })),
      createdAt: order.orderedAt,
      status:
        order.status === 'FIRED'
          ? 'IN_PROGRESS'
          : order.items.every(i => i.status === 'READY')
            ? 'READY'
            : 'PENDING',
    }));
  }

  async bumpItem(orderItemId: string) {
    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'READY', completedAt: new Date() },
    });
  }

  async fireItem(orderItemId: string) {
    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: 'FIRED', firedAt: new Date() },
    });
  }

  async getExpoView(tenantId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['FIRED', 'IN_PROGRESS'] },
      },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        guest: true,
      },
      orderBy: { orderedAt: 'asc' },
    });

    return orders.map(order => {
      const stationStatuses = new Map<string, { total: number; ready: number }>();
      for (const item of order.items) {
        const s = item.station;
        if (!stationStatuses.has(s)) stationStatuses.set(s, { total: 0, ready: 0 });
        const curr = stationStatuses.get(s)!;
        curr.total++;
        if (item.status === 'READY') curr.ready++;
      }

      const allReady = order.items.every(i => i.status === 'READY');
      const elapsed = Math.floor((Date.now() - new Date(order.orderedAt).getTime()) / 1000);

      return {
        id: order.id,
        tableNumber: order.table.number,
        guestName: order.guest?.firstName || 'Walk-in',
        isVip: !!order.guest?.vipTier && order.guest.vipTier !== 'NONE',
        allergies: order.items.flatMap(i => i.allergies || []),
        occasion: order.occasion,
        stations: Object.fromEntries(stationStatuses),
        elapsedSeconds: elapsed,
        status: allReady ? 'READY' : 'IN_PROGRESS',
      };
    });
  }
}
