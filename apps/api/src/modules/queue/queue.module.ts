import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignProcessor } from './campaign.processor';
import { ReservationReminderProcessor } from './reservation-reminder.processor';
import { EmailModule } from '../email/email.module';
import { PrismaService } from '../../database/prisma.service';

export const CAMPAIGN_QUEUE = 'campaign';
export const RESERVATION_REMINDER_QUEUE = 'reservation-reminder';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: CAMPAIGN_QUEUE },
      { name: RESERVATION_REMINDER_QUEUE },
    ),
    EmailModule,
  ],
  providers: [CampaignProcessor, ReservationReminderProcessor, PrismaService],
  exports: [BullModule],
})
export class QueueModule {}
