import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { FeedService } from '../feed/feed.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import { VerificationService } from '../verification/verification.service';
import { getSetPasswordEmailHtml, getSetPasswordEmailText } from '../email/templates/set-password.email';
import type { PartnerPublicDto, PartnerMeDto } from './dto/partner-response.dto';
import type { PartnerAdminDto } from './dto/partner-response.dto';
import type { CreatePartnerDto } from './dto/create-partner.dto';
import type { UpdatePartnerDto } from './dto/update-partner.dto';
import type { UpdateMyPartnerDto } from './dto/update-my-partner.dto';
import type { CreatePartnerCouponDto } from './dto/create-partner-coupon.dto';
import type { UpdatePartnerCouponDto } from './dto/update-partner-coupon.dto';
import type { PartnerCouponResponseDto } from './dto/partner-coupon-response.dto';
import type { CreatePartnerServiceDto } from './dto/create-partner-service.dto';
import type { UpdatePartnerServiceDto } from './dto/update-partner-service.dto';
import type { PartnerServiceResponseDto } from './dto/partner-service-response.dto';
import { PARTNER_MEMBER_ROLES } from './dto/add-partner-member.dto';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureUniqueSlug(base: string, existing: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let n = 0;
  return (async (): Promise<string> => {
    while (await existing(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return slug;
  })();
}

export type PartnerMemberDto = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role?: string | null;
  createdAt: string;
};

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly feedService: FeedService,
    private readonly tutorStatsService: TutorStatsService,
    private readonly verificationService: VerificationService,
  ) {}

  /** Retorna o parceiro do usuário (portal do parceiro). Null se não for parceiro. Sempre permitido para renovar assinatura. */
  async getByUserId(userId: string): Promise<PartnerMeDto | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });
    return partner ? this.toMeDto(partner) : null;
  }

  private ensurePaidPartner<T extends { isPaidPartner: boolean }>(partner: T | null): asserts partner is T {
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    if (!partner.isPaidPartner) {
      throw new ForbiddenException('Assinatura inativa. Renove para acessar o portal do parceiro. Seu histórico foi mantido.');
    }
  }

  /** Lista cupons do parceiro do usuário. Requer assinatura ativa. */
  async getCouponsByUserId(userId: string): Promise<PartnerCouponResponseDto[]> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: { coupons: { orderBy: { createdAt: 'desc' } } },
    });
    if (!partner) return [];
    this.ensurePaidPartner(partner);
    return partner.coupons.map((c) => this.toCouponDto(c));
  }

  /** Cria cupom para o parceiro do usuário. Requer assinatura ativa. */
  async createCoupon(userId: string, dto: CreatePartnerCouponDto): Promise<PartnerCouponResponseDto> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.partnerCoupon.findFirst({
      where: { partnerId: partner.id, code },
    });
    if (existing) throw new BadRequestException('Já existe um cupom com este código.');
    const coupon = await this.prisma.partnerCoupon.create({
      data: {
        partnerId: partner.id,
        code,
        title: dto.title?.trim() || null,
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
    return this.toCouponDto(coupon);
  }

  /** Atualiza cupom do parceiro do usuário. Requer assinatura ativa. */
  async updateCoupon(userId: string, couponId: string, dto: UpdatePartnerCouponDto): Promise<PartnerCouponResponseDto> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const coupon = await this.prisma.partnerCoupon.findFirst({
      where: { id: couponId, partnerId: partner.id },
    });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    const data: { code?: string; title?: string | null; description?: string | null; discountType?: string; discountValue?: number; validUntil?: Date | null; active?: boolean } = {};
    if (dto.code !== undefined) data.code = dto.code.trim().toUpperCase();
    if (dto.title !== undefined) data.title = dto.title?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.active !== undefined) data.active = dto.active;
    const updated = await this.prisma.partnerCoupon.update({
      where: { id: couponId },
      data,
    });
    return this.toCouponDto(updated);
  }

  /** Remove cupom do parceiro do usuário. Requer assinatura ativa. */
  async deleteCoupon(userId: string, couponId: string): Promise<{ message: string }> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const coupon = await this.prisma.partnerCoupon.findFirst({
      where: { id: couponId, partnerId: partner.id },
    });
    if (!coupon) throw new NotFoundException('Cupom não encontrado');
    await this.prisma.partnerCoupon.delete({ where: { id: couponId } });
    return { message: 'OK' };
  }

  /** Lista serviços do parceiro do usuário. Requer assinatura ativa. */
  async getServicesByUserId(userId: string): Promise<PartnerServiceResponseDto[]> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: { services: { orderBy: { createdAt: 'desc' } } },
    });
    if (!partner) return [];
    this.ensurePaidPartner(partner);
    return partner.services.map((s) => this.toServiceDto(s));
  }

  /** Cria serviço para o parceiro do usuário. Requer assinatura ativa. */
  async createService(userId: string, dto: CreatePartnerServiceDto): Promise<PartnerServiceResponseDto> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const service = await this.prisma.partnerService.create({
      data: {
        partnerId: partner.id,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        priceDisplay: dto.priceDisplay?.trim() || null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        imageUrl: dto.imageUrl?.trim() || null,
      },
    });
    return this.toServiceDto(service);
  }

  /** Atualiza serviço do parceiro do usuário. Requer assinatura ativa. */
  async updateService(userId: string, serviceId: string, dto: UpdatePartnerServiceDto): Promise<PartnerServiceResponseDto> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const service = await this.prisma.partnerService.findFirst({
      where: { id: serviceId, partnerId: partner.id },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    const data: { name?: string; description?: string | null; priceDisplay?: string | null; validUntil?: Date | null; active?: boolean; imageUrl?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.priceDisplay !== undefined) data.priceDisplay = dto.priceDisplay?.trim() || null;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl?.trim() || null;
    const updated = await this.prisma.partnerService.update({
      where: { id: serviceId },
      data,
    });
    return this.toServiceDto(updated);
  }

  /** Remove serviço do parceiro do usuário. Requer assinatura ativa. */
  async deleteService(userId: string, serviceId: string): Promise<{ message: string }> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    this.ensurePaidPartner(partner);
    const service = await this.prisma.partnerService.findFirst({
      where: { id: serviceId, partnerId: partner.id },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    await this.prisma.partnerService.delete({ where: { id: serviceId } });
    return { message: 'OK' };
  }

  /** Atualiza o parceiro do usuário (dados do estabelecimento no portal). ONG não precisa assinatura; comercial requer assinatura ativa. */
  async updateByUserId(userId: string, dto: UpdateMyPartnerDto): Promise<PartnerMeDto> {
    const existing = await this.prisma.partner.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException('Parceiro não encontrado');
    if (existing.type !== 'ONG') this.ensurePaidPartner(existing);
    const data: {
      name?: string;
      city?: string | null;
      description?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      galleryUrls?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.city !== undefined) data.city = dto.city?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.website !== undefined) data.website = dto.website?.trim() || null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.galleryUrls !== undefined) data.galleryUrls = Array.isArray(dto.galleryUrls) ? JSON.stringify(dto.galleryUrls) : null;
    const updated = await this.prisma.partner.update({
      where: { userId },
      data,
    });
    return this.toMeDto(updated);
  }

  /** Lista parceiros ativos e aprovados (público – app). Parceiros pagos aparecem mesmo sem approvedAt. */
  async findActivePublic(type?: string): Promise<PartnerPublicDto[]> {
    const list = await this.prisma.partner.findMany({
      where: {
        active: true,
        OR: [{ approvedAt: { not: null } }, { isPaidPartner: true }],
        ...(type ? { type } : {}),
      },
      orderBy: [{ isPaidPartner: 'desc' }, { name: 'asc' }],
    });
    return list.map((p) => this.toPublicDto(p));
  }

  /** Um parceiro por ID (público), mesma regra de visibilidade da lista. */
  async findOneActivePublic(id: string): Promise<PartnerPublicDto | null> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        id,
        active: true,
        OR: [{ approvedAt: { not: null } }, { isPaidPartner: true }],
      },
    });
    return partner ? this.toPublicDto(partner) : null;
  }

  /** Cupons ativos de um parceiro (público – para exibir na página do parceiro). */
  async findActivePublicCoupons(partnerId: string): Promise<PartnerCouponResponseDto[]> {
    const now = new Date();
    const coupons = await this.prisma.partnerCoupon.findMany({
      where: {
        partnerId,
        active: true,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { validUntil: 'asc' },
    });
    return coupons.map((c) => this.toCouponDto(c));
  }

  /** Serviços ativos de um parceiro (público – para exibir na página do parceiro). */
  async findActivePublicServices(partnerId: string): Promise<PartnerServiceResponseDto[]> {
    const now = new Date();
    const services = await this.prisma.partnerService.findMany({
      where: {
        partnerId,
        active: true,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { name: 'asc' },
    });
    return services.map((s) => this.toServiceDto(s));
  }

  /** Registra visualização da página do parceiro (público). */
  async recordProfileView(partnerId: string): Promise<void> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        id: partnerId,
        active: true,
        OR: [{ approvedAt: { not: null } }, { isPaidPartner: true }],
      },
    });
    if (!partner) return;
    await this.prisma.partnerEvent.create({
      data: { partnerId, eventType: 'profile_view' },
    });
  }

  /** Registra cópia de cupom (público – quando usuário clica para copiar). */
  async recordCouponCopy(partnerId: string, couponId: string): Promise<void> {
    const coupon = await this.prisma.partnerCoupon.findFirst({
      where: { id: couponId, partnerId, active: true },
    });
    if (!coupon) return;
    await this.prisma.partnerEvent.create({
      data: { partnerId, eventType: 'coupon_copy', couponId },
    });
  }

  /** Analytics do parceiro do usuário (portal). Requer assinatura ativa. */
  async getAnalyticsByUserId(userId: string): Promise<{
    profileViews: number;
    couponCopies: number;
    byCoupon: Array<{ couponId: string; code: string; copies: number }>;
  }> {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) return { profileViews: 0, couponCopies: 0, byCoupon: [] };
    this.ensurePaidPartner(partner);

    const [profileViews, couponCopies, eventsByCoupon] = await Promise.all([
      this.prisma.partnerEvent.count({ where: { partnerId: partner.id, eventType: 'profile_view' } }),
      this.prisma.partnerEvent.count({ where: { partnerId: partner.id, eventType: 'coupon_copy' } }),
      this.prisma.partnerEvent.groupBy({
        by: ['couponId'],
        where: { partnerId: partner.id, eventType: 'coupon_copy' },
        _count: { couponId: true },
      }),
    ]);

    const couponIds = eventsByCoupon.map((e) => e.couponId).filter(Boolean) as string[];
    const coupons = couponIds.length
      ? await this.prisma.partnerCoupon.findMany({
          where: { id: { in: couponIds } },
          select: { id: true, code: true },
        })
      : [];
    const byCode = Object.fromEntries(coupons.map((c) => [c.id, c.code]));

    const byCoupon = eventsByCoupon
      .filter((e) => e.couponId)
      .map((e) => ({
        couponId: e.couponId!,
        code: byCode[e.couponId!] ?? e.couponId!,
        copies: e._count.couponId,
      }))
      .sort((a, b) => b.copies - a.copies);

    return { profileViews, couponCopies, byCoupon };
  }

  private ensureOngAdmin(partner: { type: string; id: string } | null): asserts partner is { type: 'ONG'; id: string } {
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    if (partner.type !== 'ONG') {
      throw new ForbiddenException('Apenas ONGs podem gerenciar membros.');
    }
  }

  /** Lista membros da ONG (portal do parceiro). Apenas para parceiro type=ONG. */
  async listMembersByUserId(userId: string): Promise<PartnerMemberDto[]> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    this.ensureOngAdmin(partner);
    return partner.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /** Adiciona membro à ONG. Se o e-mail já existir no app, apenas vincula; senão cria usuário e envia e-mail para definir senha. */
  async addMemberByUserId(
    userId: string,
    dto: { email: string; name: string; phone?: string; role?: string },
  ): Promise<PartnerMemberDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      select: { id: true, type: true, name: true },
    });
    this.ensureOngAdmin(partner);
    const emailLower = dto.email.trim().toLowerCase();
    const { userId: newOrExistingUserId, setPasswordToken } = await this.authService.createUserWithoutPasswordIfNotExists(
      dto.email,
      dto.name,
      dto.phone,
    );
    const existing = await this.prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: newOrExistingUserId } },
    });
    if (existing) {
      throw new BadRequestException('Este usuário já é membro da ONG.');
    }
    const member = await this.prisma.partnerMember.create({
      data: {
        partnerId: partner.id,
        userId: newOrExistingUserId,
        role: dto.role && PARTNER_MEMBER_ROLES.includes(dto.role as (typeof PARTNER_MEMBER_ROLES)[number]) ? dto.role : null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (setPasswordToken && this.emailService.isConfigured()) {
      const apiUrl = this.config.get<string>('API_PUBLIC_URL')?.replace(/\/$/, '') ?? '';
      const setPasswordLink = apiUrl ? `${apiUrl}/v1/auth/set-password?token=${encodeURIComponent(setPasswordToken)}` : '';
      const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
      const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
      const emailData = {
        setPasswordLink,
        title: 'Você foi adicionado(a) à ONG no Adopet',
        bodyHtml: `<p>Você foi adicionado(a) como membro da <strong>${partner.name}</strong> no app Adopet. Defina sua senha no link abaixo para acessar o app.</p>`,
        bodyText: `Você foi adicionado(a) como membro da ${partner.name} no Adopet. Defina sua senha no link abaixo para acessar o app.`,
      };
      await this.emailService.sendMail({
        to: emailLower,
        subject: 'Defina sua senha - Adopet',
        text: getSetPasswordEmailText(emailData),
        html: getSetPasswordEmailHtml(emailData, logoUrl),
      }).catch(() => {});
    }
    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
    };
  }

  /** Atualiza membro da ONG (ex.: função/role). */
  async updateMemberByUserId(
    adminUserId: string,
    memberUserId: string,
    dto: { role?: string | null },
  ): Promise<PartnerMemberDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId: adminUserId },
      select: { id: true, type: true },
    });
    this.ensureOngAdmin(partner);
    const membership = await this.prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: memberUserId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado.');
    const roleValue =
      dto.role === '' || dto.role === null || dto.role === undefined
        ? null
        : dto.role && PARTNER_MEMBER_ROLES.includes(dto.role as (typeof PARTNER_MEMBER_ROLES)[number])
          ? dto.role
          : membership.role;
    const updated = await this.prisma.partnerMember.update({
      where: { partnerId_userId: { partnerId: partner.id, userId: memberUserId } },
      data: { role: roleValue },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /** Remove membro da ONG (desvincula; não exclui a conta do usuário). */
  async removeMemberByUserId(adminUserId: string, memberUserId: string): Promise<{ message: string }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId: adminUserId },
      select: { id: true, type: true },
    });
    this.ensureOngAdmin(partner);
    await this.prisma.partnerMember.deleteMany({
      where: { partnerId: partner.id, userId: memberUserId },
    });
    return { message: 'Membro removido da ONG.' };
  }

  /** [Admin ONG] Perfil público + pets de um membro da ONG. */
  async getMemberDetailsByUserId(adminUserId: string, memberUserId: string): Promise<{
    profile: {
      id: string;
      name: string;
      avatarUrl?: string;
      petsCount: number;
      verified?: boolean;
      city?: string;
      bio?: string;
      housingType?: string;
      hasYard?: boolean;
      hasOtherPets?: boolean;
      hasChildren?: boolean;
      timeAtHome?: string;
      tutorStats?: { points: number; level: string; title: string; verifiedCount: number; adoptedCount: number };
      phone?: string;
    };
    pets: Awaited<ReturnType<FeedService['getFeed']>>['items'];
  }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId: adminUserId },
      select: { id: true, type: true },
    });
    this.ensureOngAdmin(partner);
    const membership = await this.prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: memberUserId } },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado.');
    const user = await this.prisma.user.findUnique({
      where: { id: memberUserId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        bio: true,
        housingType: true,
        hasYard: true,
        hasOtherPets: true,
        hasChildren: true,
        timeAtHome: true,
        phone: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const [petsCount, ownerVerified, tutorStats, feedResult] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: memberUserId } }),
      this.verificationService.isUserVerified(memberUserId),
      this.tutorStatsService.getStats(memberUserId),
      this.feedService.getFeed({ ownerId: memberUserId, userId: adminUserId }),
    ]);
    const profile: {
      id: string;
      name: string;
      avatarUrl?: string;
      petsCount: number;
      verified?: boolean;
      city?: string;
      bio?: string;
      housingType?: string;
      hasYard?: boolean;
      hasOtherPets?: boolean;
      hasChildren?: boolean;
      timeAtHome?: string;
      tutorStats?: { points: number; level: string; title: string; verifiedCount: number; adoptedCount: number };
      phone?: string;
    } = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? undefined,
      petsCount,
      tutorStats,
    };
    if (ownerVerified) profile.verified = true;
    if (user.city != null) profile.city = user.city;
    if (user.bio != null) profile.bio = user.bio;
    if (user.housingType != null) profile.housingType = user.housingType;
    if (user.hasYard != null) profile.hasYard = user.hasYard;
    if (user.hasOtherPets != null) profile.hasOtherPets = user.hasOtherPets;
    if (user.hasChildren != null) profile.hasChildren = user.hasChildren;
    if (user.timeAtHome != null) profile.timeAtHome = user.timeAtHome;
    if (user.phone != null) profile.phone = user.phone;
    return { profile, pets: feedResult.items };
  }

  /** Lista todos os parceiros (admin) */
  async findAllAdmin(): Promise<PartnerAdminDto[]> {
    const list = await this.prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        slug: true,
        city: true,
        description: true,
        website: true,
        logoUrl: true,
        phone: true,
        email: true,
        address: true,
        active: true,
        approvedAt: true,
        activatedAt: true,
        rejectionReason: true,
        isPaidPartner: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
    return list.map((p) => this.toAdminDto(p));
  }

  /** Cria parceiro vinculado a um usuário (fluxo cadastro + pagamento no app). Tipo STORE, aguardando pagamento. */
  async createForUser(
    userId: string,
    establishmentName: string,
    planId?: string,
    address?: string | null,
    documentType?: 'CPF' | 'CNPJ' | null,
    document?: string | null,
    legalName?: string | null,
    tradeName?: string | null,
  ): Promise<{ id: string; slug: string }> {
    const slugBase = slugify(establishmentName);
    if (!slugBase) throw new BadRequestException('Nome do estabelecimento inválido');
    const slug = await ensureUniqueSlug(slugBase, (s) =>
      this.prisma.partner.findUnique({ where: { slug: s } }).then((r) => !!r),
    );
    const partner = await this.prisma.partner.create({
      data: {
        userId,
        type: 'STORE',
        name: establishmentName.trim(),
        slug,
        active: true,
        approvedAt: null,
        isPaidPartner: false,
        planId: planId?.trim() || null,
        address: address?.trim() || null,
        documentType: documentType || null,
        document: document?.replace(/\D/g, '') || null,
        legalName: legalName?.trim() || null,
        tradeName: tradeName?.trim() || null,
      },
    });
    return { id: partner.id, slug: partner.slug };
  }

  /** Cria parceiro (admin). Gera slug a partir do nome se não informado. */
  async create(dto: CreatePartnerDto): Promise<PartnerAdminDto> {
    const slugBase = dto.slug?.trim() || slugify(dto.name);
    if (!slugBase) throw new BadRequestException('Nome ou slug inválido');
    const slug = await ensureUniqueSlug(slugBase, (s) =>
      this.prisma.partner.findUnique({ where: { slug: s } }).then((r) => !!r),
    );
    const approvedAt = dto.approve === true ? new Date() : null;
    const active = dto.active !== false;
    const partner = await this.prisma.partner.create({
      data: {
        type: dto.type,
        name: dto.name.trim(),
        slug,
        city: dto.city?.trim() || null,
        description: dto.description?.trim() || null,
        website: dto.website?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        active,
        approvedAt,
        isPaidPartner: dto.isPaidPartner === true,
        ...(dto.userId && { userId: dto.userId }),
      },
    });
    return this.toAdminDto(partner);
  }

  /** Atualiza parceiro (admin). Se approve=true, define approvedAt e limpa rejeição. Se reject=true, limpa approvedAt e define rejectionReason. */
  async update(id: string, dto: UpdatePartnerDto): Promise<PartnerAdminDto> {
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Parceiro não encontrado');
    const data: {
      name?: string;
      slug?: string;
      city?: string | null;
      description?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      active?: boolean;
      approvedAt?: Date | null;
      rejectionReason?: string | null;
      isPaidPartner?: boolean;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug.trim();
    if (dto.city !== undefined) data.city = dto.city?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.website !== undefined) data.website = dto.website?.trim() || null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.approve === true) {
      data.approvedAt = new Date();
      data.rejectionReason = null;
    }
    if (dto.reject === true) {
      data.approvedAt = null;
      data.rejectionReason = dto.rejectionReason?.trim() || null;
    }
    if (dto.isPaidPartner !== undefined) data.isPaidPartner = dto.isPaidPartner;
    const partner = await this.prisma.partner.update({
      where: { id },
      data,
    });
    return this.toAdminDto(partner);
  }

  /** [Admin] Aprovar vários parceiros de uma vez. */
  async bulkApprove(ids: string[]): Promise<{ updated: number }> {
    if (!ids.length) return { updated: 0 };
    const result = await this.prisma.partner.updateMany({
      where: { id: { in: ids } },
      data: { approvedAt: new Date(), rejectionReason: null },
    });
    return { updated: result.count };
  }

  /** [Admin] Rejeitar vários parceiros de uma vez (com motivo opcional). */
  async bulkReject(ids: string[], rejectionReason?: string): Promise<{ updated: number }> {
    if (!ids.length) return { updated: 0 };
    const reason = rejectionReason?.trim() || null;
    const result = await this.prisma.partner.updateMany({
      where: { id: { in: ids } },
      data: { approvedAt: null, rejectionReason: reason },
    });
    return { updated: result.count };
  }

  /** [Admin] Reenvia e-mail de definir senha para parceiro que ainda não ativou (primeiro login). Apenas quando tem userId e activatedAt é null. */
  async resendSetPasswordEmail(partnerId: string): Promise<{ message: string }> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    if (!partner.userId || !partner.user) {
      throw new BadRequestException(
        'Este parceiro não possui conta de acesso. Reenvio só para parceiros que receberam e-mail de definir senha (ex.: ONG aprovada por solicitação).',
      );
    }
    if (partner.activatedAt) {
      throw new BadRequestException('Parceiro já ativo (já acessou o app). Não é possível reenviar o e-mail.');
    }
    const setPasswordToken = await this.authService.generateSetPasswordToken(partner.user.id);
    if (!this.emailService.isConfigured()) {
      throw new BadRequestException('Envio de e-mail não configurado. Configure as variáveis de e-mail na API.');
    }
    const apiUrl = this.config.get<string>('API_PUBLIC_URL')?.replace(/\/$/, '') ?? '';
    const setPasswordLink = apiUrl ? `${apiUrl}/v1/auth/set-password?token=${encodeURIComponent(setPasswordToken)}` : '';
    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
    const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
    const emailData = {
      setPasswordLink,
      title: 'Novo link para definir sua senha',
      bodyHtml: `<p>Foi solicitado um novo link para definir a senha da sua conta de parceiro <strong>${partner.name}</strong>. Use o botão abaixo para definir ou redefinir sua senha e acessar o app.</p>`,
      bodyText: `Novo link para definir a senha da sua conta de parceiro ${partner.name}. Acesse o link para definir ou redefinir sua senha e acessar o app.`,
    };
    await this.emailService.sendMail({
      to: partner.user.email,
      subject: 'Novo link para definir sua senha - Adopet',
      text: getSetPasswordEmailText(emailData),
      html: getSetPasswordEmailHtml(emailData, logoUrl),
    });
    return { message: 'E-mail de confirmação reenviado com sucesso.' };
  }

  private toPublicDto(p: {
    id: string;
    type: string;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    isPaidPartner: boolean;
    address?: string | null;
  }): PartnerPublicDto {
    return {
      id: p.id,
      type: p.type,
      name: p.name,
      slug: p.slug,
      city: p.city ?? undefined,
      address: p.address ?? undefined,
      description: p.description ?? undefined,
      website: p.website ?? undefined,
      logoUrl: p.logoUrl ?? undefined,
      phone: p.phone ?? undefined,
      email: p.email ?? undefined,
      isPaidPartner: p.isPaidPartner,
    };
  }

  private toAdminDto(p: {
    id: string;
    type: string;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
    approvedAt: Date | null;
    activatedAt: Date | null;
    rejectionReason: string | null;
    isPaidPartner: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId?: string | null;
  }): PartnerAdminDto {
    return {
      ...this.toPublicDto(p),
      active: p.active,
      approvedAt: p.approvedAt?.toISOString() ?? undefined,
      activatedAt: p.activatedAt?.toISOString() ?? undefined,
      canResendConfirmation: !!p.userId && !p.activatedAt,
      rejectionReason: p.rejectionReason ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toServiceDto(s: {
    id: string;
    partnerId: string;
    name: string;
    description: string | null;
    priceDisplay: string | null;
    imageUrl: string | null;
    active: boolean;
    validUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PartnerServiceResponseDto {
    return {
      id: s.id,
      partnerId: s.partnerId,
      name: s.name,
      description: s.description ?? undefined,
      priceDisplay: s.priceDisplay ?? undefined,
      imageUrl: s.imageUrl ?? undefined,
      active: s.active,
      validUntil: s.validUntil?.toISOString() ?? undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private toCouponDto(c: {
    id: string;
    partnerId: string;
    code: string;
    title: string | null;
    description: string | null;
    discountType: string;
    discountValue: unknown;
    validFrom: Date;
    validUntil: Date | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PartnerCouponResponseDto {
    const value = typeof c.discountValue === 'object' && c.discountValue != null && 'toNumber' in c.discountValue
      ? (c.discountValue as { toNumber(): number }).toNumber()
      : Number(c.discountValue);
    return {
      id: c.id,
      partnerId: c.partnerId,
      code: c.code,
      title: c.title ?? undefined,
      description: c.description ?? undefined,
      discountType: c.discountType,
      discountValue: value,
      validFrom: c.validFrom.toISOString(),
      validUntil: c.validUntil?.toISOString() ?? undefined,
      active: c.active,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private toMeDto(p: {
    id: string;
    type: string;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    galleryUrls: string | null;
    active: boolean;
    approvedAt: Date | null;
    isPaidPartner: boolean;
    subscriptionStatus: string | null;
    planId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PartnerMeDto {
    let galleryUrls: string[] | undefined;
    if (p.galleryUrls) {
      try {
        const parsed = JSON.parse(p.galleryUrls) as unknown;
        galleryUrls = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : undefined;
      } catch {
        galleryUrls = undefined;
      }
    }
    return {
      id: p.id,
      type: p.type,
      name: p.name,
      slug: p.slug,
      city: p.city ?? undefined,
      description: p.description ?? undefined,
      website: p.website ?? undefined,
      logoUrl: p.logoUrl ?? undefined,
      phone: p.phone ?? undefined,
      email: p.email ?? undefined,
      address: p.address ?? undefined,
      galleryUrls,
      active: p.active,
      approvedAt: p.approvedAt?.toISOString() ?? undefined,
      isPaidPartner: p.isPaidPartner,
      subscriptionStatus: p.subscriptionStatus ?? undefined,
      planId: p.planId ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
