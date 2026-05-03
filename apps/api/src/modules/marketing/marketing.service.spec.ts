import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';

const mockPrismaService = {
  emailCampaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  guest: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
};

describe('MarketingService', () => {
  let service: MarketingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
    jest.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create a campaign with defaults', async () => {
      const tenantId = 'tenant-1';
      const dto = { name: 'Test Campaign', subject: 'Hello' };
      const created = { id: 'camp-1', ...dto, status: CampaignStatus.DRAFT, tenantId };

      mockPrismaService.emailCampaign.create.mockResolvedValue(created);

      const result = await service.createCampaign(tenantId, dto);

      expect(result).toEqual(created);
      expect(mockPrismaService.emailCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Test Campaign',
          type: 'EMAIL',
          trigger: 'IMMEDIATE',
          targetSegment: [],
          subject: 'Hello',
          status: CampaignStatus.DRAFT,
        }),
      });
    });

    it('should apply custom type and trigger', async () => {
      const tenantId = 'tenant-1';
      const dto = { name: 'VIP Campaign', subject: 'Exclusive', type: 'SMS', trigger: 'BIRTHDAY' };

      mockPrismaService.emailCampaign.create.mockResolvedValue({ id: 'camp-1' });

      await service.createCampaign(tenantId, dto);

      expect(mockPrismaService.emailCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SMS',
          trigger: 'BIRTHDAY',
        }),
      });
    });

    it('should set sendAt when provided', async () => {
      const sendAt = '2025-12-01T10:00:00.000Z';
      const dto = { name: 'Scheduled', subject: 'Later', sendAt };

      mockPrismaService.emailCampaign.create.mockResolvedValue({ id: 'camp-1' });

      await service.createCampaign('tenant-1', dto);

      expect(mockPrismaService.emailCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sendAt: new Date(sendAt),
        }),
      });
    });
  });

  describe('getCampaigns', () => {
    it('should return campaigns ordered by createdAt desc', async () => {
      const tenantId = 'tenant-1';
      const campaigns = [{ id: 'camp-1' }, { id: 'camp-2' }];

      mockPrismaService.emailCampaign.findMany.mockResolvedValue(campaigns);

      const result = await service.getCampaigns(tenantId);

      expect(result).toEqual(campaigns);
      expect(mockPrismaService.emailCampaign.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCampaign', () => {
    it('should return campaign when found', async () => {
      const campaign = { id: 'camp-1', tenantId: 'tenant-1', status: CampaignStatus.DRAFT };
      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);

      const result = await service.getCampaign('camp-1', 'tenant-1');

      expect(result).toEqual(campaign);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(null);

      await expect(service.getCampaign('nonexistent', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCampaign', () => {
    it('should update DRAFT campaign', async () => {
      const campaign = { id: 'camp-1', status: CampaignStatus.DRAFT };
      const updated = { ...campaign, name: 'Updated Name' };

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);
      mockPrismaService.emailCampaign.update.mockResolvedValue(updated);

      const result = await service.updateCampaign('camp-1', 'tenant-1', { name: 'Updated Name' });

      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when campaign is not DRAFT', async () => {
      const campaign = { id: 'camp-1', status: CampaignStatus.SENT };

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);

      await expect(
        service.updateCampaign('camp-1', 'tenant-1', { name: 'New Name' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendCampaign', () => {
    it('should send campaign and create notifications for each guest', async () => {
      const campaign = { id: 'camp-1', name: 'Test', targetSegment: [], tenantId: 'tenant-1', status: CampaignStatus.SCHEDULED };
      const guests = [{ id: 'g1', firstName: 'John' }, { id: 'g2', firstName: 'Jane' }];

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);
      mockPrismaService.guest.findMany.mockResolvedValue(guests);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.emailCampaign.update.mockResolvedValue({ ...campaign, status: CampaignStatus.SENT });

      const result = await service.sendCampaign('camp-1', 'tenant-1');

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: [
          { tenantId: 'tenant-1', type: 'CAMPAIGN_SENT', title: 'Campaign sent: Test', message: 'Email sent to John', data: { campaignId: 'camp-1', guestId: 'g1' } },
          { tenantId: 'tenant-1', type: 'CAMPAIGN_SENT', title: 'Campaign sent: Test', message: 'Email sent to Jane', data: { campaignId: 'camp-1', guestId: 'g2' } },
        ],
      });
      expect(result.status).toBe(CampaignStatus.SENT);
    });

    it('should throw BadRequestException when campaign is already sending', async () => {
      const campaign = { id: 'camp-1', status: CampaignStatus.SENDING };

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);

      await expect(service.sendCampaign('camp-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a DRAFT campaign', async () => {
      const campaign = { id: 'camp-1', status: CampaignStatus.DRAFT };

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);
      mockPrismaService.emailCampaign.delete.mockResolvedValue(campaign);

      const result = await service.deleteCampaign('camp-1', 'tenant-1');

      expect(result).toEqual(campaign);
    });

    it('should throw BadRequestException when deleting a SENDING campaign', async () => {
      const campaign = { id: 'camp-1', status: CampaignStatus.SENDING };

      mockPrismaService.emailCampaign.findFirst.mockResolvedValue(campaign);

      await expect(service.deleteCampaign('camp-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAudienceBySegment', () => {
    it('should filter by VIP tier', async () => {
      mockPrismaService.guest.findMany.mockResolvedValue([{ id: 'vip-1' }]);

      await service.getAudienceBySegment('tenant-1', ['VIP']);

      expect(mockPrismaService.guest.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ vipTier: { in: ['GOLD', 'PLATINUM'] } }),
      });
    });

    it('should filter by first visit', async () => {
      mockPrismaService.guest.findMany.mockResolvedValue([]);

      await service.getAudienceBySegment('tenant-1', ['FIRST_VISIT']);

      expect(mockPrismaService.guest.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ visitCount: 1 }),
      });
    });

    it('should filter by lapsed 90 days', async () => {
      mockPrismaService.guest.findMany.mockResolvedValue([]);

      await service.getAudienceBySegment('tenant-1', ['LAPSED_90']);

      expect(mockPrismaService.guest.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          lastVisit: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      });
    });

    it('should combine multiple segments', async () => {
      mockPrismaService.guest.findMany.mockResolvedValue([]);

      await service.getAudienceBySegment('tenant-1', ['VIP', 'FIRST_VISIT', 'LAPSED_90']);

      expect(mockPrismaService.guest.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          vipTier: { in: ['GOLD', 'PLATINUM'] },
          visitCount: 1,
          lastVisit: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      });
    });
  });

  describe('getAudiencePreview', () => {
    it('should return count and segments', async () => {
      mockPrismaService.guest.findMany.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }]);

      const result = await service.getAudiencePreview('tenant-1', ['VIP']);

      expect(result).toEqual({ count: 3, segments: ['VIP'] });
    });
  });

  describe('onOrderCompleted', () => {
    it('should create post-dining notification for guest with order', async () => {
      const order = {
        id: 'order-1',
        guest: { id: 'guest-1', firstName: 'John', tenantId: 'tenant-1' },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(order);
      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.onOrderCompleted('order-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          type: 'CAMPAIGN_SENT',
          title: 'Thank you for dining with us!',
          message: 'Thank you John! We hope you enjoyed your meal.',
          data: { orderId: 'order-1', guestId: 'guest-1' },
        },
      });
    });

    it('should return early when order has no guest', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-1', guest: null });

      await service.onOrderCompleted('order-1');

      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });
});
