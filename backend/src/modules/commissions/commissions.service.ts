import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { CommissionTriggerType, CommissionStatus } from '@prisma/client';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // Rules
  // -------------------------------------------------------
  async createRule(dto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({ data: dto as any });
  }

  async findRulesByPromotion(promotionId: string) {
    return this.prisma.commissionRule.findMany({
      where: { promotionId, isActive: true },
      orderBy: { triggerType: 'asc' },
    });
  }

  // -------------------------------------------------------
  // Events
  // -------------------------------------------------------
  async processLeadEvent(leadId: string, status: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        unit: true,
        attribution: true,
      },
    });

    if (!lead) return;

    const partnerId = lead.partnerId || lead.attribution?.partnerId;
    if (!partnerId) return; // No attribution, no commission

    const triggerType = status === 'RESERVED'
      ? CommissionTriggerType.ON_RESERVATION
      : CommissionTriggerType.ON_SALE;

    // Find applicable rules before creating (no race condition here — read-only)
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        promotionId: lead.promotionId,
        triggerType,
        isActive: true,
      },
    });

    if (rules.length === 0) return;

    const rule = rules[0]; // Apply first matching rule
    const baseAmount = lead.unit?.price ? Number(lead.unit.price) : null;

    let commissionAmount: number;
    if (rule.calculationType === 'PERCENTAGE_OF_SALE' && baseAmount) {
      commissionAmount = (baseAmount * Number(rule.amount)) / 100;
    } else {
      commissionAmount = Number(rule.amount);
    }

    // Atomic upsert: create if not exists, no-op if already exists.
    // The @@unique([leadId, triggerType]) constraint guarantees exactly-once
    // execution even under concurrent requests (no race condition possible).
    const event = await this.prisma.commissionEvent.upsert({
      where: { leadId_triggerType: { leadId, triggerType } },
      update: {},
      create: {
        promotionId: lead.promotionId,
        leadId,
        partnerId,
        triggerType,
        baseAmount: baseAmount,
        commissionAmount,
        status: CommissionStatus.PENDING,
        notes: `Auto-generado por cambio de estado a ${status}`,
      },
    });

    return event;
  }

  async findAll(filter: {
    partnerId?: string;
    promotionId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const where: any = {};
    if (filter.partnerId) where.partnerId = filter.partnerId;
    if (filter.promotionId) where.promotionId = filter.promotionId;
    if (filter.status) where.status = filter.status;

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.commissionEvent.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, company: true } },
          promotion: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commissionEvent.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const event = await this.prisma.commissionEvent.findUnique({
      where: { id },
      include: {
        partner: true,
        promotion: true,
        lead: true,
      },
    });
    if (!event) throw new NotFoundException('Evento de comisión no encontrado');
    return event;
  }

  async updateStatus(id: string, status: CommissionStatus, notes?: string) {
    await this.findOne(id);

    return this.prisma.commissionEvent.update({
      where: { id },
      data: { status, ...(notes && { notes }) },
    });
  }

  async recalculate(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    if (lead.status === 'RESERVED') {
      return this.processLeadEvent(leadId, 'RESERVED');
    } else if (lead.status === 'WON') {
      return this.processLeadEvent(leadId, 'WON');
    }

    return { message: 'Lead sin estado que active comisión' };
  }

  async recalculateAll() {
    const leads = await this.prisma.lead.findMany({
      where: { status: { in: ['RESERVED', 'WON'] }, partnerId: { not: null } },
      select: { id: true, status: true },
    });

    let processed = 0;
    let errors = 0;
    for (const lead of leads) {
      try {
        await this.processLeadEvent(lead.id, lead.status);
        processed++;
      } catch (err) {
        errors++;
        this.logger.error(`recalculateAll failed for lead ${lead.id}: ${err?.message ?? err}`);
      }
    }

    this.logger.log(`recalculateAll complete — total: ${leads.length}, processed: ${processed}, errors: ${errors}`);
    return { total: leads.length, processed, errors };
  }

  async getPartnerSummary(partnerId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.commissionEvent.aggregate({
        where: { partnerId },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      this.prisma.commissionEvent.groupBy({
        by: ['status'],
        where: { partnerId },
        _sum: { commissionAmount: true },
        _count: true,
      }),
    ]);

    return {
      totalAmount: total._sum.commissionAmount || 0,
      totalEvents: total._count,
      byStatus,
    };
  }
}
