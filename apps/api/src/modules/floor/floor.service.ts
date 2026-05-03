import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TableStatus, Prisma } from '@prisma/client';

interface TimeSlot {
  time: string;          // "11:30"
  period: 'LUNCH' | 'DINNER';
}

interface AvailableSlot {
  time: string;
  period: 'LUNCH' | 'DINNER';
  availableTables: number;
}

interface SlotCoverage {
  time: string;
  period: 'LUNCH' | 'DINNER';
  tables: {
    id: string;
    number: number;
    status: TableStatus;
  }[];
}

/**
 * Service period definitions — each period has a start time, end time,
 * and slot step in minutes.
 */
const SERVICE_PERIODS = {
  LUNCH: {
    start: '11:30',
    end:   '14:30',
    step:  30,
  },
  DINNER: {
    start: '17:30',
    end:   '21:30',
    step:  30,
  },
} as const;

@Injectable()
export class FloorService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public booking integration API
  // -------------------------------------------------------------------------

  /**
   * Returns all 30-minute time slots for a given date where at least one
   * table can accommodate `partySize` guests.
   *
   * @param tenantId  - Restaurant tenant
   * @param date      - YYYY-MM-DD string
   * @param partySize - Number of guests
   */
  async getAvailableSlotsForDate(
    tenantId: string,
    date: string,
    partySize: number,
  ): Promise<AvailableSlot[]> {
    const targetDate = new Date(date);

    // 1. Get all AVAILABLE tables that fit the party
    const tables = await this.prisma.table.findMany({
      where: {
        tenantId,
        status: TableStatus.AVAILABLE,
        capacity: { gte: partySize },
      },
      orderBy: { capacity: 'asc' },
    });

    if (tables.length === 0) return [];

    // 2. Get all reservations for that date (to check slot conflicts)
    const reservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        date: targetDate,
        status: { in: ['CONFIRMED', 'SEATED'] },
        tableId: { not: null },
      },
      select: { tableId: true, time: true },
    });

    const occupiedSlots: Record<string, Set<string>> = {};

    // Build a quick lookup: tableId → Set of reserved times
    for (const res of reservations) {
      if (!res.tableId) continue;
      if (!occupiedSlots[res.tableId]) {
        occupiedSlots[res.tableId] = new Set();
      }
      occupiedSlots[res.tableId].add(res.time);
    }

    // 3. Generate all slots and filter by availability
    const slots: AvailableSlot[] = [];

    for (const [period, config] of Object.entries(SERVICE_PERIODS)) {
      const periodTimes = generateSlotTimes(config.start, config.end, config.step);

      for (const time of periodTimes) {
        // Count how many tables are NOT occupied at this time
        const freeTableCount = tables.filter((table) => {
          const occupied = occupiedSlots[table.id];
          return !occupied || !occupied.has(time);
        }).length;

        if (freeTableCount > 0) {
          slots.push({
            time,
            period: period as 'LUNCH' | 'DINNER',
            availableTables: freeTableCount,
          });
        }
      }
    }

    return slots;
  }

  /**
   * Marks a table as OCCUPIED — called when a reservation is created
   * so the table no longer appears in availability queries.
   *
   * @param tenantId - Restaurant tenant
   * @param tableId  - Table to occupy
   */
  async assignTableForReservation(tenantId: string, tableId: string): Promise<void> {
    await this.prisma.table.updateMany({
      where: { id: tableId, tenantId },
      data: { status: TableStatus.OCCUPIED },
    });
  }

  /**
   * Releases a table back to AVAILABLE — called when a reservation is
   * cancelled or completed.
   *
   * @param tableId - Table to release
   */
  async releaseTable(tableId: string): Promise<void> {
    await this.prisma.table.updateMany({
      where: { id: tableId },
      data: { status: TableStatus.AVAILABLE },
    });
  }

  // -------------------------------------------------------------------------
  // Internal / admin helpers
  // -------------------------------------------------------------------------

  /**
   * Returns, for every time slot on a given date, which tables are currently
   * occupied (used to calculate real-time availability on the frontend).
   *
   * GET /floor/:tenantId/coverage?date=YYYY-MM-DD
   */
  async getCoverageByDate(
    tenantId: string,
    date: string,
  ): Promise<SlotCoverage[]> {
    const targetDate = new Date(date);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        tenantId,
        date: targetDate,
        status: { in: ['CONFIRMED', 'SEATED'] },
        tableId: { not: null },
      },
      include: { table: true },
      orderBy: { time: 'asc' },
    });

    // Group reservations by time + period
    const slotMap = new Map<string, SlotCoverage>();

    for (const [period, config] of Object.entries(SERVICE_PERIODS)) {
      for (const time of generateSlotTimes(config.start, config.end, config.step)) {
        slotMap.set(time, {
          time,
          period: period as 'LUNCH' | 'DINNER',
          tables: [],
        });
      }
    }

    for (const res of reservations) {
      if (!res.tableId || !res.table) continue;
      const entry = slotMap.get(res.time);
      if (entry) {
        entry.tables.push({
          id:     res.table.id,
          number: res.table.number,
          status: res.table.status,
        });
      }
    }

    return Array.from(slotMap.values());
  }

  // -------------------------------------------------------------------------
  // Existing table status helpers (used by floor controller)
  // -------------------------------------------------------------------------

  async getTables(tenantId: string) {
    return this.prisma.table.findMany({
      where: { tenantId },
      orderBy: { number: 'asc' },
    });
  }

  async getTable(id: string, tenantId: string) {
    return this.prisma.table.findFirst({ where: { id, tenantId } });
  }

  async updateTableStatus(id: string, tenantId: string, status: TableStatus) {
    return this.prisma.table.updateMany({
      where: { id, tenantId },
      data: { status },
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generates an array of time strings from `start` to `end` (exclusive)
 * in `step` minute intervals.
 * Times are in HH:MM format (24-hour).
 */
function generateSlotTimes(start: string, end: string, stepMinutes: number): string[] {
  const slots: string[] = [];

  const [startH, startM] = start.split(':').map(Number);
  const [endH,   endM]   = end.split(':').map(Number);

  let current = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (current < endMinutes) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += stepMinutes;
  }

  return slots;
}
