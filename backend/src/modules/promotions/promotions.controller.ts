import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Obtener promoción pública por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.promotionsService.findBySlug(slug);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @ApiOperation({ summary: 'Listar promociones' })
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Detalle de promoción' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Get(':id/assets')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.PARTNER)
  @ApiOperation({ summary: 'Assets de una promoción' })
  getAssets(@Param('id') id: string) {
    return this.promotionsService.getAssets(id);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Estadísticas de una promoción' })
  stats(@Param('id') id: string) {
    return this.promotionsService.getStats(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crear promoción' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Actualizar promoción' })
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }
}
