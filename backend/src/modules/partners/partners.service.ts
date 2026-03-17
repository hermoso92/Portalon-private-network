import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterPartnerDto } from './dto/register-partner.dto';
import { UpdatePartnerDto, UpdatePartnerStatusDto } from './dto/update-partner.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

function generateReferralCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4)
    .padEnd(4, 'X');
  const rand = Math.random().toString(36).toUpperCase().substring(2, 6);
  return `${base}${rand}`;
}

const PARTNER_SELECT = {
  id: true,
  name: true,
  company: true,
  email: true,
  phone: true,
  roleType: true,
  status: true,
  referralCode: true,
  notes: true,
  bankName: true,
  bankAccountMasked: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterPartnerDto) {
    const exists = await this.prisma.partner.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (exists) throw new ConflictException('Email ya registrado');

    // Generate unique referral code
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode(dto.name);
      const codeExists = await this.prisma.partner.findUnique({ where: { referralCode } });
      if (!codeExists) break;
      attempts++;
    } while (attempts < 10);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const partner = await this.prisma.partner.create({
      data: {
        name: dto.name,
        company: dto.company,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        roleType: dto.roleType,
        notes: dto.notes,
        passwordHash,
        referralCode,
        status: 'PENDING',
      },
      select: PARTNER_SELECT,
    });

    return partner;
  }

  async login(email: string, password: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!partner || !partner.passwordHash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (partner.status !== 'APPROVED') {
      throw new UnauthorizedException('Tu cuenta no ha sido aprobada aún');
    }

    const valid = await bcrypt.compare(password, partner.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    const tokens = await this.generatePartnerTokens(partner.id, partner.email);

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        company: partner.company,
        referralCode: partner.referralCode,
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

    const stored = await this.prisma.partnerRefreshToken.findUnique({
      where: { token: refreshToken },
      include: { partner: true },
    });

    if (!stored || stored.expiresAt < new Date() || stored.partner.status !== 'APPROVED') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Rotate token
    await this.prisma.partnerRefreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generatePartnerTokens(stored.partner.id, stored.partner.email);

    return {
      partner: {
        id: stored.partner.id,
        name: stored.partner.name,
        email: stored.partner.email,
        company: stored.partner.company,
        referralCode: stored.partner.referralCode,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.partnerRefreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { success: true };
  }

  private async generatePartnerTokens(partnerId: string, email: string) {
    const payload = { sub: partnerId, email, role: 'PARTNER', type: 'partner' };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.partnerRefreshToken.create({
      data: { partnerId, token: refreshTokenValue, expiresAt },
    });

    // Clean expired tokens for this partner
    await this.prisma.partnerRefreshToken.deleteMany({
      where: { partnerId, expiresAt: { lt: new Date() } },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  async findAll(filter: { status?: string } = {}) {
    return this.prisma.partner.findMany({
      where: {
        ...(filter.status && { status: filter.status as any }),
      },
      select: {
        ...PARTNER_SELECT,
        _count: {
          select: { leads: true, commissionEvents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: {
        ...PARTNER_SELECT,
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            score: true,
            createdAt: true,
          },
        },
        commissionEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!partner) throw new NotFoundException('Partner no encontrado');
    return partner;
  }

  async findByEmail(email: string) {
    return this.prisma.partner.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: PARTNER_SELECT,
    });
  }

  async updateStatus(id: string, dto: UpdatePartnerStatusDto) {
    await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.notes && { notes: dto.notes }),
      },
      select: PARTNER_SELECT,
    });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id);

    return this.prisma.partner.update({
      where: { id },
      data: dto as any,
      select: PARTNER_SELECT,
    });
  }

  async getMyStats(partnerId: string) {
    const [leads, commissions] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { partnerId },
        _count: true,
      }),
      this.prisma.commissionEvent.aggregate({
        where: { partnerId },
        _sum: { commissionAmount: true },
        _count: true,
      }),
    ]);

    const pendingCommissions = await this.prisma.commissionEvent.aggregate({
      where: { partnerId, status: 'PENDING' },
      _sum: { commissionAmount: true },
    });

    return {
      leads,
      totalCommissions: commissions._sum.commissionAmount || 0,
      totalCommissionEvents: commissions._count,
      pendingCommissions: pendingCommissions._sum.commissionAmount || 0,
    };
  }
}
