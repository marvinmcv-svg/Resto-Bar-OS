import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Live dashboard
  async getLiveDashboard(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      tables,
      ticketsInProgress,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId, orderedAt: { gte: today }, status: { in: ['PENDING', 'FIRED', 'IN_PROGRESS', 'READY', 'SERVED'] } },
        include: { items: true },
      }),
      this.prisma.table.findMany({ where: { tenantId } }),
      this.prisma.order.findMany({
        where: { tenantId, status: { in: ['FIRED', 'IN_PROGRESS'] } },
      }),
    ]);

    const revenueToday = ordersToday.reduce((sum, o) => sum + Number(o.total), 0);
    const coversToday = ordersToday.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgTicketTime = ordersToday.length > 0
      ? ordersToday.reduce((sum, o) => sum + (Date.now() - new Date(o.orderedAt).getTime()) / 1000, 0) / ordersToday.length
      : 0;

    return {
      timestamp: new Date(),
      revenueToday: Math.round(revenueToday * 100) / 100,
      coversToday,
      avgSpendPerCover: coversToday > 0 ? Math.round(revenueToday / coversToday * 100) / 100 : 0,
      seatedTables: tables.filter(t => t.status === 'SEATED').length,
      totalTables: tables.length,
      availableTables: tables.filter(t => t.status === 'AVAILABLE').length,
      avgTicketTime: Math.round(avgTicketTime),
      ticketsInProgress: ticketsInProgress.length,
    };
  }

  // Revenue by period
  async getRevenueReport(tenantId: string, startDate: Date, endDate: Date, granularity: 'day' | 'week' | 'month' = 'day') {
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        orderedAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: { items: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const totalCovers = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    const byPeriod = this.groupByPeriod(orders, granularity);

    return {
      period: { start: startDate, end: endDate },
      granularity,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalCovers,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0,
      averageSpendPerCover: totalCovers > 0 ? Math.round(totalRevenue / totalCovers * 100) / 100 : 0,
      byPeriod,
    };
  }

  private groupByPeriod(orders: any[], granularity: 'day' | 'week' | 'month') {
    const groups = new Map<string, { revenue: number; orders: number; covers: number }>();

    for (const order of orders) {
      const date = new Date(order.orderedAt);
      let label: string;
      if (granularity === 'day') label = date.toISOString().split('T')[0];
      else if (granularity === 'week') label = date.toISOString().split('W')[0];
      else label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = groups.get(label) || { revenue: 0, orders: 0, covers: 0 };
      existing.revenue += Number(order.total);
      existing.orders++;
      existing.covers += order.items.reduce((s: number, i: any) => s + i.quantity, 0);
      groups.set(label, existing);
    }

    return Array.from(groups.entries()).map(([label, data]) => ({
      label,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
      covers: data.covers,
    }));
  }

  // Guest analytics
  async getGuestAnalytics(tenantId: string, startDate: Date, endDate: Date) {
    const guests = await this.prisma.guest.findMany({
      where: { tenantId },
      include: { orders: { where: { orderedAt: { gte: startDate, lte: endDate } } } },
    });

    const totalGuests = guests.length;
    const newGuests = guests.filter(g => g.visitCount === 1).length;
    const returningGuests = totalGuests - newGuests;
    const retentionRate = totalGuests > 0 ? Math.round((returningGuests / totalGuests) * 100 * 100) / 100 : 0;
    const avgLTV = guests.length > 0
      ? guests.reduce((sum, g) => sum + Number(g.lifetimeValue), 0) / guests.length
      : 0;

    const topGuests = [...guests]
      .sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue))
      .slice(0, 10)
      .map(g => ({
        guestId: g.id,
        name: `${g.firstName} ${g.lastName || ''}`.trim(),
        ltv: Number(g.lifetimeValue),
        visits: g.visitCount,
      }));

    return {
      period: { start: startDate, end: endDate },
      totalGuests,
      newGuests,
      returningGuests,
      retentionRate,
      averageLTV: Math.round(avgLTV * 100) / 100,
      topGuests,
    };
  }

  // Menu performance
  async getMenuPerformance(tenantId: string, startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, orderedAt: { gte: startDate, lte: endDate }, status: 'COMPLETED' },
      include: { items: { include: { menuItem: true } } },
    });

    const itemStats = new Map<string, any>();
    for (const order of orders) {
      for (const item of order.items) {
        const stats = itemStats.get(item.menuItemId) || {
          name: item.menuItem.name,
          category: item.menuItem.category,
          quantitySold: 0,
          revenue: 0,
        };
        stats.quantitySold += item.quantity;
        stats.revenue += Number(item.price) * item.quantity;
        itemStats.set(item.menuItemId, stats);
      }
    }

    return Array.from(itemStats.entries()).map(([id, stats]) => ({
      menuItemId: id,
      ...stats,
      revenue: Math.round(stats.revenue * 100) / 100,
    })).sort((a, b) => b.revenue - a.revenue);
  }

  // Operational stats
  async getOperationalStats(tenantId: string, startDate: Date, endDate: Date) {
    const [shifts, reservations, orders] = await Promise.all([
      this.prisma.shift.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
      }),
      this.prisma.reservation.findMany({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
      }),
      this.prisma.order.findMany({
        where: { tenantId, orderedAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const laborCost = shifts.reduce((sum, s) => sum + Number(s.laborCost || 0), 0);
    const laborCostPct = completedOrders.length > 0 && completedOrders.reduce((sum, o) => sum + Number(o.total), 0) > 0
      ? (laborCost / completedOrders.reduce((sum, o) => sum + Number(o.total), 0)) * 100
      : 0;

    return {
      totalShifts: shifts.length,
      totalReservations: reservations.length,
      noShowRate: reservations.length > 0
        ? Math.round((reservations.filter(r => r.status === 'NO_SHOW').length / reservations.length) * 10000) / 100
        : 0,
      laborCostPct: Math.round(laborCostPct * 100) / 100,
      completedOrders: completedOrders.length,
    };
  }
}