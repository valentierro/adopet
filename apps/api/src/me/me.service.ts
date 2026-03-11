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
import { KycExtractionService } from '../kyc-extraction/kyc-extraction.service';
import { InAppNotificationsService, IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { getKycCancellationReasonLabel } from './dto/cancel-kyc.dto';

/** Campos de preferência usados no match score; preenchimento = melhor cálculo de compatibilidade */
const PREFERENCE_MATCH_FIELDS = [
  { key: 'species' as const, label: 'Espécie' },
  { key: 'sizePref' as const, label: 'Tamanho preferido' },
  { key: 'sexPref' as const, label: 'Sexo preferido do pet' },
  { key: 'neuteredPref' as const, label: 'Preferência de castração' },
];

/** Campos considerados para conclusão do perfil (todas as seções exceto "Por que quer adotar"). */
const PROFILE_COMPLETION_FIELDS: { key: string; label: string; source: 'user' | 'prefs' }[] = [
  { key: 'avatarUrl', label: 'Foto de perfil', source: 'user' },
  { key: 'name', label: 'Nome', source: 'user' },
  { key: 'username', label: 'Nome de usuário', source: 'user' },
  { key: 'phone', label: 'Telefone', source: 'user' },
  { key: 'city', label: 'Cidade', source: 'user' },
  { key: 'birthDate', label: 'Data de nascimento', source: 'user' },
  { key: 'bio', label: 'Sobre você', source: 'user' },
  { key: 'housingType', label: 'Tipo de moradia', source: 'user' },
  { key: 'hasYard', label: 'Tem quintal', source: 'user' },
  { key: 'hasOtherPets', label: 'Tem outros pets', source: 'user' },
  { key: 'hasChildren', label: 'Tem crianças', source: 'user' },
  { key: 'timeAtHome', label: 'Tempo em casa', source: 'user' },
  { key: 'petsAllowedAtHome', label: 'Pets permitidos no local', source: 'user' },
  { key: 'dogExperience', label: 'Experiência com cachorro', source: 'user' },
  { key: 'catExperience', label: 'Experiência com gato', source: 'user' },
  { key: 'householdAgreesToAdoption', label: 'Todos concordam com a adoção', source: 'user' },
  { key: 'activityLevel', label: 'Nível de atividade', source: 'user' },
  { key: 'preferredPetAge', label: 'Idade preferida do pet', source: 'user' },
  { key: 'commitsToVetCare', label: 'Compromisso com cuidados veterinários', source: 'user' },
  { key: 'walkFrequency', label: 'Frequência de passeios', source: 'user' },
  { key: 'monthlyBudgetForPet', label: 'Orçamento mensal para o pet', source: 'user' },
  { key: 'species', label: 'Espécie', source: 'prefs' },
  { key: 'sizePref', label: 'Tamanho preferido', source: 'prefs' },
  { key: 'sexPref', label: 'Sexo preferido do pet', source: 'prefs' },
  { key: 'neuteredPref', label: 'Preferência de castração', source: 'prefs' },
];

type ProfileCompletionUser = {
  avatarUrl?: string | null;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  city?: string | null;
  birthDate?: Date | null;
  bio?: string | null;
  housingType?: string | null;
  hasYard?: boolean | null;
  hasOtherPets?: boolean | null;
  hasChildren?: boolean | null;
  timeAtHome?: string | null;
  petsAllowedAtHome?: string | null;
  dogExperience?: string | null;
  catExperience?: string | null;
  householdAgreesToAdoption?: string | null;
  activityLevel?: string | null;
  preferredPetAge?: string | null;
  commitsToVetCare?: string | null;
  walkFrequency?: string | null;
  monthlyBudgetForPet?: string | null;
};
type ProfileCompletionPrefs = {
  species?: string | null;
  sizePref?: string | null;
  sexPref?: string | null;
  neuteredPref?: string | null;
};

function isProfileFieldFilled(
  key: string,
  user: ProfileCompletionUser,
  prefs: ProfileCompletionPrefs,
): boolean {
  const isStrFilled = (v: string | null | undefined) => v != null && String(v).trim() !== '';
  const isDateFilled = (v: Date | null | undefined) => v != null;
  const isBoolFilled = (v: boolean | null | undefined) => v !== undefined && v !== null;
  if (PROFILE_COMPLETION_FIELDS.find((f) => f.key === key)?.source === 'prefs') {
    return isStrFilled((prefs as Record<string, unknown>)[key] as string);
  }
  const u = user as Record<string, unknown>;
  const val = u[key];
  if (key === 'avatarUrl' || key === 'name' || key === 'username' || key === 'phone' || key === 'city' || key === 'bio' || key === 'housingType' || key === 'timeAtHome' || key === 'petsAllowedAtHome' || key === 'dogExperience' || key === 'catExperience' || key === 'householdAgreesToAdoption' || key === 'activityLevel' || key === 'preferredPetAge' || key === 'commitsToVetCare' || key === 'walkFrequency' || key === 'monthlyBudgetForPet')
    return isStrFilled(val as string);
  if (key === 'birthDate') return isDateFilled(val as Date);
  if (key === 'hasYard' || key === 'hasOtherPets' || key === 'hasChildren') return isBoolFilled(val as boolean);
  return false;
}

/** Conclusão do perfil: todas as seções exceto "Por que quer adotar". */
function getProfileCompletion(
  user: ProfileCompletionUser,
  prefs: ProfileCompletionPrefs,
): { completionPercent: number; missingFields: { key: string; label: string }[] } {
  const missingFields = PROFILE_COMPLETION_FIELDS.filter((f) => !isProfileFieldFilled(f.key, user, prefs));
  const total = PROFILE_COMPLETION_FIELDS.length;
  const filled = total - missingFields.length;
  const completionPercent = total === 0 ? 100 : Math.round((filled / total) * 100);
  return {
    completionPercent,
    missingFields: missingFields.map((f) => ({ key: f.key, label: f.label })),
  };
}

/** Normaliza RG para armazenamento: dígitos + até uma letra no final. Retorna null se vazio. */
function normalizeRgOptional(value: string | undefined): string | null {
  const s = String(value ?? '').replace(/\s/g, '').toUpperCase().trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  const trailingLetter = s.match(/([A-Z])$/)?.[1] ?? '';
  const out = (digits + trailingLetter).slice(0, 20);
  return out || null;
}

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
    private readonly kycExtractionService: KycExtractionService,
    private readonly inAppNotifications: InAppNotificationsService,
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

  /** Retorna o status KYC do usuário (para uso em GET /me/kyc-status). Inclui kycExtractionStatus para o app exibir feedback pós-envio (aprovado automaticamente vs. análise manual). */
  async getKycStatus(userId: string): Promise<{
    kycStatus: string | null;
    kycSubmittedAt: string | null;
    kycVerifiedAt: string | null;
    kycRejectedAt: string | null;
    kycRejectionReason: string | null;
    kycExtractionStatus: string | null;
    kycDecidedBy: string | null;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        kycStatus: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycRejectedAt: true,
        kycRejectionReason: true,
        kycExtractionStatus: true,
        kycDecidedBy: true,
      },
    });
    return {
      kycStatus: user.kycStatus ?? null,
      kycSubmittedAt: user.kycSubmittedAt?.toISOString() ?? null,
      kycVerifiedAt: user.kycVerifiedAt?.toISOString() ?? null,
      kycRejectedAt: user.kycRejectedAt?.toISOString() ?? null,
      kycRejectionReason: user.kycRejectionReason ?? null,
      kycExtractionStatus: user.kycExtractionStatus ?? null,
      kycDecidedBy: user.kycDecidedBy ?? null,
    };
  }

  /** Envia documento e selfie para análise KYC. Só permite quando status é null ou REJECTED. Exige consentimento explícito. documentVersoKey opcional (verso do RG). */
  async submitKyc(
    userId: string,
    selfieWithDocKey: string,
    consentGiven: boolean,
    documentVersoKey?: string,
  ): Promise<{ kycStatus: string; kycSubmittedAt: string }> {
    if (!consentGiven) {
      throw new BadRequestException(
        'É necessário aceitar que as fotos serão usadas apenas para análise e excluídas após a decisão.',
      );
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (user.kycStatus === 'VERIFIED') {
      throw new BadRequestException('Sua identidade já foi verificada.');
    }
    if (user.kycStatus === 'PENDING') {
      throw new BadRequestException('Você já possui uma verificação em análise. Aguarde o resultado.');
    }
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycDocumentKey: null,
        kycSelfieKey: selfieWithDocKey,
        kycDocumentVersoKey: documentVersoKey?.trim() || null,
        kycSubmittedAt: now,
        kycVerifiedAt: null,
        kycRejectedAt: null,
        kycRejectionReason: null,
        kycConsentAt: now,
        kycExtractionStatus: 'PENDING',
        kycExtractedBirthDate: null,
        kycExtractedName: null,
        kycExtractedCpf: null,
        kycExtractedDocNumber: null,
        kycExtractionRunAt: null,
        kycFraudSignal: null,
      },
    });
    // Extração OCR em background (Tesseract): data de nascimento no documento para conferência com cadastro
    this.kycExtractionService.runExtraction(userId).catch((e) => {
      console.warn('[MeService] KYC extraction failed for user', userId, e);
    });
    return { kycStatus: 'PENDING', kycSubmittedAt: now.toISOString() };
  }

  /**
   * Cancela a solicitação de KYC em análise (PENDING). Zera status e documentos, grava motivo e notifica admins.
   * O usuário deixa de aparecer na lista de verificações pendentes do admin.
   */
  async cancelKyc(userId: string, cancellationReason: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { kycStatus: true, name: true },
    });
    if (user.kycStatus !== 'PENDING') {
      throw new BadRequestException(
        'Só é possível cancelar uma solicitação que está em análise. Se já foi aprovada ou rejeitada, não há cancelamento.',
      );
    }
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: null,
        kycSubmittedAt: null,
        kycDocumentKey: null,
        kycSelfieKey: null,
        kycDocumentVersoKey: null,
        kycExtractionStatus: null,
        kycExtractedBirthDate: null,
        kycExtractedName: null,
        kycExtractedCpf: null,
        kycExtractedDocNumber: null,
        kycExtractionRunAt: null,
        kycFraudSignal: null,
        kycDecidedBy: null,
        kycCancelledAt: now,
        kycCancellationReason: cancellationReason,
      },
    });
    const reasonLabel = getKycCancellationReasonLabel(cancellationReason);
    const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (adminIds.length > 0) {
      const title = 'KYC cancelado pelo usuário';
      const body = `${user.name} cancelou a solicitação de verificação. Motivo: ${reasonLabel}.`;
      const pushData = { screen: 'adminPendingKyc', type: IN_APP_NOTIFICATION_TYPES.KYC_CANCELLED_BY_USER };
      for (const adminId of adminIds) {
        this.inAppNotifications
          .create(adminId, IN_APP_NOTIFICATION_TYPES.KYC_CANCELLED_BY_USER, title, body, { userId }, pushData)
          .catch(() => {});
      }
    }
    return { message: 'Solicitação de verificação cancelada. Você pode enviar novamente quando quiser.' };
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
    const [existing, isPartnerUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true, phone: true, city: true, missionProfileCompleteAt: true },
      }),
      this.prisma.partner.findFirst({ where: { userId }, select: { id: true } }).then((p) => !!p),
    ]);
    const nextAvatar = dto.avatarUrl !== undefined ? dto.avatarUrl : existing?.avatarUrl;
    const nextPhone = dto.phone !== undefined ? dto.phone : existing?.phone;
    const nextCity = dto.city !== undefined ? dto.city : existing?.city;
    const profileComplete =
      !!nextAvatar?.trim() && !!nextPhone?.trim() && !!nextCity?.trim() && !existing?.missionProfileCompleteAt;
    const [user, verified] = await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.birthDate !== undefined && {
            birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          }),
          ...(dto.rg !== undefined && {
            rg: normalizeRgOptional(dto.rg),
          }),
          ...(profileComplete && { missionProfileCompleteAt: new Date() }),
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
    // Parceiros (ONG/comercial) não precisam preencher campos de match score para adoção
    if (matchFieldsSent && !isPartnerUser) {
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

  async getMyAdoptions(
    userId: string,
    species?: 'BOTH' | 'DOG' | 'CAT',
    role?: 'ADOPTER' | 'TUTOR',
  ): Promise<{
    items: Array<{
      adoptionId: string;
      petId: string;
      petName: string;
      species: string;
      photos: string[];
      adoptedAt: string;
      tutorName: string;
      adopterName?: string;
      confirmedByAdopet: boolean;
      adoptionRejectedAt?: string;
      surveySubmitted?: boolean;
      surveyOverallScore?: number;
      vaccinated?: boolean;
      neutered?: boolean;
      partner?: { isPaidPartner?: boolean };
      matchScore?: number | null;
    }>;
  }> {
    const roleFilter =
      role === 'TUTOR' ? { tutorId: userId } : role === 'ADOPTER' ? { adopterId: userId } : { OR: [{ adopterId: userId }, { tutorId: userId }] };
    const [adoptions, adopterProfile, prefs] = await Promise.all([
      this.prisma.adoption.findMany({
        where: {
          ...roleFilter,
          ...(species && species !== 'BOTH' && { pet: { species: species.toUpperCase() } }),
        },
        orderBy: { adoptedAt: 'desc' },
        include: {
          tutor: { select: { name: true } },
          adopter: { select: { name: true } },
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
        select: { sizePref: true, species: true, sexPref: true, neuteredPref: true },
      }),
    ]);
    const adoptionIds = adoptions.map((a) => a.id);
    const surveysWhere: { userId: string; adoptionId: { in: string[] }; role?: 'ADOPTER' | 'TUTOR' } = { userId, adoptionId: { in: adoptionIds } };
    if (role) surveysWhere.role = role;
    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where: surveysWhere,
      select: { adoptionId: true, overallScore: true },
    });
    const surveyByAdoption = new Map(surveys.map((s) => [s.adoptionId, s]));

    const profileForMatch = adopterProfile ? { ...adopterProfile, sizePref: prefs?.sizePref ?? undefined, speciesPref: prefs?.species ?? undefined, sexPref: prefs?.sexPref ?? undefined, preferredPetNeutered: prefs?.neuteredPref ?? undefined } as AdopterProfile : null;
    const items = adoptions.map((a) => {
      const isAdopter = a.adopterId === userId;
      const pet = a.pet as { adoptionRejectedAt?: Date | null; adopetConfirmedAt?: Date | null };
      const partner = a.pet.partner as { isPaidPartner?: boolean } | null;
      let matchScore: number | null | undefined;
      if (isAdopter && profileForMatch && a.pet) {
        const matchResult = computeMatchScore(profileForMatch, a.pet);
        matchScore = matchResult.score;
      }
      const survey = surveyByAdoption.get(a.id);
      return {
        adoptionId: a.id,
        petId: a.petId,
        petName: a.pet.name,
        species: a.pet.species.toLowerCase(),
        photos: (a.pet.media ?? []).map((m) => m.url),
        adoptedAt: a.adoptedAt.toISOString(),
        tutorName: a.tutor.name,
        ...(isAdopter ? {} : { adopterName: a.adopter.name }),
        confirmedByAdopet: !pet.adoptionRejectedAt && !!pet.adopetConfirmedAt,
        ...(pet.adoptionRejectedAt && { adoptionRejectedAt: pet.adoptionRejectedAt.toISOString() }),
        surveySubmitted: !!survey,
        ...(survey && { surveyOverallScore: survey.overallScore }),
        vaccinated: a.pet.vaccinated,
        neutered: a.pet.neutered,
        ...(partner != null && { partner: { isPaidPartner: partner.isPaidPartner } }),
        ...(matchScore != null && { matchScore }),
      };
    });
    return { items };
  }

  async getPreferences(userId: string): Promise<PreferencesResponseDto> {
    const [user, prefs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          avatarUrl: true,
          name: true,
          username: true,
          phone: true,
          city: true,
          birthDate: true,
          bio: true,
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
        },
      }),
      this.prisma.userPreferences.findUnique({
        where: { userId },
      }),
    ]);
    const prefsData = prefs
      ? {
          species: prefs.species as 'DOG' | 'CAT' | 'BOTH',
          radiusKm: prefs.radiusKm,
          sizePref: prefs.sizePref ?? undefined,
          sexPref: prefs.sexPref ?? undefined,
          neuteredPref: prefs.neuteredPref ?? undefined,
          latitude: prefs.latitude ?? undefined,
          longitude: prefs.longitude ?? undefined,
          notifyNewPets: prefs.notifyNewPets,
          notifyMessages: prefs.notifyMessages,
          notifyReminders: prefs.notifyReminders,
          notifyListingReminders: prefs.notifyListingReminders,
        }
      : {
          species: 'BOTH' as const,
          radiusKm: 50,
          notifyNewPets: true,
          notifyMessages: true,
          notifyReminders: true,
          notifyListingReminders: true,
          sizePref: undefined as string | undefined,
          sexPref: undefined as string | undefined,
          neuteredPref: undefined as string | undefined,
          latitude: undefined as number | undefined,
          longitude: undefined as number | undefined,
        };
    const prefsForCompletion: ProfileCompletionPrefs = prefs
      ? { species: prefs.species, sizePref: prefs.sizePref, sexPref: prefs.sexPref, neuteredPref: prefs.neuteredPref }
      : { species: 'BOTH' };
    const completion = getProfileCompletion(user ?? {}, prefsForCompletion);
    return {
      ...prefsData,
      completionPercent: completion.completionPercent,
      missingFields: completion.missingFields,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<PreferencesResponseDto> {
    const matchPrefsSent = dto.species !== undefined || dto.sizePref !== undefined || dto.sexPref !== undefined || dto.neuteredPref !== undefined;
    const userBefore = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { missionPreferencesCompleteAt: true },
    });
    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        species: dto.species ?? 'BOTH',
        radiusKm: dto.radiusKm ?? 300,
        sizePref: dto.sizePref ?? undefined,
        sexPref: dto.sexPref ?? undefined,
        neuteredPref: dto.neuteredPref ?? undefined,
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
        ...(dto.neuteredPref !== undefined && { neuteredPref: dto.neuteredPref }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.notifyNewPets !== undefined && { notifyNewPets: dto.notifyNewPets }),
        ...(dto.notifyMessages !== undefined && { notifyMessages: dto.notifyMessages }),
        ...(dto.notifyReminders !== undefined && { notifyReminders: dto.notifyReminders }),
        ...(dto.notifyListingReminders !== undefined && { notifyListingReminders: dto.notifyListingReminders }),
      },
    });
    if (!userBefore?.missionPreferencesCompleteAt) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { missionPreferencesCompleteAt: new Date() },
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarUrl: true,
        name: true,
        username: true,
        phone: true,
        city: true,
        birthDate: true,
        bio: true,
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
      },
    });
    const completion = getProfileCompletion(user ?? {}, {
      species: prefs.species,
      sizePref: prefs.sizePref,
      sexPref: prefs.sexPref,
      neuteredPref: prefs.neuteredPref,
    });
    return {
      species: prefs.species,
      radiusKm: prefs.radiusKm,
      sizePref: prefs.sizePref ?? undefined,
      sexPref: prefs.sexPref ?? undefined,
      neuteredPref: prefs.neuteredPref ?? undefined,
      latitude: prefs.latitude ?? undefined,
      longitude: prefs.longitude ?? undefined,
      notifyNewPets: prefs.notifyNewPets,
      notifyMessages: prefs.notifyMessages,
      notifyReminders: prefs.notifyReminders,
      notifyListingReminders: prefs.notifyListingReminders,
      completionPercent: completion.completionPercent,
      missingFields: completion.missingFields,
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
   * - Bloqueia se o usuário for dono de uma conta parceira (ONG): precisa transferir a administração antes.
   * - Remove tokens, preferências, buscas salvas, favoritos e swipes.
   * - Desvincula parceiro do usuário (quando não é dono).
   * - Anonimiza conteúdo de mensagens enviadas pelo usuário.
   * - Anonimiza o registro do usuário (mantém id para integridade referencial).
   */
  async deactivate(userId: string): Promise<{ message: string }> {
    const partnerAsOwner = await this.prisma.partner.findFirst({
      where: { userId },
      select: { id: true, name: true, type: true },
    });
    if (partnerAsOwner) {
      throw new BadRequestException(
        'Você é responsável por uma conta parceira (ONG). Transfira a administração no portal do parceiro ou entre em contato com o suporte antes de desativar sua conta.',
      );
    }

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
      kycStatus?: string | null;
      kycSubmittedAt?: Date | null;
      kycVerifiedAt?: Date | null;
      kycRejectedAt?: Date | null;
      kycRejectionReason?: string | null;
    },
    verified?: boolean,
    isAdmin?: boolean,
  ): MeResponseDto {
    const u = user as typeof user & {
      partner?: { id: string; name: string; slug: string; type: string; city: string | null; subscriptionStatus: string | null; planId: string | null; isPaidPartner: boolean } | null;
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
      birthDate: (user as { birthDate?: Date | null }).birthDate?.toISOString().slice(0, 10) ?? undefined,
      rg: (user as { rg?: string | null }).rg ?? undefined,
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
      kycStatus: user.kycStatus ?? undefined,
      kycSubmittedAt: user.kycSubmittedAt?.toISOString() ?? undefined,
      kycVerifiedAt: user.kycVerifiedAt?.toISOString() ?? undefined,
      kycRejectedAt: user.kycRejectedAt?.toISOString() ?? undefined,
      kycRejectionReason: user.kycRejectionReason ?? undefined,
      partner: u.partner
        ? {
            id: u.partner.id,
            name: u.partner.name,
            slug: u.partner.slug,
            type: u.partner.type ?? 'STORE',
            city: u.partner.city ?? undefined,
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
      isPartner: !!(u.partner || (u.partnerMemberships?.length ?? 0) > 0),
    };
  }
}
