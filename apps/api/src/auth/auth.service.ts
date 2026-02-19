import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
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
import { getSetPasswordEmailHtml, getSetPasswordEmailText } from '../email/templates/set-password.email';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRES_PRODUCTION = '15m';
const ACCESS_TOKEN_EXPIRES_DEV = '7d'; // em desenvolvimento evita "sessão expirada" constante ao testar
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;
const TEMP_PASSWORD_LENGTH = 12;
const CONFIRM_RESET_TOKEN_EXPIRES = '1h';
const SET_PASSWORD_TOKEN_EXPIRES = '48h';
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
    @Inject(forwardRef(() => PartnersService))
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
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const phoneToStore = phoneNormalized.length >= 10 ? phoneNormalized : dto.phone;
    let user: { id: string; email: string; emailVerificationToken?: string | null };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const [existingByUsername, existingByEmail, existingByPhone] = await Promise.all([
          tx.user.findUnique({ where: { username: usernameNormalized }, select: { id: true } }),
          tx.user.findUnique({ where: { email: emailLower }, select: { id: true } }),
          phoneNormalized.length >= 10
            ? tx.user.findFirst({ where: { phone: phoneNormalized }, select: { id: true } })
            : Promise.resolve(null),
        ]);
        if (existingByUsername) {
          throw new ConflictException('Este nome de usuário já está em uso. Escolha outro.');
        }
        if (existingByEmail) {
          throw new ConflictException('Email já cadastrado');
        }
        if (existingByPhone) {
          throw new ConflictException('Telefone já cadastrado');
        }
        if (requireVerification) {
          const emailVerificationToken = crypto.randomBytes(32).toString('hex');
          return tx.user.create({
            data: {
              email: emailLower,
              passwordHash,
              name: dto.name.trim(),
              phone: phoneToStore,
              username: usernameNormalized,
              emailVerificationToken,
            },
          });
        }
        return tx.user.create({
          data: {
            email: emailLower,
            passwordHash,
            name: dto.name.trim(),
            phone: phoneToStore,
            username: usernameNormalized,
          },
        });
      });
    } catch (e: unknown) {
      if (e instanceof ConflictException) throw e;
      const prismaCode = (e as { code?: string })?.code;
      const prismaTarget = (e as { meta?: { target?: string[] } })?.meta?.target as string[] | undefined;
      if (prismaCode === 'P2002' && Array.isArray(prismaTarget)) {
        if (prismaTarget.includes('email')) throw new ConflictException('Email já cadastrado');
        if (prismaTarget.includes('username')) throw new ConflictException('Este nome de usuário já está em uso. Escolha outro.');
        if (prismaTarget.includes('phone')) throw new ConflictException('Telefone já cadastrado');
        throw new ConflictException('Dados já cadastrados. Use outro e-mail, nome de usuário ou telefone.');
      }
      throw e;
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
    try {
      return await this.issueTokens(user.id, user.email);
    } catch (e) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      throw e;
    }
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
    try {
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
    } catch (e) {
      await this.prisma.user.delete({ where: { id: userId } }).catch(() => {});
      throw e;
    }
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
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Defina sua senha primeiro. Use o link que enviamos por e-mail (válido por 48h). Se o link expirou, peça um novo ao administrador da ONG ou à equipe Adopet.');
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
    // Marca parceria como ativa no primeiro login do parceiro (conta com userId no Partner)
    await this.prisma.partner.updateMany({
      where: { userId: user.id, activatedAt: null },
      data: { activatedAt: new Date() },
    });
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

  private getAccessTokenExpires(): string {
    const env = this.config.get<string>('NODE_ENV');
    return env === 'production' ? ACCESS_TOKEN_EXPIRES_PRODUCTION : ACCESS_TOKEN_EXPIRES_DEV;
  }

  private async issueTokens(userId: string, email: string): Promise<AuthResponseDto> {
    const accessExpires = this.getAccessTokenExpires();
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: accessExpires } as object,
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
    // Valor informativo para o app (15 min em prod; em dev 7 dias em segundos)
    const expiresInSeconds = accessExpires === ACCESS_TOKEN_EXPIRES_PRODUCTION ? 15 * 60 : 7 * 24 * 60 * 60;
    return { accessToken, refreshToken, expiresIn: expiresInSeconds };
  }

  private hashRefreshToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cria usuário sem senha se o e-mail não existir (ex.: convite como membro ONG). Retorna userId e token (null se já existia).
   */
  async createUserWithoutPasswordIfNotExists(
    email: string,
    name: string,
    phone?: string,
  ): Promise<{ userId: string; setPasswordToken: string | null }> {
    const emailLower = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: emailLower }, select: { id: true } });
    if (existing) {
      return { userId: existing.id, setPasswordToken: null };
    }
    const phoneNorm = phone ? String(phone).replace(/\D/g, '').slice(-11) : null;
    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        name: name.trim(),
        phone: phoneNorm && phoneNorm.length >= 10 ? phoneNorm : null,
        username: null,
        passwordHash: null,
      },
    });
    const setPasswordToken = this.jwtService.sign(
      { sub: user.id, type: 'set-password' },
      { expiresIn: SET_PASSWORD_TOKEN_EXPIRES } as object,
    );
    return { userId: user.id, setPasswordToken };
  }

  /**
   * Cria usuário sem senha (ex.: admin da ONG ao aprovar parceria). Retorna token para enviar por e-mail (link definir senha).
   */
  async createUserForOngAdmin(
    email: string,
    name: string,
    phone?: string,
  ): Promise<{ userId: string; setPasswordToken: string }> {
    const emailLower = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }
    const phoneNorm = phone ? String(phone).replace(/\D/g, '').slice(-11) : null;
    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        name: name.trim(),
        phone: phoneNorm && phoneNorm.length >= 10 ? phoneNorm : null,
        username: null,
        passwordHash: null,
      },
    });
    const setPasswordToken = this.jwtService.sign(
      { sub: user.id, type: 'set-password' },
      { expiresIn: SET_PASSWORD_TOKEN_EXPIRES } as object,
    );
    return { userId: user.id, setPasswordToken };
  }

  /**
   * Gera novo token de definir senha para um usuário existente (ex.: reenvio de e-mail pelo admin).
   */
  async generateSetPasswordToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }
    return this.jwtService.sign(
      { sub: user.id, type: 'set-password' },
      { expiresIn: SET_PASSWORD_TOKEN_EXPIRES } as object,
    );
  }

  /**
   * Retorna o contexto para renderizar a página GET set-password (admin ONG vs membro da equipe).
   * Se o token for inválido, retorna null (página genérica). Se expirado, ainda decodifica para mostrar o texto correto.
   */
  async getSetPasswordPageContext(token: string): Promise<{ isPartnerAdmin: boolean; isPartnerMemberOnly: boolean } | null> {
    const raw = typeof token === 'string' ? token.trim() : '';
    if (!raw || raw.split('.').length !== 3) return null;
    let payload: { sub?: string; type?: string } | null = null;
    try {
      payload = this.jwtService.verify(raw, {
        clockTolerance: CONFIRM_RESET_CLOCK_TOLERANCE_SEC,
      } as object) as { sub?: string; type?: string };
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
      if (name === 'TokenExpiredError') {
        payload = this.jwtService.decode(raw) as { sub?: string; type?: string } | null;
      }
    }
    if (!payload?.sub || payload.type !== 'set-password') return null;
    const [partner, memberCount] = await Promise.all([
      this.prisma.partner.findUnique({ where: { userId: payload.sub }, select: { id: true } }),
      this.prisma.partnerMember.count({ where: { userId: payload.sub } }),
    ]);
    const isPartnerAdmin = !!partner;
    const isPartnerMemberOnly = !isPartnerAdmin && memberCount > 0;
    return { isPartnerAdmin, isPartnerMemberOnly };
  }

  /**
   * Define a senha usando o token enviado por e-mail (conta criada por aprovação de parceria ou convite como membro ONG).
   */
  async setPassword(token: string, newPassword: string, newPasswordConfirm?: string): Promise<{ message: string }> {
    if (newPasswordConfirm != null && newPasswordConfirm !== '' && newPassword !== newPasswordConfirm) {
      throw new BadRequestException('As senhas não coincidem. Digite a mesma senha nos dois campos.');
    }
    const raw = typeof token === 'string' ? token.trim() : '';
    if (!raw) {
      throw new BadRequestException('Token não foi enviado. Use o link que veio no e-mail e preencha a senha na própria página que abrir.');
    }
    // Token JWT tem 3 partes (header.payload.signature); se veio truncado (ex.: link cortado no e-mail), falha na verificação
    if (raw.split('.').length !== 3) {
      throw new BadRequestException(
        'O link parece estar incompleto (cortado pelo e-mail). Copie o link completo do e-mail ou peça ao admin para reenviar o e-mail de confirmação.',
      );
    }
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwtService.verify(raw, {
        clockTolerance: CONFIRM_RESET_CLOCK_TOLERANCE_SEC,
      } as object) as { sub?: string; type?: string };
    } catch (err: unknown) {
      const name = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : '';
      if (name === 'TokenExpiredError') {
        throw new BadRequestException('Este link já expirou. O link é válido por 48 horas. Solicite um novo link ao administrador.');
      }
      if (name === 'JsonWebTokenError' && (message === 'invalid signature' || message.includes('signature'))) {
        throw new BadRequestException(
          'O link não pôde ser validado. Se o e-mail foi enviado de outro ambiente (ex.: seu computador) e a API está na Vercel, confira se a variável JWT_SECRET na Vercel é exatamente a mesma usada ao enviar o e-mail. Peça também ao admin reenviar o e-mail de confirmação pela API já deployada.',
        );
      }
      throw new BadRequestException(
        'Link inválido ou incompleto. Abra o link completo do e-mail (evite clicar se o link quebrar em duas linhas). Se continuar falhando, peça ao admin reenviar o e-mail de confirmação.',
      );
    }
    if (payload.type !== 'set-password' || !payload.sub) {
      throw new BadRequestException('Link inválido.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { message: 'Senha definida com sucesso. Faça login no app com seu e-mail e a nova senha.' };
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
