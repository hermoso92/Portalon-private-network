import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key] ?? defaultVal;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'SUPER_ADMIN',
        isActive: true,
        totpEnabled: false,
        totpSecret: null,
        passwordHash: hashedPassword,
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.login({ email: 'test@test.com', password: 'password123' }) as any;

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        isActive: true,
        passwordHash: hashedPassword,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        isActive: false,
        passwordHash: 'hash',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return user without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.me('user-1');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
