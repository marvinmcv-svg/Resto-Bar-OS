import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../../database/prisma.service';
import { ReservationStatus, TableStatus } from '@prisma/client';

const mockPrisma = {
  reservation: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  table: { findFirst: jest.fn(), update: jest.fn() },
  guest: { findFirst: jest.fn(), update: jest.fn() },
};

describe('ReservationsService', () => {
  let service: ReservationsService;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create reservation for today with table assignment', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dto = { guestFirstName: 'John', date: tomorrow.toISOString().split('T')[0], time: '19:00', partySize: 2 };
    const reservation = { id: '1', ...dto, status: ReservationStatus.CONFIRMED, tenantId };
    mockPrisma.reservation.create.mockResolvedValue(reservation);
    mockPrisma.table.findFirst.mockResolvedValue({ id: 'table-1', status: TableStatus.AVAILABLE });

    const result = await service.create(dto, tenantId);
    expect(result.status).toBe(ReservationStatus.CONFIRMED);
  });

  it('should reject past date reservations', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dto = { guestFirstName: 'John', date: yesterday.toISOString().split('T')[0], time: '19:00', partySize: 2 };

    await expect(service.create(dto, tenantId)).rejects.toThrow('Cannot create reservation in the past');
  });

  it('should change status to SEATED and update table', async () => {
    const reservation = { id: '1', tenantId, tableId: 'table-1', status: ReservationStatus.CONFIRMED };
    const table = { id: 'table-1', status: TableStatus.AVAILABLE };
    mockPrisma.reservation.findFirst.mockResolvedValue(reservation);
    mockPrisma.reservation.update.mockResolvedValue({ ...reservation, status: ReservationStatus.SEATED });
    mockPrisma.table.update.mockResolvedValue({ ...table, status: TableStatus.SEATED });

    await service.changeStatus('1', ReservationStatus.SEATED, tenantId);
    expect(mockPrisma.table.update).toHaveBeenCalledWith({
      where: { id: 'table-1' },
      data: { status: TableStatus.SEATED },
    });
  });

  it('should increment no-show count on guest', async () => {
    const reservation = { id: '1', tenantId, guestId: 'guest-1', tableId: null, status: ReservationStatus.CONFIRMED };
    mockPrisma.reservation.findFirst.mockResolvedValue(reservation);
    mockPrisma.reservation.update.mockResolvedValue({ ...reservation, status: ReservationStatus.NO_SHOW });
    mockPrisma.guest.update.mockResolvedValue({ id: 'guest-1', noShowCount: 1 });

    await service.changeStatus('1', ReservationStatus.NO_SHOW, tenantId);
    expect(mockPrisma.guest.update).toHaveBeenCalledWith({
      where: { id: 'guest-1' },
      data: { noShowCount: { increment: 1 } },
    });
  });

  it('should NOT assign table from wrong tenant', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dto = { guestFirstName: 'John', date: tomorrow.toISOString().split('T')[0], time: '19:00', partySize: 2 };
    const reservation = { id: '1', ...dto, status: ReservationStatus.CONFIRMED, tenantId: 'wrong-tenant' };
    mockPrisma.reservation.create.mockResolvedValue(reservation);

    const result = await service.create(dto, 'tenant-1');
    expect(result.tenantId).toBe('tenant-1');
  });
});