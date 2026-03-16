import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PartnersService } from '../partners/partners.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly partnersService: PartnersService,
  ) {}

  @Get('admin')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Dashboard administrador' })
  adminDashboard(@Query('promotionId') promotionId?: string) {
    return this.dashboardService.getAdminDashboard(promotionId);
  }

  @Get('partner')
  @Roles(UserRole.PARTNER)
  @ApiOperation({ summary: 'Dashboard partner' })
  async partnerDashboard(@CurrentUser() user: any) {
    const partner = await this.partnersService.findByEmail(user.email);
    return this.dashboardService.getPartnerDashboard(partner.id);
  }
}
