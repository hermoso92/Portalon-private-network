import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePromotionDto) {
    const exists = await this.prisma.promotion.findUnique({
      where: { slug: dto.slug },
    });
    if (exists) throw new ConflictException('El slug ya existe');

    return this.prisma.promotion.create({ data: dto as any });
  }

  async findAll() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { units: true, leads: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { unitCode: 'asc' },
        },
        assets: {
          orderBy: { sortOrder: 'asc' },
        },
        commissionRules: {
          where: { isActive: true },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    return promotion;
  }

  async findBySlug(slug: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { slug },
      include: {
        units: {
          where: { status: 'AVAILABLE' },
          orderBy: { sortOrder: 'asc' },
        },
        assets: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);

    if (dto.slug) {
      const exists = await this.prisma.promotion.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (exists) throw new ConflictException('El slug ya existe');
    }

    return this.prisma.promotion.update({
      where: { id },
      data: dto as any,
    });
  }

  async getAssets(promotionId: string) {
    return this.prisma.promotionAsset.findMany({
      where: { promotionId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getStats(id: string) {
    const [promotion, unitStats, leadStats] = await Promise.all([
      this.findOne(id),
      this.prisma.unit.groupBy({
        by: ['status'],
        where: { promotionId: id },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { promotionId: id },
        _count: true,
      }),
    ]);

    return { promotion, unitStats, leadStats };
  }
}
