import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AttributionService {
  constructor(private prisma: PrismaService) {}

  async findByLead(leadId: string) {
    return this.prisma.attribution.findUnique({
      where: { leadId },
      include: {
        partner: {
          select: { id: true, name: true, company: true, referralCode: true },
        },
      },
    });
  }

  async findByPartner(partnerId: string) {
    return this.prisma.attribution.findMany({
      where: { partnerId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            score: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async override(leadId: string, newPartnerId: string, reason: string) {
    return this.prisma.attribution.update({
      where: { leadId },
      data: {
        partnerId: newPartnerId,
        attributionStatus: 'OVERRIDDEN',
      },
    });
  }
}
