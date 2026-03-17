import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeadPublicDto } from './dto/create-lead-public.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStatusDto } from './dto/change-status.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { LeadSourceType, LeadActivityType, LeadStatus, UnitStatus, AssetStatus } from '@prisma/client';

/**
 * Valid pipeline transitions. Terminal states (WON, LOST) cannot be re-opened.
 * RESERVED can only come from VISITED or QUALIFIED (sales-qualified).
 * WON requires prior RESERVED state.
 */
const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.QUALIFIED, LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.QUALIFIED]: [LeadStatus.CONTACTED, LeadStatus.VISIT_SCHEDULED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.VISIT_SCHEDULED, LeadStatus.LOST],
  [LeadStatus.VISIT_SCHEDULED]: [LeadStatus.VISITED, LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.VISITED]: [LeadStatus.RESERVED, LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.RESERVED]: [LeadStatus.WON, LeadStatus.VISITED, LeadStatus.LOST],
  [LeadStatus.WON]: [], // terminal
  [LeadStatus.LOST]: [LeadStatus.NEW], // allow reactivation from LOST only back to NEW
};

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async createPublic(dto: CreateLeadPublicDto) {
    // Resolve partner from referralCode
    let partnerId: string | undefined;
    if (dto.referralCode) {
      const partner = await this.prisma.partner.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (partner && partner.status === 'APPROVED') {
        partnerId = partner.id;
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        promotionId: dto.promotionId,
        unitId: dto.unitId,
        partnerId,
        sourceType: partnerId ? LeadSourceType.PARTNER_REFERRAL : LeadSourceType.LANDING_PUBLIC,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        language: dto.language,
        budgetRange: dto.budgetRange,
        buyerType: dto.buyerType,
        interestLevel: dto.interestLevel,
        notes: dto.notes,
        attributionData: {
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          clickId: dto.clickId,
          referralCode: dto.referralCode,
        },
      },
    });

    // Create attribution if partner found
    if (partnerId) {
      await this.prisma.attribution.create({
        data: {
          leadId: lead.id,
          partnerId,
          sourceChannel: 'referral_link',
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          clickId: dto.clickId,
        },
      });
    }

    // Register activity
    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: LeadActivityType.STATUS_CHANGE,
        payload: { status: LeadStatus.NEW, source: 'public_form' },
      },
    });

    return lead;
  }

  async createByPartner(dto: CreateLeadDto, partnerId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        ...dto,
        partnerId,
        sourceType: LeadSourceType.PARTNER_MANUAL,
      } as any,
    });

    await this.prisma.attribution.create({
      data: {
        leadId: lead.id,
        partnerId,
        sourceChannel: 'partner_manual',
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: LeadActivityType.STATUS_CHANGE,
        payload: { status: LeadStatus.NEW, source: 'partner_manual', partnerId },
      },
    });

    return lead;
  }

  async createByAgent(dto: CreateLeadDto, userId: string) {
    const lead = await this.prisma.lead.create({
      data: {
        ...dto,
        sourceType: LeadSourceType.DIRECT,
        assignedToUserId: dto.assignedToUserId || userId,
      } as any,
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId,
        activityType: LeadActivityType.STATUS_CHANGE,
        payload: { status: LeadStatus.NEW, source: 'agent_manual' },
      },
    });

    return lead;
  }

  async findAll(filter: FilterLeadsDto, userRole: string, userId?: string, partnerId?: string) {
    const where: any = {};

    if (filter.promotionId) where.promotionId = filter.promotionId;
    if (filter.status) where.status = filter.status;
    if (filter.sourceType) where.sourceType = filter.sourceType;
    if (filter.buyerType) where.buyerType = filter.buyerType;
    if (filter.country) where.country = filter.country;

    if (filter.scoreMin !== undefined || filter.scoreMax !== undefined) {
      where.score = {};
      if (filter.scoreMin !== undefined) where.score.gte = filter.scoreMin;
      if (filter.scoreMax !== undefined) where.score.lte = filter.scoreMax;
    }

    // Partner only sees their own leads
    if (userRole === 'PARTNER' && partnerId) {
      where.partnerId = partnerId;
    } else if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    if (filter.assignedToUserId) where.assignedToUserId = filter.assignedToUserId;

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, company: true, referralCode: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          promotion: { select: { id: true, name: true, slug: true } },
          unit: { select: { id: true, unitCode: true, title: true } },
          attribution: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, name: true, company: true, referralCode: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        promotion: { select: { id: true, name: true, slug: true, currency: true } },
        unit: true,
        attribution: { include: { partner: { select: { id: true, name: true } } } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        commissionEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead no encontrado');
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, userId: string) {
    const lead = await this.findOne(id);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: dto as any,
    });

    if (dto.notes) {
      await this.prisma.leadActivity.create({
        data: {
          leadId: id,
          userId,
          activityType: LeadActivityType.NOTE_ADDED,
          payload: { note: dto.notes },
        },
      });
    }

    return updated;
  }

  async changeStatus(id: string, dto: ChangeLeadStatusDto, userId: string) {
    const lead = await this.findOne(id);

    const currentStatus = lead.status as LeadStatus;
    const targetStatus = dto.status as LeadStatus;

    // Validate transition is allowed
    const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowedNext.includes(targetStatus)) {
      throw new BadRequestException(
        `Transición de estado no permitida: ${currentStatus} → ${targetStatus}. ` +
        `Transiciones válidas desde ${currentStatus}: [${allowedNext.join(', ') || 'ninguna'}]`,
      );
    }

    // Unit inventory: validate availability before reservation
    if (targetStatus === LeadStatus.RESERVED && lead.unitId && lead.unit) {
      if (lead.unit.status !== UnitStatus.AVAILABLE) {
        throw new BadRequestException(
          `La unidad ${lead.unit.unitCode} no está disponible (estado actual: ${lead.unit.status}). ` +
          `Verifica que no haya otra reserva activa para esta unidad.`,
        );
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: dto.status },
    });

    // Sync unit inventory status to match lead pipeline state
    if (lead.unitId) {
      if (targetStatus === LeadStatus.RESERVED) {
        await this.prisma.unit.update({
          where: { id: lead.unitId },
          data: { status: UnitStatus.RESERVED, assetStatus: AssetStatus.RESERVED },
        });
      } else if (targetStatus === LeadStatus.WON) {
        await this.prisma.unit.update({
          where: { id: lead.unitId },
          data: { status: UnitStatus.SOLD, assetStatus: AssetStatus.OFF_MARKET },
        });
      } else if (
        currentStatus === LeadStatus.RESERVED &&
        (targetStatus === LeadStatus.VISITED || targetStatus === LeadStatus.LOST)
      ) {
        // Lead leaving reservation — release the unit back to available
        await this.prisma.unit.update({
          where: { id: lead.unitId },
          data: { status: UnitStatus.AVAILABLE, assetStatus: AssetStatus.AVAILABLE },
        });
      }
    }

    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        userId,
        activityType: LeadActivityType.STATUS_CHANGE,
        payload: {
          previousStatus: lead.status,
          newStatus: dto.status,
          note: dto.note,
        },
      },
    });

    return updated;
  }

  async addActivity(leadId: string, type: LeadActivityType, payload: any, userId?: string) {
    await this.findOne(leadId);

    return this.prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        activityType: type,
        payload,
      },
    });
  }

  async updateAiScore(id: string, score: number, summary: string, riskFlags: any) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        score,
        aiSummary: summary,
        aiRiskFlags: riskFlags,
      },
    });
  }
}
