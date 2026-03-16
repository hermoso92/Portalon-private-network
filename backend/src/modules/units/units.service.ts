import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitStatus } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUnitDto) {
    const exists = await this.prisma.unit.findUnique({
      where: {
        promotionId_unitCode: {
          promotionId: dto.promotionId,
          unitCode: dto.unitCode,
        },
      },
    });

    if (exists) throw new ConflictException('El código de unidad ya existe en esta promoción');

    const unit = await this.prisma.unit.create({ data: dto as any });

    // Update promotion unit counts
    await this.syncPromotionUnitCounts(dto.promotionId);

    return unit;
  }

  async findByPromotion(promotionId: string, status?: UnitStatus) {
    return this.prisma.unit.findMany({
      where: {
        promotionId,
        ...(status && { status }),
      },
      orderBy: [{ featured: 'desc' }, { unitCode: 'asc' }],
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto) {
    const unit = await this.findOne(id);

    if (dto.unitCode) {
      const conflict = await this.prisma.unit.findFirst({
        where: {
          promotionId: unit.promotionId,
          unitCode: dto.unitCode,
          NOT: { id },
        },
      });
      if (conflict) throw new ConflictException('El código de unidad ya existe');
    }

    const updated = await this.prisma.unit.update({
      where: { id },
      data: dto as any,
    });

    await this.syncPromotionUnitCounts(unit.promotionId);

    return updated;
  }

  private async syncPromotionUnitCounts(promotionId: string) {
    const [totalUnits, available] = await Promise.all([
      this.prisma.unit.count({ where: { promotionId } }),
      this.prisma.unit.count({
        where: { promotionId, status: UnitStatus.AVAILABLE },
      }),
    ]);

    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { totalUnits, unitsAvailable: available },
    });
  }
}
