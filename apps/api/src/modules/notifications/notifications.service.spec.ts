import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return notifications for tenant', async () => {
      const notifications = [{ id: 'n1' }, { id: 'n2' }];
      mockPrismaService.notification.findMany.mockResolvedValue(notifications);

      const result = await service.getNotifications('tenant-1');

      expect(result).toEqual(notifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter by unread when requested', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getNotifications('tenant-1', true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', read: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('tenant-1');

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', read: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead('notif-1', 'tenant-1');

      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', tenantId: 'tenant-1' },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('tenant-1');

      expect(result).toEqual({ count: 3 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteNotification('notif-1', 'tenant-1');

      expect(result).toEqual({ count: 1 });
      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', tenantId: 'tenant-1' },
      });
    });
  });
});
