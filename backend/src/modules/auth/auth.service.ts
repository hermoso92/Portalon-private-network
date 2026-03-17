import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 2FA check for SUPER_ADMIN
    if (user.totpEnabled && user.totpSecret) {
      if (!dto.totpCode) {
        return { requiresTwoFactor: true };
      }
      const isValid = authenticator.verify({ token: dto.totpCode, secret: user.totpSecret });
      if (!isValid) {
        throw new UnauthorizedException('Código 2FA incorrecto');
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Rotate token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.user.id, stored.user.email, stored.user.role);

    return {
      user: {
        id: stored.user.id,
        name: stored.user.name,
        email: stored.user.email,
        role: stored.user.role,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        createdAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  // -------------------------------------------------------
  // TOTP 2FA
  // -------------------------------------------------------

  async setup2fa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const secret = authenticator.generateSecret();
    const appName = this.configService.get<string>('APP_NAME', 'Portalon');
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    // Store secret but don't enable yet — requires verification first
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    });

    return { secret, otpauthUrl };
  }

  async enable2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new BadRequestException('Primero ejecuta el setup de 2FA');
    }
    if (user.totpEnabled) {
      throw new BadRequestException('2FA ya está activado');
    }

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!isValid) throw new BadRequestException('Código 2FA incorrecto');

    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    return { success: true, message: '2FA activado correctamente' };
  }

  async disable2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('2FA no está activado');
    }

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret });
    if (!isValid) throw new BadRequestException('Código 2FA incorrecto');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    });
    return { success: true, message: '2FA desactivado correctamente' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role, type: 'user' };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    // Clean old tokens for user
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
