import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  async createCampaign(tenantId: string, dto: Record<string, unknown>) {
    return this.prisma.emailCampaign.create({
      data: {
        tenantId,
        name: String(dto['name'] ?? ''),
        type: (dto['type'] as 'EMAIL' | 'SMS' | 'PUSH') || 'EMAIL',
        trigger: (dto['trigger'] as 'IMMEDIATE' | 'SCHEDULED' | 'RESERVATION_MADE' | 'POST_DINING' | 'BIRTHDAY' | 'WINBACK_60' | 'WINBACK_90') || 'IMMEDIATE',
        targetSegment: Array.isArray(dto['targetSegment']) ? dto['targetSegment'] as string[] : [],
        subject: String(dto['subject'] ?? ''),
        templateId: String(dto['templateId'] ?? dto['name'] ?? ''),
        contentJson: (dto['content'] as Record<string, unknown>) || {},
        status: CampaignStatus.DRAFT,
        ...(dto['sendAt'] ? { sendAt: new Date(dto['sendAt'] as string) } : {}),
      },
    });
  }

  async getCampaigns(tenantId: string) {
    return this.prisma.emailCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(id: string, tenantId: string) {
    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async updateCampaign(id: string, tenantId: string, dto: Record<string, unknown>) {
    const campaign = await this.getCampaign(id, tenantId);
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Can only update DRAFT campaigns');
    }
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(dto['name'] !== undefined && { name: String(dto['name']) }),
        ...(dto['type'] !== undefined && { type: dto['type'] }),
        ...(dto['trigger'] !== undefined && { trigger: dto['trigger'] }),
        ...(dto['targetSegment'] !== undefined && { targetSegment: dto['targetSegment'] }),
        ...(dto['subject'] !== undefined && { subject: String(dto['subject']) }),
        ...(dto['templateId'] !== undefined && { templateId: String(dto['templateId']) }),
        ...(dto['content'] !== undefined && { contentJson: dto['content'] }),
        ...(dto['sendAt'] !== undefined && { sendAt: new Date(dto['sendAt'] as string) }),
      },
    });
  }

  async deleteCampaign(id: string, tenantId: string) {
    const campaign = await this.getCampaign(id, tenantId);
    if (campaign.status === 'SENDING') {
      throw new BadRequestException('Cannot delete a campaign that is currently sending');
    }
    return this.prisma.emailCampaign.delete({ where: { id } });
  }

  async sendCampaign(id: string, tenantId: string) {
    const campaign = await this.getCampaign(id, tenantId);

    if (campaign.status === 'SENDING') {
      throw new BadRequestException('Campaign is already being sent');
    }

    const guests = await this.getAudienceBySegment(tenantId, campaign.targetSegment as string[]);

    // Simulate send (Phase 8: just log to DB)
    await this.prisma.notification.createMany({
      data: guests.map((guest) => ({
        tenantId,
        type: 'CAMPAIGN_SENT',
        title: `Campaign sent: ${campaign.name}`,
        message: `Email sent to ${guest.firstName}`,
        data: { campaignId: id, guestId: guest.id },
      })),
    });

    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SENT,
        sentCount: guests.length,
        sendAt: new Date(),
      },
    });
  }

  async getAudienceBySegment(tenantId: string, segments: string[]) {
    const where: Record<string, unknown> = { tenantId };

    if (segments.includes('VIP')) {
      where['vipTier'] = { in: ['GOLD', 'PLATINUM'] };
    }
    if (segments.includes('FIRST_VISIT')) {
      where['visitCount'] = 1;
    }
    if (segments.includes('LAPSED_90')) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      where['lastVisit'] = { lt: ninetyDaysAgo };
    }

    return this.prisma.guest.findMany({ where });
  }

  async getAudiencePreview(tenantId: string, segments: string[]) {
    const guests = await this.getAudienceBySegment(tenantId, segments);
    return { count: guests.length, segments };
  }

  // Post-dining trigger
  async onOrderCompleted(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { guest: { include: { tenant: true } } },
    });

    if (!order?.guest) return;

    // Create post-dining notification
    await this.prisma.notification.create({
      data: {
        tenantId: order.guest.tenantId,
        type: 'CAMPAIGN_SENT',
        title: 'Thank you for dining with us!',
        message: `Thank you ${order.guest.firstName}! We hope you enjoyed your meal.`,
        data: { orderId, guestId: order.guestId },
      },
    });
  }
}
