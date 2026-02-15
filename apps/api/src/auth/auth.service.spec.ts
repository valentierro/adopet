import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';
import { EmailService } from '../email/email.service';

/** Valores semelhantes a produção para testes */
const PROD_LIKE = {
  email: 'maria.silva@email.com.br',
  emailWithSpaces: '  Maria.Silva@Email.com.BR  ',
  password: 'SenhaSegura123',
  name: 'Maria Silva',
  phone: '11987654321',
  username: 'maria.silva',
} as const;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    refreshToken: { findFirst: jest.Mock; delete: jest.Mock; create: jest.Mock; deleteMany: jest.Mock };
  };
  let configGet: jest.Mock;
  let jwtSign: jest.Mock;

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
    configGet = jest.fn();
    jwtSign = jest.fn(() => 'token');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
        { provide: PartnersService, useValue: {} },
        { provide: EmailService, useValue: { isConfigured: () => false, sendMail: jest.fn() } },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('deve rejeitar quando e-mail já existe (valor tipo produção)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: '1', email: PROD_LIKE.email });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.signup({
          email: PROD_LIKE.email,
          password: PROD_LIKE.password,
          name: PROD_LIKE.name,
          phone: PROD_LIKE.phone,
          username: PROD_LIKE.username,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve criar usuário e retornar requiresEmailVerification quando REQUIRE_EMAIL_VERIFICATION=true', async () => {
      configGet.mockImplementation((key: string) => (key === 'REQUIRE_EMAIL_VERIFICATION' ? 'true' : undefined));
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: PROD_LIKE.email,
        emailVerificationToken: 'abc123',
      });
      const res = await service.signup({
        email: PROD_LIKE.email,
        password: PROD_LIKE.password,
        name: PROD_LIKE.name,
        phone: PROD_LIKE.phone,
        username: PROD_LIKE.username,
      });
      expect(res).toHaveProperty('message');
      expect((res as { requiresEmailVerification?: boolean }).requiresEmailVerification).toBe(true);
      expect((res as { userId?: string }).userId).toBe('user-1');
    });

    it('deve criar usuário e retornar tokens quando REQUIRE_EMAIL_VERIFICATION=false', async () => {
      configGet.mockReturnValue(undefined);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-2',
        email: PROD_LIKE.email,
      });
      prisma.refreshToken.create.mockResolvedValue({});
      const res = await service.signup({
        email: PROD_LIKE.email,
        password: PROD_LIKE.password,
        name: PROD_LIKE.name,
        phone: PROD_LIKE.phone,
        username: PROD_LIKE.username,
      });
      expect(res).toHaveProperty('accessToken', 'token');
      expect(res).toHaveProperty('refreshToken', 'token');
      expect(res).toHaveProperty('expiresIn');
    });

    it('deve rejeitar quando nome de usuário já existe', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: '1', username: PROD_LIKE.username });
      await expect(
        service.signup({
          email: 'outro@email.com',
          password: PROD_LIKE.password,
          name: PROD_LIKE.name,
          phone: '11976543210',
          username: PROD_LIKE.username,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve rejeitar quando telefone já existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: '1', phone: PROD_LIKE.phone });
      await expect(
        service.signup({
          email: 'novo@email.com',
          password: PROD_LIKE.password,
          name: PROD_LIKE.name,
          phone: PROD_LIKE.phone,
          username: 'outro.user',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const hashForSenhaSegura123 = '$2b$10$abcdefghijklmnopqrstuu'; // bcrypt hash (mock)

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'naoexiste@email.com', password: PROD_LIKE.password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando email está vazio (após trim)', async () => {
      await expect(
        service.login({ email: '   ', password: PROD_LIKE.password }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando usuário não tem passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: null,
        deactivatedAt: null,
        emailVerificationToken: null,
      });
      await expect(
        service.login({ email: PROD_LIKE.email, password: PROD_LIKE.password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando conta está desativada', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: hashForSenhaSegura123,
        deactivatedAt: new Date(),
        emailVerificationToken: null,
      });
      await expect(
        service.login({ email: PROD_LIKE.email, password: PROD_LIKE.password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando e-mail não confirmado e REQUIRE_EMAIL_VERIFICATION=true', async () => {
      configGet.mockImplementation((key: string) => (key === 'REQUIRE_EMAIL_VERIFICATION' ? 'true' : undefined));
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: hashForSenhaSegura123,
        deactivatedAt: null,
        emailVerificationToken: 'pending-token',
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      await expect(
        service.login({ email: PROD_LIKE.email, password: PROD_LIKE.password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando senha está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: hashForSenhaSegura123,
        deactivatedAt: null,
        emailVerificationToken: null,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(
        service.login({ email: PROD_LIKE.email, password: 'SenhaErrada456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve normalizar e-mail (trim + lowercase) ao buscar usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'maria.silva@email.com.br',
        passwordHash: hashForSenhaSegura123,
        deactivatedAt: null,
        emailVerificationToken: null,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.refreshToken.create.mockResolvedValue({});
      await service.login({
        email: PROD_LIKE.emailWithSpaces,
        password: PROD_LIKE.password,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'maria.silva@email.com.br' },
        select: expect.any(Object),
      });
    });

    it('deve retornar tokens quando credenciais são válidas (valor tipo produção)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr-123',
        email: PROD_LIKE.email,
        passwordHash: hashForSenhaSegura123,
        deactivatedAt: null,
        emailVerificationToken: null,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.refreshToken.create.mockResolvedValue({});
      const res = await service.login({
        email: PROD_LIKE.email,
        password: PROD_LIKE.password,
      });
      expect(res).toHaveProperty('accessToken', 'token');
      expect(res).toHaveProperty('refreshToken', 'token');
      expect(res).toHaveProperty('expiresIn');
    });
  });

  describe('forgotPassword', () => {
    it('deve retornar mensagem genérica quando e-mail não está cadastrado (segurança)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'naoexiste@dominio.com' });
      expect(res.message).toContain('Se esse e-mail estiver cadastrado');
    });

    it('deve retornar mensagem genérica quando conta está desativada', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: 'hash',
        deactivatedAt: new Date(),
      });
      const res = await service.forgotPassword({ email: PROD_LIKE.email });
      expect(res.message).toContain('Se esse e-mail estiver cadastrado');
    });

    it('deve retornar mensagem de sucesso quando e-mail existe e conta ativa', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: 'hash',
        deactivatedAt: null,
      });
      const res = await service.forgotPassword({ email: PROD_LIKE.email });
      expect(res.message).toContain('Se esse e-mail estiver cadastrado');
    });

    it('deve normalizar e-mail (trim + lowercase) ao buscar usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: PROD_LIKE.email,
        passwordHash: 'hash',
        deactivatedAt: null,
      });
      await service.forgotPassword({ email: PROD_LIKE.emailWithSpaces });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'maria.silva@email.com.br' },
        select: expect.any(Object),
      });
    });
  });
});
