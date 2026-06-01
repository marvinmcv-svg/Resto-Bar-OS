import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Role, ShiftStatus } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  // Time Clock
  async clockIn(tenantId: string, userId: string, shiftId?: string) {
    return this.prisma.timeClockEntry.create({
      data: { tenantId, userId, shiftId, clockIn: new Date() },
    });
  }

  async clockOut(tenantId: string, userId: string) {
    const entry = await this.prisma.timeClockEntry.findFirst({
      where: { tenantId, userId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    });
    if (!entry) throw new NotFoundException('No active clock-in found');
    return this.prisma.timeClockEntry.update({
      where: { id: entry.id },
      data: { clockOut: new Date() },
    });
  }

  async getTimeEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) where.clockIn.gte = startDate;
      if (endDate) where.clockIn.lte = endDate;
    }
    return this.prisma.timeClockEntry.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { clockIn: 'desc' },
    });
  }

  // Scheduling
  async createShift(tenantId: string, dto: { userId: string; date: Date; startTime: string; endTime: string; role: Role }) {
    return this.prisma.shift.create({
      data: { tenantId, ...dto },
    });
  }

  async getShifts(tenantId: string, date?: string) {
    const where: any = { tenantId };
    if (date) where.date = new Date(date);
    return this.prisma.shift.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { startTime: 'asc' },
    });
  }

  async updateShiftStatus(shiftId: string, status: ShiftStatus) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const update: any = { status };
    if (status === 'IN_PROGRESS') update.clockedInAt = new Date();
    if (status === 'COMPLETED') update.clockedOutAt = new Date();

    return this.prisma.shift.update({ where: { id: shiftId }, data: update });
  }

  // Staff Performance
  async getPerformance(tenantId: string, userId: string, startDate: Date, endDate: Date) {
    const [orders, shifts] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          serverId: userId,
          tenantId,
          orderedAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        include: { items: true },
      }),
      this.prisma.shift.findMany({
        where: { userId, tenantId, date: { gte: startDate, lte: endDate }, status: 'COMPLETED' },
      }),
    ]);

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalTips = orders.reduce((sum, o) => sum + Number(o.tip), 0);
    const totalCovers = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgTipPercent = totalSales > 0 ? (totalTips / totalSales) * 100 : 0;

    return {
      userId,
      totalOrders: orders.length,
      totalSales,
      totalTips,
      avgTipPercent: Math.round(avgTipPercent * 100) / 100,
      avgShiftDuration: shifts.length > 0 ? 8 : 0, // simplified
    };
  }

  // Users CRUD
  async getUsers(tenantId: string, role?: Role) {
    const where: any = { tenantId, isActive: true };
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  // Tip Distribution
  async distributeTips(tenantId: string, orderId: string, tipAmount: number) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    const distribution = [
      { role: 'SERVER' as Role, percentage: 70 },
      { role: 'BARTENDER' as Role, percentage: 15 },
      { role: 'HOST' as Role, percentage: 10 },
      { role: 'BARTENDER' as Role, percentage: 5 }, // busser equivalent in this simplified model
    ];

    const result = distribution.map(d => ({
      role: d.role,
      amount: Math.round(tipAmount * d.percentage / 100 * 100) / 100,
    }));

    return result;
  }
}