import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'user' | 'partner';
}

/**
 * Unified JWT strategy that handles both user tokens (type: 'user')
 * and partner tokens (type: 'partner').
 *
 * User tokens: issued by /auth/login, sub = User.id
 * Partner tokens: issued by /partners/login, sub = Partner.id
 *
 * The resolved principal is attached to request.user and has the shape:
 *   { id, email, role, name, isActive?, status? }
 *
 * Role for partners is always 'PARTNER' (string matching UserRole.PARTNER enum value).
 * The RolesGuard compares user.role === role string, so this works transparently.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me-in-production'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'partner') {
      const partner = await this.prisma.partner.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          referralCode: true,
        },
      });

      if (!partner || partner.status !== 'APPROVED') {
        throw new UnauthorizedException('Token inválido o partner inactivo');
      }

      // Return a principal that looks like a User principal to guards/decorators
      return {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        role: 'PARTNER',
        isActive: true,
      };
    }

    // Default: type === 'user'
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }

    return user;
  }
}
