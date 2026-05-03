import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  timeClockEntry: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  shift: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  order: { findMany: jest.fn(), findUnique: jest.fn() },
  user: { findMany: jest.fn() },
};

describe('StaffService', () => {
  let service: StaffService;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<StaffService>(StaffService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should clock in', async () => {
    const entry = { id: 'entry-1', tenantId, userId: 'user-1', clockIn: new Date() };
    mockPrisma.timeClockEntry.create.mockResolvedValue(entry);

    const result = await service.clockIn(tenantId, 'user-1');
    expect(result.id).toBe('entry-1');
  });

  it('should clock out', async () => {
    const entry = { id: 'entry-1', tenantId, userId: 'user-1', clockIn: new Date(), clockOut: null };
    mockPrisma.timeClockEntry.findFirst.mockResolvedValue(entry);
    mockPrisma.timeClockEntry.update.mockResolvedValue({ ...entry, clockOut: new Date() });

    const result = await service.clockOut(tenantId, 'user-1');
    expect(result.clockOut).toBeDefined();
  });

  it('should throw if clock out without clock in', async () => {
    mockPrisma.timeClockEntry.findFirst.mockResolvedValue(null);
    await expect(service.clockOut(tenantId, 'user-1')).rejects.toThrow('No active clock-in found');
  });

  it('should create shift', async () => {
    const shift = { id: 'shift-1', tenantId, userId: 'user-1', date: new Date(), startTime: '09:00', endTime: '17:00', role: 'SERVER' };
    mockPrisma.shift.create.mockResolvedValue(shift);

    const result = await service.createShift(tenantId, { userId: 'user-1', date: new Date(), startTime: '09:00', endTime: '17:00', role: 'SERVER' });
    expect(result.id).toBe('shift-1');
  });

  it('should distribute tips 70/15/10/5', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1' });

    const result = await service.distributeTips('order-1', 100);
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBeCloseTo(100, 0);
    expect(result.find(r => r.role === 'SERVER')?.amount).toBe(70);
  });

  it('should get users filtered by role', async () => {
    const users = [{ id: '1', firstName: 'John', role: 'SERVER' }];
    mockPrisma.user.findMany.mockResolvedValue(users);

    const result = await service.getUsers(tenantId, 'SERVER');
    expect(result).toHaveLength(1);
  });

  it('should NOT show users from other tenants', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await service.getUsers('wrong-tenant');
    expect(result).toHaveLength(0);
  });
});