import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { EmailService } from '../email/email.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationStatus, TableStatus } from '@prisma/client';
import { format } from 'date-fns';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private email: EmailService,
  ) {}

  async create(dto: CreateReservationDto, tenantId: string) {
    const date = new Date(dto.date);

    // Check if date is in the past
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new BadRequestException('Cannot create reservation in the past');
    }

    // Check guest exists (by email or phone) and link if found
    let guestId = undefined;
    if (dto.guestEmail || dto.guestPhone) {
      const guest = await this.prisma.guest.findFirst({
        where: {
          tenantId,
          OR: [
            dto.guestEmail ? { email: dto.guestEmail } : {},
            dto.guestPhone ? { phone: dto.guestPhone } : {},
          ],
        },
      });
      if (guest) guestId = guest.id;
    }

    // Auto-assign table if not specified
    let tableId = dto.tableId;
    if (!tableId && dto.partySize) {
      const table = await this.prisma.table.findFirst({
        where: {
          tenantId,
          status: TableStatus.AVAILABLE,
          capacity: { gte: dto.partySize },
        },
        orderBy: { capacity: 'asc' },
      });
      if (table) tableId = table.id;
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        tenantId,
        guestId,
        guestFirstName: dto.guestFirstName,
        guestLastName: dto.guestLastName,
        guestEmail: dto.guestEmail,
        guestPhone: dto.guestPhone,
        date: new Date(dto.date),
        time: dto.time,
        partySize: dto.partySize,
        tableId,
        tablePref: dto.tablePref,
        occasion: dto.occasion,
        occasionNote: dto.occasionNote,
        notes: dto.notes,
        bookingType: dto.bookingType || 'STANDARD',
        depositRequired: dto.depositRequired || false,
        depositAmount: dto.depositRequired ? 50 : undefined,
      },
      include: { tenant: true },
    });

    this.events.emitNewReservation(tenantId, reservation);

    if (reservation.guestEmail) {
      this.email.sendReservationConfirmation({
        guestFirstName: reservation.guestFirstName,
        guestEmail: reservation.guestEmail,
        date: format(new Date(reservation.date), 'EEEE, MMMM d, yyyy'),
        time: reservation.time,
        partySize: reservation.partySize,
        restaurantName: reservation.tenant.name,
      }).then(() =>
        this.prisma.reservation.update({
          where: { id: reservation.id },
          data: { confirmationSent: true },
        }),
      );
    }

    return reservation;
  }

  async findAll(tenantId: string, date?: string) {
    const where: any = { tenantId };
    if (date) {
      where.date = new Date(date);
    }
    return this.prisma.reservation.findMany({
      where,
      include: { guest: true, table: true },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { guest: true, table: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.reservation.update({
      where: { id, tenantId },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      } as any,
    });
  }

  async changeStatus(id: string, status: ReservationStatus, tenantId: string, reason?: string) {
    const reservation = await this.findOne(id, tenantId);

    // Side effects
    if (status === 'SEATED' && reservation.tableId) {
      await this.prisma.table.update({
        where: { id: reservation.tableId, tenantId },
        data: { status: TableStatus.SEATED },
      });
    }

    if ((status === 'COMPLETED' || status === 'CANCELLED') && reservation.tableId) {
      await this.prisma.table.update({
        where: { id: reservation.tableId, tenantId },
        data: { status: TableStatus.TURNING },
      });
    }

    if (status === 'NO_SHOW' && reservation.guestId) {
      await this.prisma.guest.update({
        where: { id: reservation.guestId, tenantId },
        data: { noShowCount: { increment: 1 } },
      });
    }

    return this.prisma.reservation.update({
      where: { id, tenantId },
      data: { status },
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.reservation.delete({ where: { id, tenantId } });
  }

  async getByDate(tenantId: string, date: string) {
    return this.prisma.reservation.findMany({
      where: {
        tenantId,
        date: new Date(date),
      },
      include: { guest: true, table: true },
      orderBy: { time: 'asc' },
    });
  }

  async getByGuest(guestId: string, tenantId: string) {
    return this.prisma.reservation.findMany({
      where: { guestId, tenantId },
      orderBy: { date: 'desc' },
    });
  }
}