import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditLogEntry {
  actorUserId?: string;
  actorPartnerId?: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorPartnerId: entry.actorPartnerId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { id: true, name: true } },
        actorPartner: { select: { id: true, name: true } },
      },
    });
  }

  async findRecent(limit = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actorUser: { select: { id: true, name: true } },
        actorPartner: { select: { id: true, name: true } },
      },
    });
  }
}
