import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.mailgun.org',
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`Email not configured — would have sent to ${options.to}: ${options.subject}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM ?? '"RestaurantOS" <noreply@restaurantos.com>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.html.replace(/<[^>]+>/g, ''),
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
      return false;
    }
  }

  async sendReservationConfirmation(reservation: {
    guestFirstName: string;
    guestEmail: string;
    date: string;
    time: string;
    partySize: number;
    restaurantName: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: reservation.guestEmail,
      subject: `Reservation Confirmed — ${reservation.restaurantName}`,
      html: `
        <h2>Your reservation is confirmed!</h2>
        <p>Hi ${reservation.guestFirstName},</p>
        <p>We look forward to welcoming you at <strong>${reservation.restaurantName}</strong>.</p>
        <ul>
          <li><strong>Date:</strong> ${reservation.date}</li>
          <li><strong>Time:</strong> ${reservation.time}</li>
          <li><strong>Party size:</strong> ${reservation.partySize}</li>
        </ul>
        <p>If you need to cancel or modify your reservation, please contact us.</p>
      `,
    });
  }

  async sendReservationReminder(reservation: {
    guestFirstName: string;
    guestEmail: string;
    date: string;
    time: string;
    partySize: number;
    restaurantName: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: reservation.guestEmail,
      subject: `Reminder: Your reservation tomorrow — ${reservation.restaurantName}`,
      html: `
        <h2>Your reservation is tomorrow!</h2>
        <p>Hi ${reservation.guestFirstName},</p>
        <p>Just a reminder that your table at <strong>${reservation.restaurantName}</strong> is booked for tomorrow.</p>
        <ul>
          <li><strong>Date:</strong> ${reservation.date}</li>
          <li><strong>Time:</strong> ${reservation.time}</li>
          <li><strong>Party size:</strong> ${reservation.partySize}</li>
        </ul>
        <p>We look forward to seeing you!</p>
      `,
    });
  }

  async sendCampaignEmail(options: {
    to: string;
    firstName: string;
    subject: string;
    htmlContent: string;
  }): Promise<boolean> {
    const personalized = options.htmlContent.replace(/{{firstName}}/g, options.firstName);
    return this.sendEmail({ to: options.to, subject: options.subject, html: personalized });
  }
}
