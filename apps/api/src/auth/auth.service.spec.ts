import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock }; refreshToken: { findFirst: jest.Mock; delete: jest.Mock; create: jest.Mock; deleteMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      refreshToken: {
        findFirst: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'token') },
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '1', email: 'a@b.com' });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.signup({ email: 'a@b.com', password: '123456', name: 'Test', phone: '11987654321', username: 'testuser' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens when email is new', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@b.com',
      });
      prisma.refreshToken.create.mockResolvedValue({});
      const res = await service.signup({
        email: 'new@b.com',
        password: '123456',
        name: 'Test',
        phone: '11987654321',
        username: 'testuser',
      });
      expect(res).toHaveProperty('accessToken');
      expect(res).toHaveProperty('refreshToken');
      expect(res.expiresIn).toBe(900);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@b.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if no passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        passwordHash: null,
      });
      await expect(
        service.login({ email: 'a@b.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
