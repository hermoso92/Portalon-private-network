import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadStatus, LeadSourceType, LeadActivityType } from '@prisma/client';

const mockPrisma = {
  lead: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  leadActivity: {
    create: jest.fn(),
    createMany: jest.fn(),
  },
  attribution: {
    create: jest.fn(),
  },
  partner: {
    findUnique: jest.fn(),
  },
};

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------
  // Pipeline transition validation
  // -------------------------------------------------------
  describe('changeStatus — transiciones válidas', () => {
    const baseLead = {
      id: 'lead-1',
      status: LeadStatus.NEW,
      promotionId: 'promo-1',
      activities: [],
    };

    beforeEach(() => {
      mockPrisma.lead.update.mockResolvedValue({ ...baseLead });
      mockPrisma.leadActivity.create.mockResolvedValue({});
    });

    it('NEW → QUALIFIED debe ser válido', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.NEW });
      await expect(
        service.changeStatus('lead-1', { status: 'QUALIFIED' } as any, 'user-1'),
      ).resolves.not.toThrow();
      expect(mockPrisma.lead.update).toHaveBeenCalled();
    });

    it('NEW → RESERVED debe ser inválido (salta estados)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.NEW });
      await expect(
        service.changeStatus('lead-1', { status: 'RESERVED' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('WON → QUALIFIED debe ser inválido (estado terminal)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.WON });
      await expect(
        service.changeStatus('lead-1', { status: 'QUALIFIED' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('LOST → NEW debe ser válido (reactivación)', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.LOST });
      mockPrisma.lead.update.mockResolvedValue({ ...baseLead, status: LeadStatus.NEW });
      await expect(
        service.changeStatus('lead-1', { status: 'NEW' } as any, 'user-1'),
      ).resolves.not.toThrow();
    });

    it('RESERVED → WON debe ser válido', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.RESERVED });
      mockPrisma.lead.update.mockResolvedValue({ ...baseLead, status: LeadStatus.WON });
      await expect(
        service.changeStatus('lead-1', { status: 'WON' } as any, 'user-1'),
      ).resolves.not.toThrow();
    });

    it('VISITED → RESERVED debe ser válido', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.VISITED });
      mockPrisma.lead.update.mockResolvedValue({ ...baseLead, status: LeadStatus.RESERVED });
      await expect(
        service.changeStatus('lead-1', { status: 'RESERVED' } as any, 'user-1'),
      ).resolves.not.toThrow();
    });

    it('el mensaje de error debe incluir los estados válidos', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ ...baseLead, status: LeadStatus.NEW });
      await expect(
        service.changeStatus('lead-1', { status: 'WON' } as any, 'user-1'),
      ).rejects.toThrow(/QUALIFIED|CONTACTED|LOST/);
    });
  });

  // -------------------------------------------------------
  // findOne — not found
  // -------------------------------------------------------
  describe('findOne', () => {
    it('debe lanzar NotFoundException si el lead no existe', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------
  // createPublic — atribución automática por referralCode
  // -------------------------------------------------------
  describe('createPublic', () => {
    it('debe asignar partnerId si referralCode es de un partner APPROVED', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        status: 'APPROVED',
      });
      mockPrisma.lead.create.mockResolvedValue({ id: 'new-lead', status: LeadStatus.NEW });
      mockPrisma.attribution.create.mockResolvedValue({});
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const dto = {
        promotionId: 'promo-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+34 600000000',
        country: 'ES',
        referralCode: 'CARL9X2F',
      } as any;

      await service.createPublic(dto);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partnerId: 'partner-1',
            sourceType: LeadSourceType.PARTNER_REFERRAL,
          }),
        }),
      );
    });

    it('debe ignorar referralCode de partner PENDING', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({
        id: 'partner-2',
        status: 'PENDING',
      });
      mockPrisma.lead.create.mockResolvedValue({ id: 'new-lead', status: LeadStatus.NEW });
      mockPrisma.leadActivity.create.mockResolvedValue({});

      const dto = {
        promotionId: 'promo-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+34 600000000',
        country: 'ES',
        referralCode: 'PEND1234',
      } as any;

      await service.createPublic(dto);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partnerId: undefined,
            sourceType: LeadSourceType.LANDING_PUBLIC,
          }),
        }),
      );
    });
  });
});
