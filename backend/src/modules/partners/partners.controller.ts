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
import { PartnersService } from './partners.service';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { UpdatePartnerDto, UpdatePartnerStatusDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from '../auth/dto/login.dto';

@ApiTags('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de nuevo partner (pendiente de aprobación)' })
  register(@Body() dto: RegisterPartnerDto) {
    return this.partnersService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de partner' })
  login(@Body() dto: LoginDto) {
    return this.partnersService.login(dto.email, dto.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @Roles(UserRole.PARTNER)
  @ApiOperation({ summary: 'Mi perfil de partner' })
  async me(@CurrentUser() user: any) {
    return this.partnersService.findByEmail(user.email);
  }

  @Get('me/stats')
  @ApiBearerAuth()
  @Roles(UserRole.PARTNER)
  @ApiOperation({ summary: 'Mis estadísticas como partner' })
  async myStats(@CurrentUser() user: any) {
    const partner = await this.partnersService.findByEmail(user.email);
    return this.partnersService.getMyStats(partner.id);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Listar partners' })
  findAll(@Query('status') status?: string) {
    return this.partnersService.findAll({ status });
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Detalle de partner' })
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Aprobar/rechazar/suspender partner' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePartnerStatusDto) {
    return this.partnersService.updateStatus(id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Actualizar datos de partner' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }
}
