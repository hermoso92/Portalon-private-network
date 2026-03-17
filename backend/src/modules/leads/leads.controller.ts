import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { AiService } from '../ai/ai.service';
import { CommissionsService } from '../commissions/commissions.service';
import { PartnersService } from '../partners/partners.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadPublicDto } from './dto/create-lead-public.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStatusDto } from './dto/change-status.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly aiService: AiService,
    private readonly commissionsService: CommissionsService,
    private readonly partnersService: PartnersService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Public()
  @Post('public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar lead desde formulario público' })
  async createPublic(@Body() dto: CreateLeadPublicDto) {
    const lead = await this.leadsService.createPublic(dto);
    this.triggerAiScore(lead.id, lead).catch(() => {});
    return lead;
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar lead (partner o agente)' })
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: any,
  ) {
    let lead: any;

    if (user.role === UserRole.PARTNER) {
      const partner = await this.partnersService.findByEmail(user.email);
      lead = await this.leadsService.createByPartner(dto, partner.id);
    } else {
      lead = await this.leadsService.createByAgent(dto, user.id);
    }

    this.triggerAiScore(lead.id, lead).catch(() => {});
    this.auditService.log({
      actorUserId: user.role !== 'PARTNER' ? user.id : undefined,
      actorPartnerId: user.role === 'PARTNER' ? user.id : undefined,
      entityType: 'Lead',
      entityId: lead.id,
      action: 'create',
      newValue: { status: lead.status, source: lead.sourceType },
    }).catch(() => {});
    return lead;
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @ApiOperation({ summary: 'Listar leads con filtros' })
  async findAll(@Query() filter: FilterLeadsDto, @CurrentUser() user: any) {
    let partnerId: string | undefined;
    if (user.role === UserRole.PARTNER) {
      const partner = await this.partnersService.findByEmail(user.email);
      partnerId = partner?.id;
    }
    return this.leadsService.findAll(filter, user.role, user.id, partnerId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT, UserRole.PARTNER)
  @ApiOperation({ summary: 'Detalle de lead con timeline' })
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Actualizar lead' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.leadsService.update(id, dto, userId);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Cambiar estado del lead (mueve el pipeline)' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeLeadStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    // changeStatus internally calls findOne — no need for a separate pre-fetch
    const lead = await this.leadsService.changeStatus(id, dto, userId);
    const previousStatus = (lead as any).__previousStatus ?? dto.status;

    // Fire-and-forget: commission processing + partner email
    if (dto.status === 'RESERVED' || dto.status === 'WON') {
      this.commissionsService.processLeadEvent(id, dto.status).then(async (event) => {
        if (lead.partner?.email) {
          const leadName = `${lead.firstName} ${lead.lastName ?? ''}`.trim();
          await this.notificationsService.notifyCommissionCreated({
            partnerEmail: lead.partner.email,
            partnerName: lead.partner.name,
            leadName,
            triggerType: dto.status === 'RESERVED' ? 'ON_RESERVATION' : 'ON_SALE',
            amount: event ? Number(event.commissionAmount) : 0,
          });
        }
      }).catch(() => {});
    }

    // Notify partner of status change
    if (lead.partner?.email) {
      const leadName = `${lead.firstName} ${lead.lastName ?? ''}`.trim();
      this.notificationsService.notifyLeadStatusChange({
        partnerEmail: lead.partner.email,
        partnerName: lead.partner.name,
        leadName,
        oldStatus: previousStatus,
        newStatus: dto.status,
        leadId: id,
      }).catch(() => {});
    }

    // Audit log — oldStatus is read from the activity log created inside changeStatus
    this.auditService.log({
      actorUserId: userId,
      entityType: 'Lead',
      entityId: id,
      action: 'status_change',
      newValue: { status: dto.status, note: dto.note },
    }).catch(() => {});

    return lead;
  }

  @Post(':id/score')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Re-puntuar lead con IA' })
  async scoreWithAi(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id);
    return this.triggerAiScore(id, lead);
  }

  private async triggerAiScore(leadId: string, leadData: any) {
    try {
      const [classification, summary, riskFlags] = await Promise.all([
        this.aiService.classifyLead(leadData),
        this.aiService.summarizeLead(leadData),
        this.aiService.detectRiskFlags(leadData),
      ]);

      return this.leadsService.updateAiScore(
        leadId,
        classification.score,
        summary.summary,
        riskFlags.flags,
      );
    } catch (err) {
      console.error(`AI scoring failed for lead ${leadId}:`, err.message);
    }
  }
}
