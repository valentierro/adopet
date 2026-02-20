import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import { PushService } from '../notifications/push.service';
import { AdminService } from '../admin/admin.service';
import { SimilarPetsEngineService } from '../similar-pets-engine/similar-pets-engine.service';
import { MatchEngineService } from '../match-engine/match-engine.service';
import { PetViewService } from './pet-view.service';
import { reverseGeocode, forwardGeocode } from '../common/geocoding';
import type { PetResponseDto, SimilarPetItemDto } from './dto/pet-response.dto';
import type { CreatePetDto } from './dto/create-pet.dto';
import type { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly tutorStatsService: TutorStatsService,
    private readonly config: ConfigService,
    private readonly push: PushService,
    private readonly adminService: AdminService,
    private readonly similarPetsEngine: SimilarPetsEngineService,
    private readonly matchEngine: MatchEngineService,
    private readonly petViewService: PetViewService,
  ) {}

  private mapToDto(
    pet: {
      id: string;
      name: string;
      species: string;
      age: number;
      sex: string;
      size: string;
      vaccinated: boolean;
      neutered: boolean;
      description: string;
      ownerId: string;
      status: string;
      publicationStatus?: string | null;
      publicationRejectionReason?: string | null;
      expiresAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      latitude?: number | null;
      longitude?: number | null;
      city?: string | null;
      breed?: string | null;
      adoptionReason?: string | null;
      feedingType?: string | null;
      feedingNotes?: string | null;
      energyLevel?: string | null;
      healthNotes?: string | null;
      hasSpecialNeeds?: boolean | null;
      goodWithDogs?: string | null;
      goodWithCats?: string | null;
      goodWithChildren?: string | null;
      temperament?: string | null;
      isDocile?: boolean | null;
      isTrained?: boolean | null;
      preferredTutorHousingType?: string | null;
      preferredTutorHasYard?: string | null;
      preferredTutorHasOtherPets?: string | null;
      preferredTutorHasChildren?: string | null;
      preferredTutorTimeAtHome?: string | null;
      preferredTutorPetsAllowedAtHome?: string | null;
      preferredTutorDogExperience?: string | null;
      preferredTutorCatExperience?: string | null;
      preferredTutorHouseholdAgrees?: string | null;
      preferredTutorWalkFrequency?: string | null;
      hasOngoingCosts?: boolean | null;
      adoptionRejectedAt?: Date | null;
      adoptionRejectionReason?: string | null;
      media: { id: string; url: string; sortOrder?: number }[];
      partner?: { id: string; name: string; slug: string; logoUrl: string | null; type?: string } | null;
    },
    userLat?: number,
    userLng?: number,
    verified?: boolean,
  ): PetResponseDto {
    let distanceKm: number | undefined;
    if (userLat != null && userLng != null && pet.latitude != null && pet.longitude != null) {
      distanceKm = this.haversineKm(userLat, userLng, pet.latitude, pet.longitude);
    }
    const dto: PetResponseDto = {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      age: pet.age,
      sex: pet.sex,
      size: pet.size,
      vaccinated: pet.vaccinated,
      neutered: pet.neutered,
      description: pet.description,
      distanceKm,
      photos: (pet.media ?? []).map((m) => m.url),
      ownerId: pet.ownerId,
      status: pet.status,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
      verified,
    };
    if (pet.breed != null) dto.breed = pet.breed;
    if (pet.adoptionReason != null) dto.adoptionReason = pet.adoptionReason;
    if (pet.feedingType != null) dto.feedingType = pet.feedingType;
    if (pet.feedingNotes != null) dto.feedingNotes = pet.feedingNotes;
    if (pet.energyLevel != null) dto.energyLevel = pet.energyLevel;
    if (pet.healthNotes != null) dto.healthNotes = pet.healthNotes;
    if (pet.hasSpecialNeeds != null) dto.hasSpecialNeeds = pet.hasSpecialNeeds;
    if (pet.goodWithDogs != null) dto.goodWithDogs = pet.goodWithDogs;
    if (pet.goodWithCats != null) dto.goodWithCats = pet.goodWithCats;
    if (pet.goodWithChildren != null) dto.goodWithChildren = pet.goodWithChildren;
    if (pet.temperament != null) dto.temperament = pet.temperament;
    if (pet.isDocile != null) dto.isDocile = pet.isDocile;
    if (pet.isTrained != null) dto.isTrained = pet.isTrained;
    if (pet.preferredTutorHousingType != null) dto.preferredTutorHousingType = pet.preferredTutorHousingType;
    if (pet.preferredTutorHasYard != null) dto.preferredTutorHasYard = pet.preferredTutorHasYard;
    if (pet.preferredTutorHasOtherPets != null) dto.preferredTutorHasOtherPets = pet.preferredTutorHasOtherPets;
    if (pet.preferredTutorHasChildren != null) dto.preferredTutorHasChildren = pet.preferredTutorHasChildren;
    if (pet.preferredTutorTimeAtHome != null) dto.preferredTutorTimeAtHome = pet.preferredTutorTimeAtHome;
    if (pet.preferredTutorPetsAllowedAtHome != null) dto.preferredTutorPetsAllowedAtHome = pet.preferredTutorPetsAllowedAtHome;
    if (pet.preferredTutorDogExperience != null) dto.preferredTutorDogExperience = pet.preferredTutorDogExperience;
    if (pet.preferredTutorCatExperience != null) dto.preferredTutorCatExperience = pet.preferredTutorCatExperience;
    if (pet.preferredTutorHouseholdAgrees != null) dto.preferredTutorHouseholdAgrees = pet.preferredTutorHouseholdAgrees;
    if (pet.preferredTutorWalkFrequency != null) dto.preferredTutorWalkFrequency = pet.preferredTutorWalkFrequency;
    if (pet.hasOngoingCosts != null) dto.hasOngoingCosts = pet.hasOngoingCosts;
    if (pet.city != null) dto.city = pet.city;
    if (pet.publicationStatus != null) dto.publicationStatus = pet.publicationStatus;
    if (pet.publicationRejectionReason != null) dto.publicationRejectionReason = pet.publicationRejectionReason;
    if (pet.expiresAt != null) dto.expiresAt = pet.expiresAt.toISOString();
    if (pet.adoptionRejectedAt != null) dto.adoptionRejectedAt = pet.adoptionRejectedAt.toISOString();
    if (pet.adoptionRejectionReason != null) dto.adoptionRejectionReason = pet.adoptionRejectionReason;
    if (pet.partner != null) {
      const rawType = (pet.partner as { type?: string }).type;
      const typeNorm = rawType?.toUpperCase?.() || rawType;
      dto.partner = {
        id: pet.partner.id,
        name: pet.partner.name,
        slug: pet.partner.slug,
        logoUrl: pet.partner.logoUrl ?? undefined,
        isPaidPartner: (pet.partner as { isPaidPartner?: boolean }).isPaidPartner,
        type: typeNorm,
      };
    }
    return dto;
  }

  private mapOwnerToPublicDto(
    owner: {
      id: string;
      name: string;
      avatarUrl: string | null;
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
    },
    petsCount: number,
    verified?: boolean,
  ): NonNullable<PetResponseDto['owner']> {
    const dto: NonNullable<PetResponseDto['owner']> = {
      id: owner.id,
      name: owner.name,
      avatarUrl: owner.avatarUrl ?? undefined,
      petsCount,
    };
    if (verified === true) dto.verified = true;
    if (owner.city != null) dto.city = owner.city;
    if (owner.bio != null) dto.bio = owner.bio;
    if (owner.housingType != null) dto.housingType = owner.housingType;
    if (owner.hasYard != null) dto.hasYard = owner.hasYard;
    if (owner.hasOtherPets != null) dto.hasOtherPets = owner.hasOtherPets;
    if (owner.hasChildren != null) dto.hasChildren = owner.hasChildren;
    if (owner.timeAtHome != null) dto.timeAtHome = owner.timeAtHome;
    if (owner.petsAllowedAtHome != null) dto.petsAllowedAtHome = owner.petsAllowedAtHome;
    if (owner.dogExperience != null) dto.dogExperience = owner.dogExperience;
    if (owner.catExperience != null) dto.catExperience = owner.catExperience;
    if (owner.householdAgreesToAdoption != null) dto.householdAgreesToAdoption = owner.householdAgreesToAdoption;
    if (owner.whyAdopt != null) dto.whyAdopt = owner.whyAdopt;
    return dto;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  async findAll(): Promise<PetResponseDto[]> {
    const pets = await this.prisma.pet.findMany({
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const verifiedIds = await this.verificationService.getVerifiedPetIds(pets.map((p) => p.id));
    return pets.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
  }

  async findOne(id: string, userLat?: number, userLng?: number, userId?: string): Promise<PetResponseDto | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
        owner: {
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
            petsAllowedAtHome: true,
            dogExperience: true,
            catExperience: true,
            householdAgreesToAdoption: true,
            whyAdopt: true,
          },
        },
      },
    });
    if (!pet) return null;
    const [verified, petsCount, ownerVerified] = await Promise.all([
      this.verificationService.isPetVerified(pet.id),
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      pet.owner ? this.verificationService.isUserVerified(pet.owner.id) : Promise.resolve(false),
    ]);
    const dto = this.mapToDto(pet, userLat, userLng, verified);
    if (dto.city == null && pet.owner?.city != null) dto.city = pet.owner.city;
    if (pet.owner) {
      dto.owner = this.mapOwnerToPublicDto(pet.owner, petsCount, ownerVerified);
      try {
        dto.owner.tutorStats = await this.tutorStatsService.getStats(pet.ownerId);
      } catch {
        // Se getStats falhar (ex.: dados inconsistentes), mantém owner sem tutorStats
      }
    }
    if (!dto.partner && pet.ownerId) {
      const ownerPartner = await this.prisma.partner.findUnique({
        where: { userId: pet.ownerId },
        select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true },
      });
      if (ownerPartner) {
        dto.partner = {
          id: ownerPartner.id,
          name: ownerPartner.name,
          slug: ownerPartner.slug,
          logoUrl: ownerPartner.logoUrl ?? undefined,
          isPaidPartner: ownerPartner.isPaidPartner,
        };
      }
    }
    if (pet.media?.length) {
      dto.mediaItems = pet.media.map((m) => ({
        id: m.id,
        url: m.url,
        sortOrder: m.sortOrder ?? 0,
      }));
    }
    const viewCounts = await this.petViewService.getViewCountsLast24h([pet.id]);
    const viewCount = viewCounts.get(pet.id);
    if (viewCount !== undefined && viewCount > 0) dto.viewCountLast24h = viewCount;
    if (!userId) {
      delete dto.owner;
    }
    return dto;
  }

  /** Registra visualização do pet (ao abrir a página do pet). */
  async recordView(petId: string, userId: string, fromPassedScreen = false): Promise<void> {
    if (fromPassedScreen) {
      await this.petViewService.recordViewFromPassedScreen(petId, userId);
    } else {
      await this.petViewService.recordView(petId, userId);
    }
  }

  /** Lista pública de pets vinculados a um parceiro (apenas aprovados). Usado na página do parceiro. Se userId informado, inclui matchScore. */
  async findPublicByPartnerId(
    partnerId: string,
    opts?: { cursor?: string; species?: string; userId?: string },
  ): Promise<{ items: PetResponseDto[]; nextCursor: string | null }> {
    const PAGE_SIZE = 20;
    const where: { partnerId: string; publicationStatus: string; species?: string } = {
      partnerId,
      publicationStatus: 'APPROVED',
    };
    if (opts?.species && opts.species !== 'BOTH') {
      where.species = opts.species.toUpperCase();
    }
    const pets = await this.prisma.pet.findMany({
      where,
      take: PAGE_SIZE + 1,
      ...(opts?.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const hasMore = pets.length > PAGE_SIZE;
    const items = pets.slice(0, PAGE_SIZE);
    const petIds = items.map((p) => p.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(petIds);
    const dtos = items.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
    if (opts?.userId && petIds.length > 0) {
      const matchScores = await this.matchEngine.getMatchScoresForAdopter(petIds, opts.userId);
      dtos.forEach((dto) => {
        const score = matchScores[dto.id];
        if (score !== undefined) dto.matchScore = score;
      });
    }
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
    return { items: dtos, nextCursor };
  }

  /** [Admin] Listar pets com publicação pendente (para aprovar/rejeitar no feed). */
  async findPendingPublication(): Promise<PetResponseDto[]> {
    const pets = await this.prisma.pet.findMany({
      where: { publicationStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true, type: true } },
      },
    });
    const petIds = pets.map((p) => p.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(petIds);
    const ownerIdsWithoutPartner = [...new Set(pets.filter((p) => !p.partnerId).map((p) => p.ownerId))];
    const ownerPartners =
      ownerIdsWithoutPartner.length > 0
        ? await this.prisma.partner.findMany({
            where: { userId: { in: ownerIdsWithoutPartner } },
            select: { userId: true, id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true, type: true },
          })
        : [];
    const partnerByOwnerId = Object.fromEntries(ownerPartners.map((p) => [p.userId, p]));
    const dtos = pets.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
    // Inclui partner para qualquer tipo (ONG, CLINIC, STORE) quando o dono do pet é o admin do parceiro
    dtos.forEach((dto, i) => {
      if (!dto.partner && partnerByOwnerId[pets[i].ownerId]) {
        const op = partnerByOwnerId[pets[i].ownerId];
        const typeNorm = op.type?.toUpperCase?.() || op.type;
        dto.partner = { id: op.id, name: op.name, slug: op.slug, logoUrl: op.logoUrl ?? undefined, isPaidPartner: op.isPaidPartner, type: typeNorm };
      }
    });
    return dtos;
  }

  /** Vida útil padrão do anúncio (dias). */
  private static readonly LISTING_LIFETIME_DAYS = 60;

  /** [Admin] Aprovar ou rejeitar anúncio (publicação no feed). Ao aprovar, define expiresAt = now + 60 dias. Se o pet não tiver lat/lng, tenta preencher por geocoding da cidade (pet ou tutor) para aparecer no mapa. */
  async setPublicationStatus(
    petId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<PetResponseDto | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
        owner: { select: { city: true } },
      },
    });
    if (!pet) return null;
    const now = new Date();
    const expiresAt =
      status === 'APPROVED' && ['AVAILABLE', 'IN_PROCESS'].includes(pet.status)
        ? new Date(now.getTime() + PetsService.LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000)
        : undefined;
    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: {
        publicationStatus: status,
        publicationRejectionReason: status === 'REJECTED' ? (rejectionReason?.trim() || null) : null,
        ...(expiresAt && {
          expiresAt,
          expiryReminder10SentAt: null,
          expiryReminder5SentAt: null,
          expiryReminder1SentAt: null,
        }),
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const ownerId = updated.ownerId;
    const petName = updated.name || 'Seu anúncio';
    if (status === 'APPROVED') {
      // Preencher lat/lng a partir da cidade se o pet não tiver coordenadas (para aparecer no mapa)
      const needsCoords = updated.latitude == null || updated.longitude == null;
      const cityForGeocode = (updated.city ?? (pet as { owner?: { city: string | null } }).owner?.city)?.trim();
      if (needsCoords && cityForGeocode) {
        const coords = await forwardGeocode(cityForGeocode).catch(() => null);
        if (coords) {
          await this.prisma.pet.update({
            where: { id: petId },
            data: { latitude: coords.lat, longitude: coords.lng },
          });
          Object.assign(updated, { latitude: coords.lat, longitude: coords.lng });
        }
      }
      this.push
        .sendToUser(ownerId, 'Anúncio aprovado', `${petName} foi aprovado e já está visível no feed.`, {
          screen: 'pet',
          petId: updated.id,
        })
        .catch((e) => console.warn('[PetsService] push publication approved failed', e));
    } else {
      const body = rejectionReason?.trim()
        ? `O anúncio de ${petName} não foi aprovado: ${rejectionReason.trim()}. Você pode editar e reenviar para análise.`
        : `O anúncio de ${petName} não foi aprovado. Você pode editar e reenviar para análise.`;
      this.push
        .sendToUser(ownerId, 'Anúncio não aprovado', body, { screen: 'pet', petId: updated.id })
        .catch((e) => console.warn('[PetsService] push publication rejected failed', e));
    }
    const verified = await this.verificationService.isPetVerified(updated.id);
    return this.mapToDto(updated, undefined, undefined, verified);
  }

  /** Reenviar anúncio rejeitado para análise (publicationStatus REJECTED → PENDING). Apenas dono. */
  async resubmitPublication(petId: string, ownerId: string): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.ownerId !== ownerId) throw new ForbiddenException('Apenas o tutor pode reenviar o anúncio.');
    if (pet.publicationStatus !== 'REJECTED') {
      throw new BadRequestException('Só é possível reenviar anúncios que foram rejeitados. Edite o pet e use "Enviar novamente para análise".');
    }
    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: { publicationStatus: 'PENDING', publicationRejectionReason: null },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verified = await this.verificationService.isPetVerified(updated.id);
    return this.mapToDto(updated, undefined, undefined, verified);
  }

  /** Prorrogar vida útil do anúncio em 60 dias. Apenas dono; pet deve estar AVAILABLE ou IN_PROCESS e não expirado. */
  async extendListing(petId: string, ownerId: string): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.ownerId !== ownerId) throw new ForbiddenException('Apenas o tutor pode prorrogar o anúncio.');
    if (!['AVAILABLE', 'IN_PROCESS'].includes(pet.status)) {
      throw new BadRequestException('Só é possível prorrogar anúncios de pets disponíveis ou em andamento.');
    }
    const now = new Date();
    if (pet.expiresAt != null && pet.expiresAt <= now) {
      throw new BadRequestException('Este anúncio já expirou. Crie um novo anúncio para o pet.');
    }
    const newExpiresAt = new Date(now.getTime() + PetsService.LISTING_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: {
        expiresAt: newExpiresAt,
        expiryReminder10SentAt: null,
        expiryReminder5SentAt: null,
        expiryReminder1SentAt: null,
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verified = await this.verificationService.isPetVerified(updated.id);
    return this.mapToDto(updated, undefined, undefined, verified);
  }

  /** Perfil público de um usuário por id (ex.: interessado na lista "Quem priorizar"). Mesmo formato do perfil por petId. */
  async findOwnerProfileByUserId(userId: string): Promise<NonNullable<PetResponseDto['owner']> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deactivatedAt: null },
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
        petsAllowedAtHome: true,
        dogExperience: true,
        catExperience: true,
        householdAgreesToAdoption: true,
        whyAdopt: true,
      },
    });
    if (!user) return null;
    const [petsCount, ownerVerified] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: userId } }),
      this.verificationService.isUserVerified(user.id),
    ]);
    const ownerDto = this.mapOwnerToPublicDto(user, petsCount, ownerVerified);
    try {
      ownerDto.tutorStats = await this.tutorStatsService.getStats(user.id);
    } catch {
      // ignora falha de stats
    }
    return ownerDto;
  }

  /** Perfil público do tutor do pet (sem dados de contato). */
  async findOwnerProfileByPetId(petId: string): Promise<NonNullable<PetResponseDto['owner']> | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
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
            petsAllowedAtHome: true,
            dogExperience: true,
            catExperience: true,
            householdAgreesToAdoption: true,
            whyAdopt: true,
          },
        },
      },
    });
    if (!pet?.owner) return null;
    const [petsCount, ownerVerified] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      this.verificationService.isUserVerified(pet.owner.id),
    ]);
    const ownerDto = this.mapOwnerToPublicDto(pet.owner, petsCount, ownerVerified);
    ownerDto.tutorStats = await this.tutorStatsService.getStats(pet.owner.id);
    return ownerDto;
  }

  /** Perfil do tutor com telefone (apenas para admin). */
  async findOwnerProfileByPetIdForAdmin(petId: string): Promise<(NonNullable<PetResponseDto['owner']> & { phone?: string }) | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
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
            petsAllowedAtHome: true,
            dogExperience: true,
            catExperience: true,
            householdAgreesToAdoption: true,
            whyAdopt: true,
            phone: true,
          },
        },
      },
    });
    if (!pet?.owner) return null;
    const [petsCount, ownerVerified] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      this.verificationService.isUserVerified(pet.owner.id),
    ]);
    const ownerDto = this.mapOwnerToPublicDto(
      {
        id: pet.owner.id,
        name: pet.owner.name,
        avatarUrl: pet.owner.avatarUrl,
        city: pet.owner.city,
        bio: pet.owner.bio,
        housingType: pet.owner.housingType,
        hasYard: pet.owner.hasYard,
        hasOtherPets: pet.owner.hasOtherPets,
        hasChildren: pet.owner.hasChildren,
        timeAtHome: pet.owner.timeAtHome,
        petsAllowedAtHome: pet.owner.petsAllowedAtHome,
        dogExperience: pet.owner.dogExperience,
        catExperience: pet.owner.catExperience,
        householdAgreesToAdoption: pet.owner.householdAgreesToAdoption,
        whyAdopt: pet.owner.whyAdopt,
      },
      petsCount,
      ownerVerified,
    ) as NonNullable<PetResponseDto['owner']> & { phone?: string };
    ownerDto.tutorStats = await this.tutorStatsService.getStats(pet.owner.id);
    if (pet.owner.phone) ownerDto.phone = pet.owner.phone;
    return ownerDto;
  }

  private readonly MINE_PAGE_SIZE = 20;

  async findMine(
    ownerId: string,
    opts?: { cursor?: string; species?: string; status?: string },
  ): Promise<{ items: PetResponseDto[]; nextCursor: string | null }> {
    const cursor = opts?.cursor;
    const where: { ownerId: string; species?: string; status?: string } = { ownerId };
    if (opts?.species && opts.species !== 'BOTH') {
      where.species = opts.species.toUpperCase();
    }
    if (opts?.status) {
      where.status = opts.status;
    }
    const pets = await this.prisma.pet.findMany({
      where,
      take: this.MINE_PAGE_SIZE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ favorites: { _count: 'desc' } }, { createdAt: 'desc' }],
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
        adoption: { select: { adoptedAt: true, adopter: { select: { username: true } } } },
      },
    });
    const hasMore = pets.length > this.MINE_PAGE_SIZE;
    const items = pets.slice(0, this.MINE_PAGE_SIZE);
    const petIds = items.map((p) => p.id);
    const [verifiedIds, favoriteCounts, viewCounts] = await Promise.all([
      this.verificationService.getVerifiedPetIds(petIds),
      this.prisma.favorite.groupBy({
        by: ['petId'],
        where: { petId: { in: petIds }, userId: { not: ownerId } },
        _count: { id: true },
      }).then((rows) => new Map(rows.map((r) => [r.petId, r._count.id]))),
      this.petViewService.getViewCountsLast24h(petIds),
    ]);
    const dtos = items.map((p) => {
      const dto = this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id));
      if (p.adoption?.adoptedAt) dto.adoptedAt = p.adoption.adoptedAt.toISOString();
      if (p.adoption?.adopter?.username) dto.adopterUsername = p.adoption.adopter.username;
      if (p.adoptionRejectedAt) dto.adoptionRejectedAt = p.adoptionRejectedAt.toISOString();
      if (p.adoption) dto.confirmedByAdopet = !p.adoptionRejectedAt && !!(p as { adopetConfirmedAt?: Date | null }).adopetConfirmedAt;
      const count = favoriteCounts.get(p.id);
      if (count !== undefined) dto.favoritesCount = count;
      const vc = viewCounts.get(p.id);
      if (vc !== undefined && vc > 0) dto.viewCountLast24h = vc;
      return dto;
    });
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
    return { items: dtos, nextCursor };
  }

  async create(ownerId: string, dto: CreatePetDto): Promise<PetResponseDto> {
    if (dto.partnerId) {
      const partner = await this.prisma.partner.findFirst({
        where: { id: dto.partnerId, type: 'ONG', active: true, approvedAt: { not: null } },
      });
      if (!partner) {
        throw new BadRequestException('Parceiro inválido ou não aprovado. Escolha uma ONG parceira da lista.');
      }
    }
    let city: string | null = null;
    let latitude: number | null = dto.latitude ?? null;
    let longitude: number | null = dto.longitude ?? null;
    if (latitude != null && longitude != null) {
      city = await reverseGeocode(latitude, longitude);
    } else if (dto.city?.trim()) {
      city = dto.city.trim();
      const coords = await forwardGeocode(city).catch(() => null);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    const pet = await this.prisma.pet.create({
      data: {
        ownerId,
        name: dto.name,
        species: dto.species.toUpperCase(),
        breed: dto.breed,
        age: dto.age,
        sex: dto.sex,
        size: dto.size,
        vaccinated: dto.vaccinated,
        neutered: dto.neutered,
        description: dto.description,
        adoptionReason: dto.adoptionReason,
        feedingType: dto.feedingType ?? null,
        feedingNotes: dto.feedingNotes ?? null,
        energyLevel: dto.energyLevel ?? null,
        healthNotes: dto.healthNotes?.trim() || null,
        hasSpecialNeeds: dto.hasSpecialNeeds ?? null,
        goodWithDogs: dto.goodWithDogs ?? null,
        goodWithCats: dto.goodWithCats ?? null,
        goodWithChildren: dto.goodWithChildren ?? null,
        temperament: dto.temperament ?? null,
        isDocile: dto.isDocile ?? null,
        isTrained: dto.isTrained ?? null,
        preferredTutorHousingType: dto.preferredTutorHousingType ?? null,
        preferredTutorHasYard: dto.preferredTutorHasYard ?? null,
        preferredTutorHasOtherPets: dto.preferredTutorHasOtherPets ?? null,
        preferredTutorHasChildren: dto.preferredTutorHasChildren ?? null,
        preferredTutorTimeAtHome: dto.preferredTutorTimeAtHome ?? null,
        preferredTutorPetsAllowedAtHome: dto.preferredTutorPetsAllowedAtHome ?? null,
        preferredTutorDogExperience: dto.preferredTutorDogExperience ?? null,
        preferredTutorCatExperience: dto.preferredTutorCatExperience ?? null,
        preferredTutorHouseholdAgrees: dto.preferredTutorHouseholdAgrees ?? null,
        preferredTutorWalkFrequency: dto.preferredTutorWalkFrequency ?? null,
        hasOngoingCosts: dto.hasOngoingCosts ?? null,
        latitude,
        longitude,
        city,
        partnerId: dto.partnerId ?? null,
        status: 'AVAILABLE',
        publicationStatus: 'PENDING',
      },
      include: { media: true },
    });
    if (dto.initialPhotoUrl) {
      await this.prisma.petMedia.create({
        data: {
          petId: pet.id,
          url: dto.initialPhotoUrl,
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }
    const withMedia = await this.prisma.pet.findUnique({
      where: { id: pet.id },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verified = withMedia
      ? await this.verificationService.isPetVerified(withMedia.id)
      : false;
    return this.mapToDto(withMedia!, undefined, undefined, verified);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    if (dto.partnerId !== undefined) {
      if (dto.partnerId) {
        const partner = await this.prisma.partner.findFirst({
          where: { id: dto.partnerId, type: 'ONG', active: true, approvedAt: { not: null } },
        });
        if (!partner) {
          throw new BadRequestException('Parceiro inválido ou não aprovado. Escolha uma ONG parceira da lista.');
        }
      }
    }
    const latitudeChanged = dto.latitude !== undefined;
    const longitudeChanged = dto.longitude !== undefined;
    const cityChanged = dto.city !== undefined;
    let cityUpdate: { city: string | null } | undefined;
    let latLngUpdate: { latitude: number | null; longitude: number | null } | undefined;
    if (latitudeChanged || longitudeChanged) {
      const current = await this.prisma.pet.findUnique({
        where: { id },
        select: { latitude: true, longitude: true },
      });
      const finalLat = dto.latitude !== undefined ? dto.latitude : current?.latitude ?? null;
      const finalLng = dto.longitude !== undefined ? dto.longitude : current?.longitude ?? null;
      if (finalLat != null && finalLng != null) {
        const city = await reverseGeocode(finalLat, finalLng);
        cityUpdate = { city };
      } else {
        cityUpdate = { city: null };
      }
      latLngUpdate = { latitude: finalLat, longitude: finalLng };
    } else if (cityChanged) {
      const cityStr = dto.city?.trim() || null;
      cityUpdate = { city: cityStr };
      if (cityStr) {
        const coords = await forwardGeocode(cityStr).catch(() => null);
        latLngUpdate = coords
          ? { latitude: coords.lat, longitude: coords.lng }
          : { latitude: null, longitude: null };
      } else {
        latLngUpdate = { latitude: null, longitude: null };
      }
    }
    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.species !== undefined && { species: dto.species.toUpperCase() }),
        ...(dto.breed !== undefined && { breed: dto.breed }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.sex !== undefined && { sex: dto.sex }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.vaccinated !== undefined && { vaccinated: dto.vaccinated }),
        ...(dto.neutered !== undefined && { neutered: dto.neutered }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.adoptionReason !== undefined && { adoptionReason: dto.adoptionReason }),
        ...(dto.feedingType !== undefined && { feedingType: dto.feedingType ?? null }),
        ...(dto.feedingNotes !== undefined && { feedingNotes: dto.feedingNotes ?? null }),
        ...(dto.energyLevel !== undefined && { energyLevel: dto.energyLevel ?? null }),
        ...(dto.healthNotes !== undefined && { healthNotes: dto.healthNotes?.trim() || null }),
        ...(dto.hasSpecialNeeds !== undefined && { hasSpecialNeeds: dto.hasSpecialNeeds ?? null }),
        ...(dto.goodWithDogs !== undefined && { goodWithDogs: dto.goodWithDogs ?? null }),
        ...(dto.goodWithCats !== undefined && { goodWithCats: dto.goodWithCats ?? null }),
        ...(dto.goodWithChildren !== undefined && { goodWithChildren: dto.goodWithChildren ?? null }),
        ...(dto.temperament !== undefined && { temperament: dto.temperament ?? null }),
        ...(dto.isDocile !== undefined && { isDocile: dto.isDocile ?? null }),
        ...(dto.isTrained !== undefined && { isTrained: dto.isTrained ?? null }),
        ...(dto.preferredTutorHousingType !== undefined && { preferredTutorHousingType: dto.preferredTutorHousingType ?? null }),
        ...(dto.preferredTutorHasYard !== undefined && { preferredTutorHasYard: dto.preferredTutorHasYard ?? null }),
        ...(dto.preferredTutorHasOtherPets !== undefined && { preferredTutorHasOtherPets: dto.preferredTutorHasOtherPets ?? null }),
        ...(dto.preferredTutorHasChildren !== undefined && { preferredTutorHasChildren: dto.preferredTutorHasChildren ?? null }),
        ...(dto.preferredTutorTimeAtHome !== undefined && { preferredTutorTimeAtHome: dto.preferredTutorTimeAtHome ?? null }),
        ...(dto.preferredTutorPetsAllowedAtHome !== undefined && { preferredTutorPetsAllowedAtHome: dto.preferredTutorPetsAllowedAtHome ?? null }),
        ...(dto.preferredTutorDogExperience !== undefined && { preferredTutorDogExperience: dto.preferredTutorDogExperience ?? null }),
        ...(dto.preferredTutorCatExperience !== undefined && { preferredTutorCatExperience: dto.preferredTutorCatExperience ?? null }),
        ...(dto.preferredTutorHouseholdAgrees !== undefined && { preferredTutorHouseholdAgrees: dto.preferredTutorHouseholdAgrees ?? null }),
        ...(dto.preferredTutorWalkFrequency !== undefined && { preferredTutorWalkFrequency: dto.preferredTutorWalkFrequency ?? null }),
        ...(dto.hasOngoingCosts !== undefined && { hasOngoingCosts: dto.hasOngoingCosts ?? null }),
        ...(latLngUpdate !== undefined && latLngUpdate),
        ...(cityUpdate !== undefined && cityUpdate),
        ...(dto.partnerId !== undefined && { partnerId: dto.partnerId || null }),
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verified = await this.verificationService.isPetVerified(pet.id);
    return this.mapToDto(pet, undefined, undefined, verified);
  }

  async patchStatus(
    id: string,
    ownerId: string,
    status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED',
    pendingAdopterId?: string,
    pendingAdopterUsername?: string,
  ): Promise<PetResponseDto> {
    let resolvedAdopterId: string | null = null;
    if (status === 'ADOPTED' && (pendingAdopterId || pendingAdopterUsername)) {
      if (pendingAdopterUsername?.trim()) {
        const normalized = pendingAdopterUsername.trim().replace(/^@/, '').toLowerCase();
        const byUsername = await this.prisma.user.findUnique({
          where: { username: normalized, deactivatedAt: null },
          select: { id: true },
        });
        if (!byUsername) {
          throw new BadRequestException(`Usuário @${normalized} não encontrado. Peça para a pessoa criar conta e definir um nome de usuário no Adopet.`);
        }
        if (byUsername.id === ownerId) {
          throw new BadRequestException('O adotante não pode ser o próprio tutor.');
        }
        resolvedAdopterId = byUsername.id;
      } else if (pendingAdopterId) {
        const conv = await this.prisma.conversation.findFirst({
          where: { petId: id, adopterId: pendingAdopterId },
        });
        if (!conv) {
          throw new BadRequestException('Só é possível indicar como adotante alguém que tenha conversado com você sobre este pet no app.');
        }
        if (pendingAdopterId === ownerId) {
          throw new BadRequestException('O adotante não pode ser o próprio tutor.');
        }
        resolvedAdopterId = pendingAdopterId;
      }
    }

    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        status,
        ...(status === 'ADOPTED'
          ? { markedAdoptedAt: new Date(), adoptionRejectedAt: null, pendingAdopterId: resolvedAdopterId ?? undefined }
          : { pendingAdopterId: null }),
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
        owner: { select: { name: true } },
      },
    });
    if (status === 'ADOPTED') {
      await this.prisma.favorite.deleteMany({ where: { petId: id } });
    }
    if (status === 'ADOPTED' && pet.owner) {
      const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const title = 'Pet marcado como adotado';
      const body = `${pet.name} foi marcado como adotado pelo tutor ${pet.owner.name}. Confira no painel para registrar a adoção.`;
      for (const adminId of adminIds) {
        this.push.sendToUser(adminId, title, body, { screen: 'admin', petId: pet.id }).catch(() => {});
      }
      if (resolvedAdopterId) {
        this.requestAdoptionConfirmation(id, pet.name, pet.owner.name, resolvedAdopterId).catch((e) =>
          console.warn('[PetsService] requestAdoptionConfirmation failed', e),
        );
      }
    }
    const verified = await this.verificationService.isPetVerified(pet.id);
    return this.mapToDto(pet, undefined, undefined, verified);
  }

  /** Usa a conversa existente com o tutor e envia push para o adotante confirmar a adoção. */
  private async requestAdoptionConfirmation(
    petId: string,
    petName: string,
    tutorName: string,
    adopterId: string,
  ): Promise<void> {
    const conv = await this.prisma.conversation.findFirst({
      where: { petId, adopterId, type: 'NORMAL' },
      select: { id: true },
    });
    if (!conv) return;
    const messageContent = `O tutor ${tutorName} indicou você como adotante de ${petName}. Toque em "Confirmar adoção" nesta tela para registrar que a adoção foi realizada.`;
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: null,
          isSystem: true,
          content: messageContent,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      }),
    ]);
    await this.push.sendToUser(
      adopterId,
      'Confirme sua adoção',
      `${tutorName} indicou você como adotante de ${petName}. Confirme no app.`,
      { conversationId: conv.id, petId },
    );
  }

  async getConversationPartners(
    petId: string,
    ownerId: string,
  ): Promise<{ id: string; name: string; username?: string }[]> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true },
    });
    if (!pet || pet.ownerId !== ownerId) {
      throw new BadRequestException('Pet não encontrado ou você não é o dono');
    }
    const convs = await this.prisma.conversation.findMany({
      where: { petId, type: 'NORMAL', adopterId: { not: null } },
      select: { adopterId: true },
    });
    const userIds = [...new Set(convs.map((c) => c.adopterId).filter(Boolean))] as string[];
    if (userIds.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, deactivatedAt: null },
      select: { id: true, name: true, username: true },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      ...(u.username ? { username: u.username } : undefined),
    }));
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      select: { ownerId: true, status: true },
    });
    if (!pet || pet.ownerId !== ownerId) {
      throw new BadRequestException('Pet não encontrado ou você não é o dono');
    }
    if (pet.status === 'ADOPTED') {
      throw new BadRequestException('Não é possível remover um anúncio de pet já adotado');
    }
    await this.prisma.pet.delete({ where: { id } });
  }

  async deleteMedia(petId: string, ownerId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.petMedia.findFirst({
      where: { id: mediaId, petId },
      include: { pet: true },
    });
    if (!media || media.pet.ownerId !== ownerId) {
      throw new BadRequestException('Mídia não encontrada ou você não é o dono do pet');
    }
    await this.prisma.petMedia.delete({ where: { id: mediaId } });
  }

  async reorderMedia(petId: string, ownerId: string, mediaIds: string[]): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { media: true, partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } } },
    });
    if (!pet || pet.ownerId !== ownerId) {
      throw new BadRequestException('Pet não encontrado ou você não é o dono');
    }
    const validIds = new Set(pet.media.map((m) => m.id));
    if (mediaIds.some((id) => !validIds.has(id)) || mediaIds.length !== validIds.size) {
      throw new BadRequestException('mediaIds deve conter exatamente os IDs das mídias do pet');
    }
    await Promise.all(
      mediaIds.map((id, index) =>
        this.prisma.petMedia.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        }),
      ),
    );
    const updated = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verified = await this.verificationService.isPetVerified(petId);
    return this.mapToDto(updated!, undefined, undefined, verified);
  }

  /** Adotante confirma que realizou a adoção; cria o registro de adoção na hora para o número atualizar. */
  async confirmAdoption(petId: string, userId: string): Promise<{ confirmed: boolean }> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: {
        ownerId: true,
        pendingAdopterId: true,
        status: true,
        adopterConfirmedAt: true,
        adoption: { select: { id: true } },
      },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.status !== 'ADOPTED') {
      throw new BadRequestException('Este pet não está marcado como adotado.');
    }
    if (pet.pendingAdopterId !== userId) {
      throw new ForbiddenException('Apenas o adotante indicado pelo tutor pode confirmar esta adoção.');
    }
    const alreadyConfirmed = !!pet.adopterConfirmedAt;
    if (!alreadyConfirmed) {
      await this.prisma.pet.update({
        where: { id: petId },
        data: { adopterConfirmedAt: new Date() },
      });
    }
    if (!pet.adoption) {
      if (pet.ownerId === userId) {
        console.warn('[PetsService] confirmAdoption: não cria Adoption quando adotante é o próprio tutor (petId=%s)', petId);
      } else {
        await this.adminService.createAdoption(petId);
      }
    }
    return { confirmed: true };
  }

  /**
   * Retorna pets em ordem pelos ids informados (para preservar ordem da engine de similares).
   */
  async findManyByIds(ids: string[]): Promise<PetResponseDto[]> {
    if (ids.length === 0) return [];
    const now = new Date();
    const pets = await this.prisma.pet.findMany({
      where: {
        id: { in: ids },
        publicationStatus: 'APPROVED',
        status: 'AVAILABLE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
      },
    });
    const verifiedIds = await this.verificationService.getVerifiedPetIds(pets.map((p) => p.id));
    const byId = new Map(pets.map((p) => [p.id, this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id))]));
    return ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  }

  /** Pets similares ao pet informado (engine por porte, idade, energia, temperamento, sexo, raça). Se userId for informado, inclui matchScore com o perfil do usuário. */
  async getSimilarPetsWithScores(petId: string, limit = 12, userId?: string): Promise<SimilarPetItemDto[]> {
    const scores = await this.similarPetsEngine.getSimilarScores(petId, limit);
    if (scores.length === 0) return [];
    const ids = scores.map((s) => s.petId);
    const pets = await this.findManyByIds(ids);
    const byId = new Map(pets.map((p) => [p.id, p]));
    let matchScores: Record<string, number | null> = {};
    if (userId && ids.length > 0) {
      matchScores = await this.matchEngine.getMatchScoresForAdopter(ids, userId);
    }
    return scores
      .map((s) => {
        const pet = byId.get(s.petId);
        if (!pet) return null;
        const dto: SimilarPetItemDto = { pet, similarityScore: s.similarityScore };
        if (userId) {
          dto.matchScore = matchScores[s.petId] ?? null;
        }
        return dto;
      })
      .filter((x): x is SimilarPetItemDto => x != null);
  }
}
