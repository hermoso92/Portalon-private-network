import { Test, TestingModule } from '@nestjs/testing';
import { CommissionsService } from './commissions.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  lead: {
    findUnique: jest.fn(),
  },
  commissionRule: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  commissionEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
  },
};

describe('CommissionsService', () => {
  let service: CommissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
    jest.clearAllMocks();
  });

  describe('processLeadEvent', () => {
    const mockLead = {
      id: 'lead-1',
      promotionId: 'promo-1',
      partnerId: 'partner-1',
      unit: { price: '250000' },
      attribution: null,
    };

    it('should create commission event on reservation', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.commissionEvent.findFirst.mockResolvedValue(null);
      mockPrisma.commissionRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          calculationType: 'PERCENTAGE_OF_SALE',
          amount: '3',
          triggerType: 'ON_RESERVATION',
        },
      ]);
      mockPrisma.commissionEvent.create.mockResolvedValue({});

      await service.processLeadEvent('lead-1', 'RESERVED');

      expect(mockPrisma.commissionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commissionAmount: 7500, // 3% of 250000
            triggerType: 'ON_RESERVATION',
          }),
        }),
      );
    });

    it('should not create duplicate commission events', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.commissionEvent.findFirst.mockResolvedValue({ id: 'existing-event' });

      await service.processLeadEvent('lead-1', 'RESERVED');

      expect(mockPrisma.commissionEvent.create).not.toHaveBeenCalled();
    });

    it('should not create commission if no partner', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        partnerId: null,
        attribution: null,
      });

      await service.processLeadEvent('lead-1', 'RESERVED');

      expect(mockPrisma.commissionEvent.create).not.toHaveBeenCalled();
    });

    it('should use fixed amount rule if FIXED_AMOUNT type', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
      mockPrisma.commissionEvent.findFirst.mockResolvedValue(null);
      mockPrisma.commissionRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          calculationType: 'FIXED_AMOUNT',
          amount: '1500',
          triggerType: 'ON_SALE',
        },
      ]);
      mockPrisma.commissionEvent.create.mockResolvedValue({});

      await service.processLeadEvent('lead-1', 'WON');

      expect(mockPrisma.commissionEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commissionAmount: 1500,
          }),
        }),
      );
    });
  });
});
