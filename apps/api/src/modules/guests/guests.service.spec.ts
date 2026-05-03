import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../database/prisma.service';
import { VipTier } from '@prisma/client';

const mockPrisma = {
  guest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GuestsService', () => {
  let service: GuestsService;
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GuestsService>(GuestsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  it('should create guest with FIRST_VISIT tag', async () => {
    const dto = { firstName: 'John', email: 'john@test.com' };
    const created = { id: '1', ...dto, tags: ['FIRST_VISIT'], vipTier: VipTier.NONE, tenantId };
    mockPrisma.guest.create.mockResolvedValue(created);

    const result = await service.create(dto, tenantId);
    expect(result.tags).toContain('FIRST_VISIT');
    expect(mockPrisma.guest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId, tags: ['FIRST_VISIT'] }),
    });
  });

  it('should find guest by ID with orders included', async () => {
    const guest = { id: '1', firstName: 'John', tenantId, orders: [], reservations: [] };
    mockPrisma.guest.findFirst.mockResolvedValue(guest);

    const result = await service.findOne('1', tenantId);
    expect(result.id).toBe('1');
  });

  it('should search guests by name', async () => {
    const guests = [{ id: '1', firstName: 'John' }, { id: '2', firstName: 'Johnny' }];
    mockPrisma.guest.findMany.mockResolvedValue(guests);

    const result = await service.search(tenantId, 'John');
    expect(result).toHaveLength(2);
    expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          OR: expect.any(Array),
        }),
      })
    );
  });

  it('should filter by VIP tier', async () => {
    const guests = [{ id: '1', firstName: 'John', vipTier: VipTier.GOLD }];
    mockPrisma.guest.findMany.mockResolvedValue(guests);

    await service.findAll(tenantId, undefined, VipTier.GOLD);
    expect(mockPrisma.guest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, vipTier: VipTier.GOLD }),
      })
    );
  });

  it('should NOT find guest from different tenant', async () => {
    mockPrisma.guest.findFirst.mockResolvedValue(null);

    await expect(service.findOne('guest-id', 'wrong-tenant')).rejects.toThrow('Guest not found');
  });

  it('should calculate VIP tier correctly', async () => {
    const guest = { id: '1', tenantId, lifetimeValue: 8000, visitCount: 15, vipTier: VipTier.NONE };
    mockPrisma.guest.findUnique.mockResolvedValue(guest);
    mockPrisma.guest.update.mockResolvedValue({ ...guest, vipTier: VipTier.GOLD });

    const tier = await service.recalculateTier('1');
    expect(tier).toBe(VipTier.GOLD);
  });

  it('should recalculate tags — FIRST_VISIT', async () => {
    const guest = { id: '1', tenantId, visitCount: 1, tags: [], orders: [], lastVisit: new Date(), averageSpend: 0, vipTier: VipTier.NONE };
    mockPrisma.guest.findUnique.mockResolvedValue(guest);
    mockPrisma.guest.update.mockResolvedValue(guest);

    await service.recalculateTags('1');
    expect(mockPrisma.guest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '1' },
        data: expect.objectContaining({
          tags: expect.arrayContaining(['FIRST_VISIT']),
        }),
      })
    );
  });

  it('should recalculate tags — LAPSED_90', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const guest = { id: '1', tenantId, visitCount: 5, tags: [], orders: [], lastVisit: oldDate, averageSpend: 0, vipTier: VipTier.NONE };
    mockPrisma.guest.findUnique.mockResolvedValue(guest);
    mockPrisma.guest.update.mockResolvedValue(guest);

    await service.recalculateTags('1');
    expect(mockPrisma.guest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: expect.arrayContaining(['LAPSED_90']),
        }),
      })
    );
  });
});