import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Programar una visita para un lead' })
  create(@Body() dto: CreateVisitDto, @CurrentUser('id') userId: string) {
    return this.visitsService.create(dto, userId);
  }

  @Get('upcoming')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Visitas próximas (pendientes/confirmadas)' })
  findUpcoming() {
    return this.visitsService.findUpcoming();
  }

  @Get('lead/:leadId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @ApiOperation({ summary: 'Visitas de un lead' })
  findByLead(@Param('leadId') leadId: string) {
    return this.visitsService.findByLead(leadId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Detalle de visita' })
  findOne(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Actualizar visita (confirmar/cancelar/completar)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVisitDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.visitsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar visita' })
  remove(@Param('id') id: string) {
    return this.visitsService.remove(id);
  }
}
