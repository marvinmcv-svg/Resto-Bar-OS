import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  order: { findMany: jest.fn() },
  table: { findMany: jest.fn() },
  guest: { findMany: jest.fn() },
  reservation: { findMany: jest.fn() },
  shift: { findMany: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should calculate live dashboard', async () => {
    const today = new Date();
    mockPrisma.order.findMany.mockResolvedValue([
      { id: '1', total: 100, status: 'COMPLETED', orderedAt: today, items: [{ quantity: 2 }] },
      { id: '2', total: 150, status: 'COMPLETED', orderedAt: today, items: [{ quantity: 3 }] },
    ]);
    mockPrisma.table.findMany.mockResolvedValue([
      { id: '1', number: 1, status: 'SEATED' },
      { id: '2', number: 2, status: 'AVAILABLE' },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([{ id: '1' }]);

    const result = await service.getLiveDashboard(tenantId);
    expect(result.revenueToday).toBe(250);
    expect(result.coversToday).toBe(5);
    expect(result.seatedTables).toBe(1);
  });

  it('should group revenue by day', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    const orders = [
      { id: '1', total: 100, status: 'COMPLETED', orderedAt: new Date('2025-01-15'), items: [{ quantity: 2 }] },
      { id: '2', total: 200, status: 'COMPLETED', orderedAt: new Date('2025-01-20'), items: [{ quantity: 3 }] },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);

    const result = await service.getRevenueReport(tenantId, start, end, 'day');
    expect(result.totalRevenue).toBe(300);
    expect(result.byPeriod).toHaveLength(2);
  });

  it('should return top guests by LTV', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockPrisma.guest.findMany.mockResolvedValue([
      { id: '1', firstName: 'John', lastName: 'D', lifetimeValue: 5000, visitCount: 10, orders: [] },
      { id: '2', firstName: 'Jane', lastName: 'D', lifetimeValue: 8000, visitCount: 15, orders: [] },
    ]);

    const result = await service.getGuestAnalytics(tenantId, start, end);
    expect(result.topGuests[0].name).toBe('Jane D');
    expect(result.topGuests[0].ltv).toBe(8000);
  });

  it('should calculate menu performance', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockPrisma.order.findMany.mockResolvedValue([
      { status: 'COMPLETED', items: [
        { menuItem: { id: 'm1', name: 'Ribeye', category: 'mains' }, quantity: 3, price: 65 },
        { menuItem: { id: 'm1', name: 'Ribeye', category: 'mains' }, quantity: 2, price: 65 },
      ]},
    ]);

    const result = await service.getMenuPerformance(tenantId, start, end);
    expect(result[0].quantitySold).toBe(5);
    expect(result[0].revenue).toBe(325);
  });

  it('should calculate no-show rate', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    mockPrisma.shift.findMany.mockResolvedValue([]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      { id: '1', status: 'CONFIRMED' }, { id: '2', status: 'NO_SHOW' }, { id: '3', status: 'NO_SHOW' },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([]);

    const result = await service.getOperationalStats(tenantId, start, end);
    expect(result.noShowRate).toBeCloseTo(66.67, 1);
  });
});