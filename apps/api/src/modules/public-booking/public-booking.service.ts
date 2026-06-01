import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';

interface TimeSlot {
  time: string;
  tablesAvailable: number;
}

interface AvailabilityResult {
  date: string;
  partySize: number;
  slots: TimeSlot[];
}

@Injectable()
export class PublicBookingService {
  constructor(private prisma: PrismaService) {}

  async checkAvailability(
    tenantSlug: string,
    date: string,
    partySize: number,
  ): Promise<AvailabilityResult> {
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);

    if (isNaN(requestedDate.getTime()) || requestedDate < today || requestedDate > maxDate) {
      throw new BadRequestException('Date must be within the next 60 days and not in the past');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Restaurant not found`);
    }

    const tenantId = tenant.id;

    // Get all tables that can fit the party size
    const tables = await this.prisma.table.findMany({
      where: {
        tenantId,
        capacity: { gte: partySize },
      },
      orderBy: { capacity: 'asc' },
    });

    // Get existing reservations for the date
    const existingReservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        date: new Date(date),
        status: { in: ['CONFIRMED', 'PENDING', 'SEATED'] },
      },
      include: { table: true },
    });

    // Define service periods: lunch 11:00-15:00, dinner 17:00-22:00
    const lunchSlots = this.generateSlots('11:00', '15:00', 30);
    const dinnerSlots = this.generateSlots('17:00', '22:00', 30);
    const allSlots = [...lunchSlots, ...dinnerSlots];

    const slots: TimeSlot[] = allSlots.map((time) => {
      // Count tables NOT reserved at this time
      const reservedTableIds = new Set(
        existingReservations
          .filter((r) => r.time === time)
          .map((r) => r.tableId)
          .filter((id): id is string => id !== null),
      );

      const available = tables.filter((t) => !reservedTableIds.has(t.id)).length;
      return { time, tablesAvailable: available };
    });

    return { date, partySize, slots };
  }

  async createReservation(
    tenantSlug: string,
    data: CreatePublicReservationDto,
  ): Promise<{
    reservationId: string;
    confirmationNumber: string;
    tableNumber: number | null;
    date: string;
    time: string;
  }> {
    const requestedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);

    if (isNaN(requestedDate.getTime()) || requestedDate < today || requestedDate > maxDate) {
      throw new BadRequestException('Date must be within the next 60 days and not in the past');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Restaurant not found`);
    }

    const tenantId = tenant.id;
    const [guestFirstName, ...guestLastNameParts] = data.guestName.trim().split(' ');
    const guestLastName = guestLastNameParts.join(' ') || null;

    // Find or create guest
    let guest = await this.prisma.guest.findFirst({
      where: {
        tenantId,
        email: data.guestEmail,
      },
    });

    if (!guest) {
      guest = await this.prisma.guest.create({
        data: {
          tenantId,
          firstName: guestFirstName,
          lastName: guestLastName,
          email: data.guestEmail,
          phone: data.guestPhone,
        },
      });
    }

    // Auto-assign table: find smallest table with enough capacity that's available
    const table = await this.prisma.table.findFirst({
      where: {
        tenantId,
        capacity: { gte: data.partySize },
        status: 'AVAILABLE',
      },
      orderBy: { capacity: 'asc' },
    });

    if (!table) {
      throw new BadRequestException(
        'No tables available for the selected date and time. Please try a different time or reduce party size.',
      );
    }

    const tableId = table.id;
    const tableNumber = table.number;

    // Generate a simple confirmation number
    const confirmationNumber = this.generateConfirmationNumber();

    const reservation = await this.prisma.reservation.create({
      data: {
        tenantId,
        guestId: guest.id,
        guestFirstName: guestFirstName,
        guestLastName: guestLastName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        date: new Date(data.date),
        time: data.time,
        partySize: data.partySize,
        status: 'CONFIRMED',
        tableId,
        occasion: data.occasion,
        notes: data.notes,
        confirmationSent: false,
      },
    });

    return {
      reservationId: reservation.id,
      confirmationNumber,
      tableNumber,
      date: data.date,
      time: data.time,
    };
  }

  private generateSlots(start: string, end: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      currentMinutes += intervalMinutes;
    }

    return slots;
  }

  private generateConfirmationNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
