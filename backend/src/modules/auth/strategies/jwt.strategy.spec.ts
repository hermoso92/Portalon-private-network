import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  partner: {
    findUnique: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret-min-32-chars-xxxxxxxx'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(
      mockConfigService as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );
    jest.clearAllMocks();
  });

  // -------------------------------------------------------
  // User tokens (type: 'user')
  // -------------------------------------------------------
  describe('validate — type: user', () => {
    it('debe retornar el usuario si existe y está activo', async () => {
      const user = { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'SUPER_ADMIN', isActive: true };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN',
        type: 'user',
      });

      expect(result).toEqual(user);
      expect(mockPrisma.partner.findUnique).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'user-1', email: 'x@x.com', role: 'SUPER_ADMIN', type: 'user' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si usuario está inactivo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });

      await expect(
        strategy.validate({ sub: 'user-1', email: 'x@x.com', role: 'SUPER_ADMIN', type: 'user' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------
  // Partner tokens (type: 'partner')
  // -------------------------------------------------------
  describe('validate — type: partner', () => {
    it('debe retornar el principal partner si existe y está APPROVED', async () => {
      const partner = { id: 'p-1', name: 'Carlos', email: 'carlos@demo.com', status: 'APPROVED', referralCode: 'CARL9X2F' };
      mockPrisma.partner.findUnique.mockResolvedValue(partner);

      const result = await strategy.validate({
        sub: 'p-1',
        email: 'carlos@demo.com',
        role: 'PARTNER',
        type: 'partner',
      });

      expect(result).toEqual({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        role: 'PARTNER',
        isActive: true,
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si partner no existe', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'p-1', email: 'x@x.com', role: 'PARTNER', type: 'partner' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si partner está PENDING', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'p-1', name: 'Test', email: 'x@x.com', status: 'PENDING', referralCode: 'TEST1234' });

      await expect(
        strategy.validate({ sub: 'p-1', email: 'x@x.com', role: 'PARTNER', type: 'partner' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si partner está SUSPENDED', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'p-1', name: 'Test', email: 'x@x.com', status: 'SUSPENDED', referralCode: 'TEST1234' });

      await expect(
        strategy.validate({ sub: 'p-1', email: 'x@x.com', role: 'PARTNER', type: 'partner' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('no debe consultar la tabla users para tokens de partner', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'p-1', name: 'Test', email: 'x@x.com', status: 'APPROVED', referralCode: 'TEST1234' });

      await strategy.validate({ sub: 'p-1', email: 'x@x.com', role: 'PARTNER', type: 'partner' });

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
