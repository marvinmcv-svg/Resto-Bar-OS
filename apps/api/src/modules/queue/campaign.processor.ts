import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CAMPAIGN_QUEUE } from './queue.module';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../database/prisma.service';

export interface CampaignJob {
  campaignId: string;
  tenantId: string;
}

@Processor(CAMPAIGN_QUEUE)
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  @Process('send')
  async handleSend(job: Job<CampaignJob>) {
    const { campaignId, tenantId } = job.data;

    const campaign = await this.prisma.emailCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found`);
      return;
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    const guests = await this.buildAudience(tenantId, campaign.targetSegment as string[]);
    const contentJson = campaign.contentJson as Record<string, string>;
    const htmlBody = contentJson['html'] ?? contentJson['body'] ?? '<p>{{firstName}}</p>';

    let sent = 0;
    for (const guest of guests) {
      if (!guest.email || !guest.emailOptIn) continue;
      const ok = await this.email.sendCampaignEmail({
        to: guest.email,
        firstName: guest.firstName,
        subject: campaign.subject,
        htmlContent: htmlBody,
      });
      if (ok) sent++;
      await job.progress(Math.round((guests.indexOf(guest) / guests.length) * 100));
    }

    await this.prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentCount: sent, sendAt: new Date() },
    });

    this.logger.log(`Campaign ${campaignId} sent to ${sent}/${guests.length} guests`);
  }

  private async buildAudience(tenantId: string, segments: string[]) {
    const where: Record<string, unknown> = { tenantId };
    if (segments.includes('VIP')) where['vipTier'] = { in: ['GOLD', 'PLATINUM'] };
    if (segments.includes('FIRST_VISIT')) where['visitCount'] = 1;
    if (segments.includes('LAPSED_90')) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      where['lastVisit'] = { lt: cutoff };
    }
    return this.prisma.guest.findMany({ where });
  }
}
