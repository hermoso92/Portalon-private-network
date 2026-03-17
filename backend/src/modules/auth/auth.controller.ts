import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TotpCodeDto } from './dto/totp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Iniciar sesión (incluye totpCode si 2FA activado)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  // -------------------------------------------------------
  // TOTP 2FA endpoints
  // -------------------------------------------------------

  @Post('2fa/setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar secreto TOTP (paso 1 de configuración 2FA)' })
  setup2fa(@CurrentUser('id') userId: string) {
    return this.authService.setup2fa(userId);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar 2FA verificando el código TOTP (paso 2)' })
  enable2fa(@CurrentUser('id') userId: string, @Body() dto: TotpCodeDto) {
    return this.authService.enable2fa(userId, dto.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar 2FA (requiere verificar código actual)' })
  disable2fa(@CurrentUser('id') userId: string, @Body() dto: TotpCodeDto) {
    return this.authService.disable2fa(userId, dto.code);
  }
}
