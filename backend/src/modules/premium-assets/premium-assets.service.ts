import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssetStatus, LeadSourceType } from '@prisma/client';
import { CatalogFilterDto } from './dto/catalog-filter.dto';
import { SetUnitOperationDto } from './dto/set-unit-operation.dto';
import { SubmitInquiryDto } from './dto/submit-inquiry.dto';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { AssignOperatorDto } from './dto/assign-operator.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreatePricingProfileDto } from './dto/create-pricing-profile.dto';
import { UpdatePricingProfileDto } from './dto/update-pricing-profile.dto';

@Injectable()
export class PremiumAssetsService {
  constructor(private prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // PUBLIC CATALOG
  // -----------------------------------------------------------------------

  async getCatalog(filter: CatalogFilterDto) {
    const { operationMode, assetStatus, promotionId, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    // Public catalog excludes OFF_MARKET by default unless explicitly requested
    const resolvedAssetStatus = assetStatus ?? { not: AssetStatus.OFF_MARKET };

    const where = {
      ...(operationMode && { operationMode }),
      assetStatus: resolvedAssetStatus,
      ...(promotionId && { promotionId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        include: {
          promotion: {
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              country: true,
              heroImageUrl: true,
            },
          },
          pricingProfiles: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCatalogItem(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        promotion: {
          select: {
            id: true,
            slug: true,
            name: true,
            headline: true,
            shortDescription: true,
            location: true,
            city: true,
            country: true,
            heroImageUrl: true,
            brochureUrl: true,
            assets: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        pricingProfiles: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        availabilityBlocks: {
          where: {
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Asset not found');
    }

    return unit;
  }

  // -----------------------------------------------------------------------
  // ADMIN: UNIT SUMMARY (owner + active operator + pricing + upcoming blocks)
  // -----------------------------------------------------------------------

  async getUnitSummary(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        promotion: {
          select: { id: true, slug: true, name: true, city: true, country: true },
        },
        owner: true,
        operatorAssignments: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        pricingProfiles: {
          orderBy: [{ isActive: 'desc' }, { operationMode: 'asc' }],
        },
        availabilityBlocks: {
          where: { endDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  // -----------------------------------------------------------------------
  // PUBLIC INQUIRY (maps to Lead creation)
  // -----------------------------------------------------------------------

  async submitInquiry(dto: SubmitInquiryDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
      select: { id: true, promotionId: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    let partnerId: string | undefined;
    if (dto.referralCode) {
      const partner = await this.prisma.partner.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (partner && partner.status === 'APPROVED') {
        partnerId = partner.id;
      }
    }

    const inquiryNote = `[Inquiry: ${dto.inquiryType}]${dto.message ? ` ${dto.message}` : ''}`;

    const lead = await this.prisma.lead.create({
      data: {
        promotionId: unit.promotionId,
        unitId: unit.id,
        partnerId,
        sourceType: partnerId
          ? LeadSourceType.PARTNER_REFERRAL
          : LeadSourceType.LANDING_PUBLIC,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        country: dto.country,
        notes: inquiryNote,
        attributionData: {
          inquiryType: dto.inquiryType,
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          referralCode: dto.referralCode,
        },
      },
    });

    if (partnerId) {
      await this.prisma.attribution.create({
        data: {
          leadId: lead.id,
          partnerId,
          sourceChannel: 'landing_inquiry',
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
        },
      });
    }

    return { id: lead.id, message: 'Inquiry received' };
  }

  // -----------------------------------------------------------------------
  // ADMIN: UNIT OPERATION MODE + ASSET STATUS
  // -----------------------------------------------------------------------

  async setUnitOperation(unitId: string, dto: SetUnitOperationDto): Promise<void> {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    if (dto.operationMode === undefined && dto.assetStatus === undefined) {
      throw new BadRequestException('At least one of operationMode or assetStatus must be provided');
    }

    await this.prisma.unit.update({
      where: { id: unitId },
      data: {
        ...(dto.operationMode !== undefined && { operationMode: dto.operationMode }),
        ...(dto.assetStatus !== undefined && { assetStatus: dto.assetStatus }),
      },
    });
  }

  // -----------------------------------------------------------------------
  // ADMIN: OWNERS
  // -----------------------------------------------------------------------

  async createOwner(dto: CreateOwnerDto) {
    return this.prisma.owner.create({ data: dto });
  }

  async listOwners() {
    return this.prisma.owner.findMany({
      include: {
        units: {
          select: { id: true, unitCode: true, title: true, operationMode: true, assetStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOwner(id: string, dto: UpdateOwnerDto) {
    const owner = await this.prisma.owner.findUnique({ where: { id } });
    if (!owner) throw new NotFoundException('Owner not found');

    return this.prisma.owner.update({ where: { id }, data: dto });
  }

  // -----------------------------------------------------------------------
  // ADMIN: OPERATOR ASSIGNMENTS
  // -----------------------------------------------------------------------

  async getUnitOperators(unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    return this.prisma.operatorAssignment.findMany({
      where: { unitId },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
  }

  async assignOperator(unitId: string, dto: AssignOperatorDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    if (dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('endDate must be after startDate');
      }
    }

    return this.prisma.operatorAssignment.create({
      data: {
        unitId,
        operatorName: dto.operatorName,
        operatorEmail: dto.operatorEmail,
        operatorPhone: dto.operatorPhone,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        commissionRate: dto.commissionRate,
        notes: dto.notes,
      },
    });
  }

  // -----------------------------------------------------------------------
  // ADMIN: AVAILABILITY BLOCKS
  // -----------------------------------------------------------------------

  async getAvailabilityBlocks(unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    return this.prisma.availabilityBlock.findMany({
      where: { unitId },
      orderBy: { startDate: 'asc' },
    });
  }

  async createAvailabilityBlock(unitId: string, dto: CreateAvailabilityBlockDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.availabilityBlock.create({
      data: {
        unitId,
        startDate: start,
        endDate: end,
        reason: dto.reason,
        notes: dto.notes,
      },
    });
  }

  async deleteAvailabilityBlock(id: string): Promise<void> {
    const block = await this.prisma.availabilityBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Availability block not found');

    await this.prisma.availabilityBlock.delete({ where: { id } });
  }

  // -----------------------------------------------------------------------
  // ADMIN: PRICING PROFILES
  // -----------------------------------------------------------------------

  async getPricingProfiles(unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    return this.prisma.pricingProfile.findMany({
      where: { unitId },
      orderBy: [{ isActive: 'desc' }, { operationMode: 'asc' }],
    });
  }

  async createPricingProfile(unitId: string, dto: CreatePricingProfileDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    return this.prisma.pricingProfile.create({
      data: {
        unitId,
        operationMode: dto.operationMode,
        basePrice: dto.basePrice,
        currency: dto.currency ?? 'EUR',
        priceUnit: dto.priceUnit,
        minStay: dto.minStay,
        maxStay: dto.maxStay,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePricingProfile(id: string, dto: UpdatePricingProfileDto) {
    const profile = await this.prisma.pricingProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Pricing profile not found');

    return this.prisma.pricingProfile.update({
      where: { id },
      data: {
        ...(dto.operationMode !== undefined && { operationMode: dto.operationMode }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.priceUnit !== undefined && { priceUnit: dto.priceUnit }),
        ...(dto.minStay !== undefined && { minStay: dto.minStay }),
        ...(dto.maxStay !== undefined && { maxStay: dto.maxStay }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
