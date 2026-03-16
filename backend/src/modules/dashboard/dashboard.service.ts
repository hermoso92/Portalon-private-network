import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard(promotionId?: string) {
    const whereLeads: any = {};
    const whereUnits: any = {};
    if (promotionId) {
      whereLeads.promotionId = promotionId;
      whereUnits.promotionId = promotionId;
    }

    const [
      totalLeads,
      leadsByStatus,
      leadsByPartner,
      avgScore,
      unitsByStatus,
      commissionStats,
      topPartners,
      recentLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where: whereLeads }),

      this.prisma.lead.groupBy({
        by: ['status'],
        where: whereLeads,
        _count: true,
      }),

      this.prisma.lead.groupBy({
        by: ['partnerId'],
        where: { ...whereLeads, partnerId: { not: null } },
        _count: true,
        orderBy: { _count: { partnerId: 'desc' } },
        take: 10,
      }),

      this.prisma.lead.aggregate({
        where: { ...whereLeads, score: { not: null } },
        _avg: { score: true },
      }),

      this.prisma.unit.groupBy({
        by: ['status'],
        where: whereUnits,
        _count: true,
      }),

      this.prisma.commissionEvent.aggregate({
        where: promotionId ? { promotionId } : {},
        _sum: { commissionAmount: true },
        _count: true,
      }),

      this.prisma.partner.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          name: true,
          company: true,
          _count: { select: { leads: true, commissionEvents: true } },
        },
        orderBy: { leads: { _count: 'desc' } },
        take: 5,
      }),

      this.prisma.lead.findMany({
        where: whereLeads,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          score: true,
          sourceType: true,
          createdAt: true,
          partner: { select: { id: true, name: true } },
          promotion: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Derive specific metrics from leadsByStatus
    const statusMap = Object.fromEntries(leadsByStatus.map((s) => [s.status, s._count]));

    return {
      overview: {
        totalLeads,
        avgScore: Math.round(avgScore._avg.score || 0),
        visits: statusMap['VISITED'] || 0,
        reservations: statusMap['RESERVED'] || 0,
        sales: statusMap['WON'] || 0,
        pendingCommissions: commissionStats._sum.commissionAmount || 0,
        commissionEvents: commissionStats._count,
      },
      leadsByStatus,
      unitsByStatus,
      topPartners,
      recentLeads,
      leadsByPartner: leadsByPartner.slice(0, 10),
    };
  }

  async getPartnerDashboard(partnerId: string) {
    const [
      leadsByStatus,
      commissions,
      pendingCommissions,
      recentLeads,
      promotions,
    ] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { partnerId },
        _count: true,
      }),

      this.prisma.commissionEvent.aggregate({
        where: { partnerId },
        _sum: { commissionAmount: true },
        _count: true,
      }),

      this.prisma.commissionEvent.aggregate({
        where: { partnerId, status: 'PENDING' },
        _sum: { commissionAmount: true },
      }),

      this.prisma.lead.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          score: true,
          createdAt: true,
          promotion: { select: { id: true, name: true } },
        },
      }),

      this.prisma.promotion.findMany({
        where: { publicStatus: 'PUBLISHED' },
        select: {
          id: true,
          name: true,
          slug: true,
          heroImageUrl: true,
          priceMin: true,
          priceMax: true,
          unitsAvailable: true,
        },
      }),
    ]);

    const statusMap = Object.fromEntries(leadsByStatus.map((s) => [s.status, s._count]));

    return {
      overview: {
        totalLeads: leadsByStatus.reduce((acc, s) => acc + s._count, 0),
        activeLeads:
          (statusMap['NEW'] || 0) +
          (statusMap['QUALIFIED'] || 0) +
          (statusMap['CONTACTED'] || 0) +
          (statusMap['VISIT_SCHEDULED'] || 0),
        visits: statusMap['VISITED'] || 0,
        reservations: statusMap['RESERVED'] || 0,
        sales: statusMap['WON'] || 0,
        totalCommissions: commissions._sum.commissionAmount || 0,
        pendingCommissions: pendingCommissions._sum.commissionAmount || 0,
      },
      leadsByStatus,
      recentLeads,
      promotions,
    };
  }
}
