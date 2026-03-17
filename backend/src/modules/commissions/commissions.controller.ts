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
import { UserRole, CommissionStatus } from '@prisma/client';
import { CommissionsService } from './commissions.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateCommissionStatusDto {
  @ApiPropertyOptional({ enum: CommissionStatus })
  @IsEnum(CommissionStatus)
  status: CommissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.PARTNER)
  @ApiOperation({ summary: 'Listar comisiones' })
  findAll(
    @Query('partnerId') partnerId?: string,
    @Query('promotionId') promotionId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commissionsService.findAll({ partnerId, promotionId, status, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.PARTNER)
  @ApiOperation({ summary: 'Detalle de comisión' })
  findOne(@Param('id') id: string) {
    return this.commissionsService.findOne(id);
  }

  @Post('rules')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear regla de comisión' })
  createRule(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionsService.createRule(dto);
  }

  @Get('rules/:promotionId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Reglas de comisión de una promoción' })
  findRules(@Param('promotionId') promotionId: string) {
    return this.commissionsService.findRulesByPromotion(promotionId);
  }

  @Post('recalculate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Recalcular comisión para un lead' })
  recalculate(@Body('leadId') leadId: string) {
    return this.commissionsService.recalculate(leadId);
  }

  @Post('recalculate-all')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Recalcular comisiones de TODOS los leads RESERVED/WON (batch)' })
  recalculateAll() {
    return this.commissionsService.recalculateAll();
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Actualizar estado de comisión (aprobar/pagar/cancelar)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCommissionStatusDto) {
    return this.commissionsService.updateStatus(id, dto.status, dto.notes);
  }
}
