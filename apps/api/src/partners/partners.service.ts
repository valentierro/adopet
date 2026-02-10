import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PartnerPublicDto, PartnerMeDto } from './dto/partner-response.dto';
import type { PartnerAdminDto } from './dto/partner-response.dto';
import type { CreatePartnerDto } from './dto/create-partner.dto';
import type { UpdatePartnerDto } from './dto/update-partner.dto';
import type { UpdateMyPartnerDto } from './dto/update-my-partner.dto';
import type { CreatePartnerCouponDto } from './dto/create-partner-coupon.dto';
import type { UpdatePartnerCouponDto } from './dto/update-partner-coupon.dto';
import type { PartnerCouponResponseDto } from './dto/partner-coupon-response.dto';

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

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Atualiza o parceiro do usuário (dados do estabelecimento no portal). Requer assinatura ativa. */
  async updateByUserId(userId: string, dto: UpdateMyPartnerDto): Promise<PartnerMeDto> {
    const existing = await this.prisma.partner.findUnique({
      where: { userId },
    });
    this.ensurePaidPartner(existing);
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

  /** Lista todos os parceiros (admin) */
  async findAllAdmin(): Promise<PartnerAdminDto[]> {
    const list = await this.prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
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
      },
    });
    return this.toAdminDto(partner);
  }

  /** Atualiza parceiro (admin). Se approve=true, define approvedAt. */
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
    if (dto.approve === true) data.approvedAt = new Date();
    if (dto.isPaidPartner !== undefined) data.isPaidPartner = dto.isPaidPartner;
    const partner = await this.prisma.partner.update({
      where: { id },
      data,
    });
    return this.toAdminDto(partner);
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
    isPaidPartner: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PartnerAdminDto {
    return {
      ...this.toPublicDto(p),
      active: p.active,
      approvedAt: p.approvedAt?.toISOString() ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
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
