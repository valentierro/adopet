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
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { getTempPasswordEmailHtml, getTempPasswordEmailText } from '../email/templates/temp-password.email';
import { getConfirmResetEmailHtml, getConfirmResetEmailText } from '../email/templates/confirm-reset.email';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 12;
const CONFIRM_RESET_TOKEN_EXPIRES = '1h';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly partnersService: PartnersService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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

  /**
   * Envia e-mail com link de confirmação. Só ao clicar no link a senha é substituída e a temporária enviada.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const emailLower = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: emailLower },
      select: { id: true, email: true, passwordHash: true, deactivatedAt: true },
    });
    if (!user?.passwordHash || user.deactivatedAt) {
      return { message: 'Se esse e-mail estiver cadastrado, você receberá um link para confirmar e receber a senha temporária.' };
    }
    const token = this.jwtService.sign(
      { sub: user.id, type: 'confirm-reset' },
      { expiresIn: CONFIRM_RESET_TOKEN_EXPIRES } as object,
    );
    const apiUrl = (this.config.get<string>('API_PUBLIC_URL') ?? this.config.get<string>('APP_URL'))?.replace(/\/$/, '') ?? '';
    const confirmLink = apiUrl ? `${apiUrl}/v1/auth/confirm-reset-password?token=${encodeURIComponent(token)}` : '';
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
    if (this.emailService.isConfigured() && confirmLink) {
      await this.emailService.sendMail({
        to: user.email,
        subject: 'Confirmar redefinição de senha - Adopet',
        text: getConfirmResetEmailText(confirmLink),
        html: getConfirmResetEmailHtml(confirmLink, logoUrl),
      });
    }
    return { message: 'Se esse e-mail estiver cadastrado, você receberá um link para confirmar e receber a senha temporária.' };
  }

  /**
   * Valida o token do link de confirmação, gera senha temporária, atualiza o usuário e envia por e-mail.
   */
  async confirmResetPassword(token: string): Promise<{ success: boolean; message: string }> {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwtService.verify(token) as { sub?: string; type?: string };
    } catch {
      return { success: false, message: 'Link inválido ou expirado. Solicite uma nova redefinição de senha.' };
    }
    if (payload.type !== 'confirm-reset' || !payload.sub) {
      return { success: false, message: 'Link inválido. Solicite uma nova redefinição de senha.' };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
    if (this.emailService.isConfigured()) {
      await this.emailService.sendMail({
        to: user.email,
        subject: 'Senha temporária - Adopet',
        text: getTempPasswordEmailText(temporaryPassword),
        html: getTempPasswordEmailHtml(temporaryPassword, logoUrl),
      });
    }
    return { success: true, message: 'Senha temporária enviada ao seu e-mail. Verifique a caixa de entrada.' };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(TEMP_PASSWORD_LENGTH);
    let result = '';
    for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
      result += chars[bytes[i]! % chars.length];
    }
    return result;
  }

  private async issueTokens(userId: string, email: string): Promise<AuthResponseDto> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: ACCESS_TOKEN_EXPIRES } as object,
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' } as object,
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
