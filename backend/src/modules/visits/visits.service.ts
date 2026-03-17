import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVisitDto, confirmedBy?: string) {
    return this.prisma.visit.create({
      data: {
        leadId: dto.leadId,
        unitId: dto.unitId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
        confirmedBy,
      },
      include: { lead: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findByLead(leadId: string) {
    return this.prisma.visit.findMany({
      where: { leadId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findUpcoming() {
    return this.prisma.visit.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        unit: { select: { id: true, unitCode: true, title: true } },
      },
    });
  }

  async update(id: string, dto: UpdateVisitDto, confirmedBy?: string) {
    await this.findOne(id);
    return this.prisma.visit.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status === 'CONFIRMED' && confirmedBy && { confirmedBy }),
      },
    });
  }

  async findOne(id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        unit: { select: { id: true, unitCode: true } },
      },
    });
    if (!visit) throw new NotFoundException('Visita no encontrada');
    return visit;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.visit.delete({ where: { id } });
    return { success: true };
  }
}
