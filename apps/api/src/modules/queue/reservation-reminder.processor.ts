import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RESERVATION_REMINDER_QUEUE } from './queue.module';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../database/prisma.service';
import { format } from 'date-fns';

export interface ReservationReminderJob {
  reservationId: string;
}

@Processor(RESERVATION_REMINDER_QUEUE)
export class ReservationReminderProcessor {
  private readonly logger = new Logger(ReservationReminderProcessor.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  @Process('send-reminder')
  async handleReminder(job: Job<ReservationReminderJob>) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: job.data.reservationId },
      include: { tenant: true },
    });

    if (!reservation || reservation.reminderSent || reservation.status === 'CANCELLED') return;

    const guestEmail = reservation.guestEmail;
    if (!guestEmail) {
      this.logger.warn(`Reservation ${reservation.id} has no guest email — skipping reminder`);
      return;
    }

    const dateStr = format(new Date(reservation.date), 'EEEE, MMMM d, yyyy');
    await this.email.sendReservationReminder({
      guestFirstName: reservation.guestFirstName,
      guestEmail,
      date: dateStr,
      time: reservation.time,
      partySize: reservation.partySize,
      restaurantName: reservation.tenant.name,
    });

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { reminderSent: true },
    });

    this.logger.log(`Sent reminder for reservation ${reservation.id} to ${guestEmail}`);
  }
}
