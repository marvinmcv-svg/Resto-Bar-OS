import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(tenantId: string, unreadOnly?: boolean) {
    const where: Record<string, unknown> = { tenantId };
    if (unreadOnly) where['read'] = false;
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(tenantId: string) {
    return this.prisma.notification.count({
      where: { tenantId, read: false },
    });
  }

  async markAsRead(id: string, tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { id, tenantId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(tenantId: string) {
    return this.prisma.notification.updateMany({
      where: { tenantId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  async deleteNotification(id: string, tenantId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, tenantId },
    });
  }
}
