import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import { computeMatchScore } from '../match-engine/compute-match-score';
import type { AdopterProfile } from '../match-engine/match-engine.types';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { MeResponseDto } from './dto/me-response.dto';
import type { PreferencesResponseDto } from './dto/preferences-response.dto';

const ADOPTER_SELECT = {
  housingType: true,
  hasYard: true,
  hasOtherPets: true,
  hasChildren: true,
  timeAtHome: true,
  petsAllowedAtHome: true,
  dogExperience: true,
  catExperience: true,
  householdAgreesToAdoption: true,
  activityLevel: true,
  preferredPetAge: true,
  commitsToVetCare: true,
  walkFrequency: true,
  monthlyBudgetForPet: true,
} as const;

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
        include: {
          preferences: true,
          partner: true,
          partnerMemberships: { include: { partner: { select: { id: true, name: true, slug: true } } } },
        },
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

  /** Campos do perfil usados no match score; devem estar preenchidos quando o usuário edita o perfil para adoção. */
  private static readonly MATCH_PROFILE_KEYS: (keyof UpdateMeDto)[] = [
    'housingType',
    'hasYard',
    'hasOtherPets',
    'hasChildren',
    'timeAtHome',
    'petsAllowedAtHome',
    'dogExperience',
    'catExperience',
    'householdAgreesToAdoption',
    'activityLevel',
    'preferredPetAge',
    'commitsToVetCare',
    'walkFrequency',
    'monthlyBudgetForPet',
  ];

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
    const matchFieldsSent = MeService.MATCH_PROFILE_KEYS.some((k) => dto[k] !== undefined);
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
          ...(dto.petsAllowedAtHome !== undefined && { petsAllowedAtHome: dto.petsAllowedAtHome || null }),
          ...(dto.dogExperience !== undefined && { dogExperience: dto.dogExperience || null }),
          ...(dto.catExperience !== undefined && { catExperience: dto.catExperience || null }),
          ...(dto.householdAgreesToAdoption !== undefined && { householdAgreesToAdoption: dto.householdAgreesToAdoption || null }),
          ...(dto.whyAdopt !== undefined && { whyAdopt: dto.whyAdopt?.trim() || null }),
          ...(dto.activityLevel !== undefined && { activityLevel: dto.activityLevel || null }),
          ...(dto.preferredPetAge !== undefined && { preferredPetAge: dto.preferredPetAge || null }),
          ...(dto.commitsToVetCare !== undefined && { commitsToVetCare: dto.commitsToVetCare || null }),
          ...(dto.walkFrequency !== undefined && { walkFrequency: dto.walkFrequency || null }),
          ...(dto.monthlyBudgetForPet !== undefined && { monthlyBudgetForPet: dto.monthlyBudgetForPet || null }),
          ...(dto.username !== undefined && { username: dto.username || null }),
        },
        include: { preferences: true },
      }),
      this.verificationService.isUserVerified(userId),
    ]);
    if (matchFieldsSent) {
      const missing: string[] = [];
      const u = user as Record<string, unknown>;
      for (const k of MeService.MATCH_PROFILE_KEYS) {
        const v = u[k];
        if (k === 'hasYard' || k === 'hasOtherPets' || k === 'hasChildren') {
          if (v === undefined || v === null) missing.push(k);
        } else {
          if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) missing.push(k);
        }
      }
      if (missing.length > 0) {
        throw new BadRequestException(
          'Para o match score funcionar corretamente, preencha todos os campos do perfil para adoção: ' +
            missing.join(', ') +
            '.',
        );
      }
    }
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

  /** Lista de pets que o usuário foi indicado como adotante e ainda não confirmou (para tela "Confirmar adoção"). */
  async getPendingAdoptionConfirmations(userId: string): Promise<{
    items: Array<{
      petId: string;
      petName: string;
      tutorName: string;
      photos: string[];
      species: string;
      breed?: string;
      age: number;
      vaccinated: boolean;
      neutered: boolean;
      verified: boolean;
      partner?: { isPaidPartner?: boolean };
    }>;
  }> {
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'ADOPTED',
        pendingAdopterId: userId,
        adopterConfirmedAt: null,
        adoptionRejectedAt: null,
      },
      include: {
        owner: { select: { name: true } },
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { isPaidPartner: true } },
      },
    });
    const petIds = pets.map((p) => p.id);
    const verifiedIds = petIds.length > 0 ? await this.verificationService.getVerifiedPetIds(petIds) : new Set<string>();
    return {
      items: pets.map((p) => ({
        petId: p.id,
        petName: p.name,
        tutorName: p.owner.name,
        photos: (p.media ?? []).map((m) => m.url),
        species: p.species,
        breed: p.breed ?? undefined,
        age: p.age,
        vaccinated: p.vaccinated,
        neutered: p.neutered,
        verified: verifiedIds.has(p.id),
        partner: p.partner ? { isPaidPartner: p.partner.isPaidPartner ?? false } : undefined,
      })),
    };
  }

  async getMyAdoptions(userId: string, species?: 'BOTH' | 'DOG' | 'CAT'): Promise<{
    items: Array<{
      adoptionId: string;
      petId: string;
      petName: string;
      species: string;
      photos: string[];
      adoptedAt: string;
      tutorName: string;
      confirmedByAdopet: boolean;
      adoptionRejectedAt?: string;
      vaccinated?: boolean;
      neutered?: boolean;
      partner?: { isPaidPartner?: boolean };
      matchScore?: number | null;
    }>;
  }> {
    const [adoptions, adopterProfile, prefs] = await Promise.all([
      this.prisma.adoption.findMany({
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
              partner: { select: { isPaidPartner: true } },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: ADOPTER_SELECT,
      }),
      this.prisma.userPreferences.findUnique({
        where: { userId },
        select: { sizePref: true, species: true, sexPref: true },
      }),
    ]);
    const profileForMatch = adopterProfile ? { ...adopterProfile, sizePref: prefs?.sizePref ?? undefined, speciesPref: prefs?.species ?? undefined, sexPref: prefs?.sexPref ?? undefined } as AdopterProfile : null;
    const items = adoptions.map((a) => {
      const pet = a.pet as { adoptionRejectedAt?: Date | null; adopetConfirmedAt?: Date | null };
      const partner = a.pet.partner as { isPaidPartner?: boolean } | null;
      let matchScore: number | null | undefined;
      if (profileForMatch && a.pet) {
        const matchResult = computeMatchScore(profileForMatch, a.pet);
        matchScore = matchResult.score;
      }
      return {
        adoptionId: a.id,
        petId: a.petId,
        petName: a.pet.name,
        species: a.pet.species.toLowerCase(),
        photos: (a.pet.media ?? []).map((m) => m.url),
        adoptedAt: a.adoptedAt.toISOString(),
        tutorName: a.tutor.name,
        confirmedByAdopet: !pet.adoptionRejectedAt && !!pet.adopetConfirmedAt,
        ...(pet.adoptionRejectedAt && { adoptionRejectedAt: pet.adoptionRejectedAt.toISOString() }),
        vaccinated: a.pet.vaccinated,
        neutered: a.pet.neutered,
        ...(partner != null && { partner: { isPaidPartner: partner.isPaidPartner } }),
        ...(matchScore != null && { matchScore }),
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
        notifyListingReminders: true,
      };
    }
    return {
      species: prefs.species as 'DOG' | 'CAT' | 'BOTH',
      radiusKm: prefs.radiusKm,
      sizePref: prefs.sizePref ?? undefined,
      sexPref: prefs.sexPref ?? undefined,
      latitude: prefs.latitude ?? undefined,
      longitude: prefs.longitude ?? undefined,
      notifyNewPets: prefs.notifyNewPets,
      notifyMessages: prefs.notifyMessages,
      notifyReminders: prefs.notifyReminders,
      notifyListingReminders: prefs.notifyListingReminders,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<PreferencesResponseDto> {
    const matchPrefsSent = dto.species !== undefined || dto.sizePref !== undefined || dto.sexPref !== undefined;
    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        species: dto.species ?? 'BOTH',
        radiusKm: dto.radiusKm ?? 50,
        sizePref: dto.sizePref ?? undefined,
        sexPref: dto.sexPref ?? undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        notifyNewPets: dto.notifyNewPets ?? true,
        notifyMessages: dto.notifyMessages ?? true,
        notifyReminders: dto.notifyReminders ?? true,
        notifyListingReminders: dto.notifyListingReminders ?? true,
      },
      update: {
        ...(dto.species !== undefined && { species: dto.species }),
        ...(dto.radiusKm !== undefined && { radiusKm: dto.radiusKm }),
        ...(dto.sizePref !== undefined && { sizePref: dto.sizePref }),
        ...(dto.sexPref !== undefined && { sexPref: dto.sexPref }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.notifyNewPets !== undefined && { notifyNewPets: dto.notifyNewPets }),
        ...(dto.notifyMessages !== undefined && { notifyMessages: dto.notifyMessages }),
        ...(dto.notifyReminders !== undefined && { notifyReminders: dto.notifyReminders }),
        ...(dto.notifyListingReminders !== undefined && { notifyListingReminders: dto.notifyListingReminders }),
      },
    });
    if (matchPrefsSent) {
      const hasSpecies = prefs.species != null && prefs.species !== '';
      const hasSizePref = prefs.sizePref != null && prefs.sizePref !== '';
      const hasSexPref = prefs.sexPref != null && prefs.sexPref !== '';
      if (!hasSpecies || !hasSizePref || !hasSexPref) {
        const missing: string[] = [];
        if (!hasSpecies) missing.push('espécie preferida (cachorro/gato/ambos)');
        if (!hasSizePref) missing.push('porte preferido');
        if (!hasSexPref) missing.push('sexo preferido do pet');
        throw new BadRequestException(
          'Para o match score funcionar corretamente, preencha as preferências: ' + missing.join(', ') + '.',
        );
      }
    }
    return {
      species: prefs.species,
      radiusKm: prefs.radiusKm,
      sizePref: prefs.sizePref ?? undefined,
      sexPref: prefs.sexPref ?? undefined,
      latitude: prefs.latitude ?? undefined,
      longitude: prefs.longitude ?? undefined,
      notifyNewPets: prefs.notifyNewPets,
      notifyMessages: prefs.notifyMessages,
      notifyReminders: prefs.notifyReminders,
      notifyListingReminders: prefs.notifyListingReminders,
    };
  }

  async updatePushToken(userId: string, pushToken: string | null): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
    return { message: 'OK' };
  }

  /**
   * Desativa a conta e exclui/anonimiza dados pessoais (LGPD – direito à eliminação).
   * - Remove tokens, preferências, buscas salvas, favoritos e swipes.
   * - Desvincula parceiro do usuário.
   * - Anonimiza conteúdo de mensagens enviadas pelo usuário.
   * - Anonimiza o registro do usuário (mantém id para integridade referencial).
   */
  async deactivate(userId: string): Promise<{ message: string }> {
    const now = new Date();
    const deletedEmail = `deleted-${userId}@deleted.adopet.local`;

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.userPreferences.deleteMany({ where: { userId } });
      await tx.savedSearch.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.swipe.deleteMany({ where: { userId } });
      await tx.message.updateMany({
        where: { senderId: userId },
        data: { content: '', imageUrl: null },
      });
      await tx.partner.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          deactivatedAt: now,
          pushToken: null,
          email: deletedEmail,
          name: 'Usuário excluído',
          username: null,
          phone: null,
          avatarUrl: null,
          city: null,
          bio: null,
          housingType: null,
          hasYard: null,
          hasOtherPets: null,
          hasChildren: null,
          timeAtHome: null,
          passwordHash: null,
        },
      });
    });

    return { message: 'Conta desativada e dados pessoais excluídos ou anonimizados.' };
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
      petsAllowedAtHome?: string | null;
      dogExperience?: string | null;
      catExperience?: string | null;
      householdAgreesToAdoption?: string | null;
      whyAdopt?: string | null;
      activityLevel?: string | null;
      preferredPetAge?: string | null;
      commitsToVetCare?: string | null;
      walkFrequency?: string | null;
      monthlyBudgetForPet?: string | null;
      createdAt: Date;
    },
    verified?: boolean,
    isAdmin?: boolean,
  ): MeResponseDto {
    const u = user as typeof user & {
      partner?: { id: string; name: string; slug: string; type: string; subscriptionStatus: string | null; planId: string | null; isPaidPartner: boolean } | null;
      partnerMemberships?: Array<{ partner: { id: string; name: string; slug: string } }>;
    };
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
      petsAllowedAtHome: user.petsAllowedAtHome ?? undefined,
      dogExperience: user.dogExperience ?? undefined,
      catExperience: user.catExperience ?? undefined,
      householdAgreesToAdoption: user.householdAgreesToAdoption ?? undefined,
      whyAdopt: user.whyAdopt ?? undefined,
      activityLevel: user.activityLevel ?? undefined,
      preferredPetAge: user.preferredPetAge ?? undefined,
      commitsToVetCare: user.commitsToVetCare ?? undefined,
      walkFrequency: user.walkFrequency ?? undefined,
      monthlyBudgetForPet: user.monthlyBudgetForPet ?? undefined,
      verified,
      isAdmin,
      partner: u.partner
        ? {
            id: u.partner.id,
            name: u.partner.name,
            slug: u.partner.slug,
            type: u.partner.type ?? 'STORE',
            subscriptionStatus: u.partner.subscriptionStatus ?? undefined,
            planId: u.partner.planId ?? undefined,
            isPaidPartner: !!u.partner.isPaidPartner,
          }
        : undefined,
      partnerMemberships: u.partnerMemberships?.map((m) => ({
        partnerId: m.partner.id,
        partnerName: m.partner.name,
        partnerSlug: m.partner.slug,
      })),
    };
  }
}
