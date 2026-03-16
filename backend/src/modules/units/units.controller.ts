import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, UnitStatus } from '@prisma/client';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('units')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Public()
  @Get('promotions/:promotionId/units/public')
  @ApiOperation({ summary: 'Unidades disponibles de una promoción (público)' })
  findPublic(@Param('promotionId') promotionId: string) {
    return this.unitsService.findByPromotion(promotionId, UnitStatus.AVAILABLE);
  }

  @Get('promotions/:promotionId/units')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @ApiOperation({ summary: 'Unidades de una promoción' })
  findByPromotion(
    @Param('promotionId') promotionId: string,
    @Query('status') status?: UnitStatus,
  ) {
    return this.unitsService.findByPromotion(promotionId, status);
  }

  @Post('units')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Crear unidad' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Patch('units/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Actualizar unidad' })
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }
}
