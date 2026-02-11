import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { SignupDto } from './dto/signup.dto';
import type { PartnerSignupDto } from './dto/partner-signup.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import { PartnersService } from '../partners/partners.service';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly partnersService: PartnersService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const emailLower = dto.email.trim().toLowerCase();
    const phoneNormalized = String(dto.phone).replace(/\D/g, '').slice(-11);
    const usernameNormalized = dto.username?.trim().toLowerCase().replace(/^@/, '') ?? '';
    if (usernameNormalized.length < 2) {
      throw new BadRequestException('Informe um nome de usuário com pelo menos 2 caracteres (letras minúsculas, números, ponto ou underscore).');
    }
    const existingByUsername = await this.prisma.user.findUnique({
      where: { username: usernameNormalized },
    });
    if (existingByUsername) {
      throw new ConflictException('Este nome de usuário já está em uso. Escolha outro.');
    }
    const [existingByEmail, existingByPhone] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: emailLower } }),
      phoneNormalized.length >= 10
        ? this.prisma.user.findFirst({ where: { phone: phoneNormalized } })
        : Promise.resolve(null),
    ]);
    if (existingByEmail) {
      throw new ConflictException('Email já cadastrado');
    }
    if (existingByPhone) {
      throw new ConflictException('Telefone já cadastrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        name: dto.name.trim(),
        phone: phoneNormalized.length >= 10 ? phoneNormalized : dto.phone,
        username: usernameNormalized,
      },
    });
    return this.issueTokens(user.id, user.email);
  }

  /** Cadastro de parceiro comercial: cria usuário + parceiro (STORE). Após pagamento, assinatura é ativada. */
  async partnerSignup(dto: PartnerSignupDto): Promise<AuthResponseDto> {
    let documentType: 'CPF' | 'CNPJ' | null = null;
    let document: string | null = null;
    if (dto.personType === 'PF' && dto.cpf) {
      const digits = dto.cpf.replace(/\D/g, '');
      if (digits.length !== 11) throw new BadRequestException('CPF deve ter 11 dígitos.');
      documentType = 'CPF';
      document = digits;
    } else if (dto.personType === 'CNPJ' && dto.cnpj) {
      const digits = dto.cnpj.replace(/\D/g, '');
      if (digits.length !== 14) throw new BadRequestException('CNPJ deve ter 14 dígitos.');
      documentType = 'CNPJ';
      document = digits;
    }
    const signupData: SignupDto = {
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
      username: dto.username,
    };
    const tokens = await this.signup(signupData);
    const payload = this.jwtService.decode(tokens.accessToken) as { sub: string } | null;
    if (!payload?.sub) throw new BadRequestException('Falha ao obter usuário criado');
    await this.partnersService.createForUser(
      payload.sub,
      dto.establishmentName,
      dto.planId,
      dto.address?.trim() || null,
      documentType,
      document,
      dto.legalName?.trim() || null,
      dto.tradeName?.trim() || null,
    );
    return tokens;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (user.deactivatedAt) {
      throw new UnauthorizedException('Conta desativada. Entre em contato para reativar.');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token obrigatório');
    }
    const hash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    if ((stored.user as { deactivatedAt?: Date }).deactivatedAt) {
      await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException('Conta desativada.');
    }
    await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    return this.issueTokens(stored.user.id, stored.user.email);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    if (!refreshToken) return { message: 'OK' };
    const hash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
    return { message: 'OK' };
  }

  private async issueTokens(userId: string, email: string): Promise<AuthResponseDto> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: ACCESS_TOKEN_EXPIRES },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
      },
    });
    const expiresInSeconds = 15 * 60; // 900
    return { accessToken, refreshToken, expiresIn: expiresInSeconds };
  }

  private hashRefreshToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
