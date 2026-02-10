import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly config: ConfigService,
  ) {}

  async getMe(userId: string): Promise<MeResponseDto> {
    const [user, verified] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { preferences: true, partner: true },
      }),
      this.verificationService.isUserVerified(userId),
    ]);
    const isAdmin = this.isAdminUserId(userId);
    return this.toMeDto(user, verified, isAdmin);
  }

  /** ADMIN_USER_IDS no .env deve estar entre aspas (ex.: "uuid-a,uuid-b") para não ser interpretado como expressão. */
  private isAdminUserId(userId: string): boolean {
    const raw = this.config.get<string>('ADMIN_USER_IDS');
    if (!raw || typeof raw !== 'string') return false;
    const adminIds = raw
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    return adminIds.includes(userId);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponseDto> {
    if (dto.username !== undefined) {
      const normalized = dto.username.trim().toLowerCase().replace(/^@/, '');
      if (normalized.length < 2) throw new BadRequestException('Nome de usuário deve ter pelo menos 2 caracteres.');
      const existing = await this.prisma.user.findFirst({
        where: { username: normalized, id: { not: userId }, deactivatedAt: null },
      });
      if (existing) throw new BadRequestException('Este nome de usuário já está em uso.');
      dto.username = normalized;
    }
    const [user, verified] = await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
          ...(dto.housingType !== undefined && { housingType: dto.housingType }),
          ...(dto.hasYard !== undefined && { hasYard: dto.hasYard }),
          ...(dto.hasOtherPets !== undefined && { hasOtherPets: dto.hasOtherPets }),
          ...(dto.hasChildren !== undefined && { hasChildren: dto.hasChildren }),
          ...(dto.timeAtHome !== undefined && { timeAtHome: dto.timeAtHome }),
          ...(dto.username !== undefined && { username: dto.username || null }),
        },
        include: { preferences: true },
      }),
      this.verificationService.isUserVerified(userId),
    ]);
    const isAdmin = this.isAdminUserId(userId);
    return this.toMeDto(user, verified, isAdmin);
  }

  async lookupByUsername(username: string): Promise<{ id: string; name: string; username: string } | null> {
    const normalized = username.trim().toLowerCase().replace(/^@/, '');
    if (normalized.length < 2) return null;
    const user = await this.prisma.user.findFirst({
      where: { username: normalized, deactivatedAt: null },
      select: { id: true, name: true, username: true },
    });
    if (!user?.username) return null;
    return { id: user.id, name: user.name, username: user.username };
  }

  async getMyAdoptions(userId: string, species?: 'BOTH' | 'DOG' | 'CAT'): Promise<{ items: Array<{ adoptionId: string; petId: string; petName: string; species: string; photos: string[]; adoptedAt: string; tutorName: string; confirmedByAdopet: boolean; adoptionRejectedAt?: string }> }> {
    const adoptions = await this.prisma.adoption.findMany({
      where: {
        adopterId: userId,
        ...(species && species !== 'BOTH' && { pet: { species: species.toUpperCase() } }),
      },
      orderBy: { adoptedAt: 'desc' },
      include: {
        tutor: { select: { name: true } },
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
          },
        },
      },
    });
    const items = adoptions.map((a) => {
      const pet = a.pet as { adoptionRejectedAt?: Date | null };
      return {
        adoptionId: a.id,
        petId: a.petId,
        petName: a.pet.name,
        species: a.pet.species.toLowerCase(),
        photos: (a.pet.media ?? []).map((m) => m.url),
        adoptedAt: a.adoptedAt.toISOString(),
        tutorName: a.tutor.name,
        confirmedByAdopet: !pet.adoptionRejectedAt,
        ...(pet.adoptionRejectedAt && { adoptionRejectedAt: pet.adoptionRejectedAt.toISOString() }),
      };
    });
    return { items };
  }

  async getPreferences(userId: string): Promise<PreferencesResponseDto> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return {
        species: 'BOTH',
        radiusKm: 50,
        notifyNewPets: true,
        notifyMessages: true,
        notifyReminders: true,
      };
    }
    return {
      species: prefs.species as 'DOG' | 'CAT' | 'BOTH',
      radiusKm: prefs.radiusKm,
      sizePref: prefs.sizePref ?? undefined,
      latitude: prefs.latitude ?? undefined,
      longitude: prefs.longitude ?? undefined,
      notifyNewPets: prefs.notifyNewPets,
      notifyMessages: prefs.notifyMessages,
      notifyReminders: prefs.notifyReminders,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<PreferencesResponseDto> {
    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        species: dto.species ?? 'BOTH',
        radiusKm: dto.radiusKm ?? 50,
        sizePref: dto.sizePref ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        notifyNewPets: dto.notifyNewPets ?? true,
        notifyMessages: dto.notifyMessages ?? true,
        notifyReminders: dto.notifyReminders ?? true,
      },
      update: {
        ...(dto.species !== undefined && { species: dto.species }),
        ...(dto.radiusKm !== undefined && { radiusKm: dto.radiusKm }),
        ...(dto.sizePref !== undefined && { sizePref: dto.sizePref }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.notifyNewPets !== undefined && { notifyNewPets: dto.notifyNewPets }),
        ...(dto.notifyMessages !== undefined && { notifyMessages: dto.notifyMessages }),
        ...(dto.notifyReminders !== undefined && { notifyReminders: dto.notifyReminders }),
      },
    });
    return {
      species: prefs.species,
      radiusKm: prefs.radiusKm,
      sizePref: prefs.sizePref ?? undefined,
      latitude: prefs.latitude ?? undefined,
      longitude: prefs.longitude ?? undefined,
      notifyNewPets: prefs.notifyNewPets,
      notifyMessages: prefs.notifyMessages,
      notifyReminders: prefs.notifyReminders,
    };
  }

  async updatePushToken(userId: string, pushToken: string | null): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
    return { message: 'OK' };
  }

  async deactivate(userId: string): Promise<{ message: string }> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { deactivatedAt: new Date(), pushToken: null },
      }),
    ]);
    return { message: 'Conta desativada. Entre em contato para reativar.' };
  }

  /**
   * Exportação dos dados do titular (portabilidade – LGPD art. 18 V).
   * Retorna dados pessoais e preferências em formato estruturado.
   */
  async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user, preferences, pets] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          city: true,
          bio: true,
          housingType: true,
          hasYard: true,
          hasOtherPets: true,
          hasChildren: true,
          timeAtHome: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
      this.prisma.pet.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, species: true, status: true, createdAt: true },
      }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      preferences: preferences
        ? {
            species: preferences.species,
            radiusKm: preferences.radiusKm,
            notifyNewPets: preferences.notifyNewPets,
            notifyMessages: preferences.notifyMessages,
            notifyReminders: preferences.notifyReminders,
          }
        : null,
      pets: pets.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  private toMeDto(
    user: {
      id: string;
      email: string;
      name: string;
      username: string | null;
      avatarUrl: string | null;
      phone: string | null;
      city: string | null;
      bio: string | null;
      housingType: string | null;
      hasYard: boolean | null;
      hasOtherPets: boolean | null;
      hasChildren: boolean | null;
      timeAtHome: string | null;
      createdAt: Date;
    },
    verified?: boolean,
    isAdmin?: boolean,
  ): MeResponseDto {
    const u = user as typeof user & { partner?: { id: string; name: string; slug: string; subscriptionStatus: string | null; planId: string | null; isPaidPartner: boolean } | null };
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      phone: user.phone ?? undefined,
      createdAt: user.createdAt.toISOString(),
      city: user.city ?? undefined,
      bio: user.bio ?? undefined,
      housingType: user.housingType ?? undefined,
      hasYard: user.hasYard ?? undefined,
      hasOtherPets: user.hasOtherPets ?? undefined,
      hasChildren: user.hasChildren ?? undefined,
      timeAtHome: user.timeAtHome ?? undefined,
      verified,
      isAdmin,
      partner: u.partner
        ? {
            id: u.partner.id,
            name: u.partner.name,
            slug: u.partner.slug,
            subscriptionStatus: u.partner.subscriptionStatus ?? undefined,
            planId: u.partner.planId ?? undefined,
            isPaidPartner: !!u.partner.isPaidPartner,
          }
        : undefined,
    };
  }
}
