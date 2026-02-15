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
import { getConfirmEmailHtml, getConfirmEmailText } from '../email/templates/confirm-email.email';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 12;
const CONFIRM_RESET_TOKEN_EXPIRES = '1h';
/** Tolerância (segundos) na verificação do exp para evitar "expirado" por diferença de relógio entre envio do e-mail e o servidor que processa o clique. */
const CONFIRM_RESET_CLOCK_TOLERANCE_SEC = 300;

/** Fallback: valor da env quando a flag não existe no banco. */
function isRequireEmailVerificationFromEnv(config: ConfigService): boolean {
  const v = config.get<string>('REQUIRE_EMAIL_VERIFICATION');
  return v === 'true' || v === '1';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly partnersService: PartnersService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** Lê do banco (FeatureFlag) primeiro; se não existir, usa env REQUIRE_EMAIL_VERIFICATION. Assim o painel admin pode ligar/desligar. */
  private async getRequireEmailVerification(): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key: 'REQUIRE_EMAIL_VERIFICATION' },
      select: { enabled: true },
    });
    if (flag !== null) return flag.enabled;
    return isRequireEmailVerificationFromEnv(this.config);
  }

  async signup(dto: SignupDto): Promise<AuthResponseDto | { message: string; requiresEmailVerification: true; userId: string }> {
    const requireVerification = await this.getRequireEmailVerification();
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
    let user: { id: string; email: string; emailVerificationToken?: string | null };
    if (requireVerification) {
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user = await this.prisma.user.create({
        data: {
          email: emailLower,
          passwordHash,
          name: dto.name.trim(),
          phone: phoneNormalized.length >= 10 ? phoneNormalized : dto.phone,
          username: usernameNormalized,
          emailVerificationToken,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: emailLower,
          passwordHash,
          name: dto.name.trim(),
          phone: phoneNormalized.length >= 10 ? phoneNormalized : dto.phone,
          username: usernameNormalized,
        },
      });
    }
    if (requireVerification) {
      const emailVerificationToken = (user as { emailVerificationToken?: string }).emailVerificationToken;
      const apiUrl = this.config.get<string>('API_PUBLIC_URL')?.replace(/\/$/, '') ?? '';
      if (apiUrl && this.emailService.isConfigured() && emailVerificationToken) {
        const confirmLink = `${apiUrl}/v1/auth/confirm-email?token=${encodeURIComponent(emailVerificationToken)}`;
        const logoUrl = (this.config.get<string>('LOGO_URL') || apiUrl + '/logo.png').trim();
        await this.emailService.sendMail({
          to: user.email,
          subject: 'Confirme seu e-mail - Adopet',
          text: getConfirmEmailText(confirmLink),
          html: getConfirmEmailHtml(confirmLink, logoUrl),
        }).catch(() => { /* não falhar signup se e-mail falhar */ });
      }
      return {
        message: 'Enviamos um e-mail de confirmação. Clique no link para ativar sua conta.',
        requiresEmailVerification: true as const,
        userId: user.id,
      };
    }
    return this.issueTokens(user.id, user.email);
  }

  /** Confirma o e-mail do usuário via token enviado no cadastro. */
  async confirmEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token?.trim()) {
      return { success: false, message: 'Link inválido ou expirado.' };
    }
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token.trim() },
      select: { id: true },
    });
    if (!user) {
      return { success: false, message: 'Link inválido ou já utilizado.' };
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    return { success: true, message: 'E-mail confirmado com sucesso. Sua conta está ativa.' };
  }

  /** Cadastro de parceiro comercial: cria usuário + parceiro (STORE). Com REQUIRE_EMAIL_VERIFICATION=true, exige confirmação de e-mail antes do login. */
  async partnerSignup(dto: PartnerSignupDto): Promise<AuthResponseDto | { message: string; requiresEmailVerification: true }> {
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
    const signupResult = await this.signup(signupData);
    let userId: string;
    if ('userId' in signupResult) {
      userId = signupResult.userId;
    } else {
      const payload = this.jwtService.decode((signupResult as AuthResponseDto).accessToken) as { sub: string } | null;
      if (!payload?.sub) throw new BadRequestException('Falha ao obter usuário criado');
      userId = payload.sub;
    }
    await this.partnersService.createForUser(
      userId,
      dto.establishmentName,
      dto.planId,
      dto.address?.trim() || null,
      documentType,
      document,
      dto.legalName?.trim() || null,
      dto.tradeName?.trim() || null,
    );
    if ('accessToken' in signupResult) return signupResult as AuthResponseDto;
    return { message: (signupResult as { message: string }).message, requiresEmailVerification: true as const };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const emailNorm = (dto.email ?? '').trim().toLowerCase();
    if (!emailNorm) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true, email: true, passwordHash: true, deactivatedAt: true, emailVerificationToken: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (user.deactivatedAt) {
      throw new UnauthorizedException('Conta desativada. Entre em contato para reativar.');
    }
    const emailVerificationToken = (user as { emailVerificationToken?: string }).emailVerificationToken;
    if (await this.getRequireEmailVerification() && emailVerificationToken) {
      throw new UnauthorizedException('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada e clique no link que enviamos.');
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
    const raw = typeof token === 'string' ? token.trim() : '';
    if (!raw) {
      return { success: false, message: 'Link inválido. Use o link completo que veio no e-mail ou solicite uma nova redefinição de senha.' };
    }
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwtService.verify(raw, {
        clockTolerance: CONFIRM_RESET_CLOCK_TOLERANCE_SEC,
      } as object) as { sub?: string; type?: string };
    } catch (err: unknown) {
      const isExpired = err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TokenExpiredError';
      if (isExpired) {
        return { success: false, message: 'Este link já expirou. O link é válido por 1 hora. Solicite uma nova redefinição de senha no app.' };
      }
      return { success: false, message: 'Link inválido. Verifique se abriu o link completo do e-mail (evite copiar só parte). Ou solicite uma nova redefinição de senha.' };
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

  /** Altera a senha do usuário logado (requer senha atual). */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, deactivatedAt: true },
    });
    if (!user?.passwordHash || user.deactivatedAt) {
      throw new UnauthorizedException('Conta desativada ou sem senha definida.');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Senha alterada com sucesso.' };
  }
}
