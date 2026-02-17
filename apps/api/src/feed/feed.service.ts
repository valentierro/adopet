import { Injectable } from '@nestjs/common';
import type { Pet } from '../../api/prisma-generated';
import type { Prisma } from '../../api/prisma-generated';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../moderation/reports.service';
import { BlocksService } from '../moderation/blocks.service';
import { VerificationService } from '../verification/verification.service';
import type { FeedQueryDto } from './dto/feed-query.dto';
import type { FeedResponseDto } from './dto/feed-response.dto';
import type { PetResponseDto } from '../pets/dto/pet-response.dto';

const DEFAULT_PAGE_SIZE = 20;
const CANDIDATE_POOL_SIZE = 500;
const CURSOR_SEP = '|';

/** Pesos do score de relevância (soma = 1). */
const WEIGHT_DISTANCE = 0.35;
const WEIGHT_RECENCY = 0.25;
const WEIGHT_ENGAGEMENT = 0.15;
const WEIGHT_COMPATIBILITY = 0.15;
const WEIGHT_SIMILAR = 0.1;

/** Decay para recência: exp(-DECAY_RECENCY * days). Quanto maior, mais penaliza pet antigo. */
const DECAY_RECENCY = 0.08;

/** Boost de score para pets de parceiro pago (destaque no feed). */
const BOOST_PAID_PARTNER = 0.08;

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly blocksService: BlocksService,
    private readonly verificationService: VerificationService,
  ) {}

  private mapToDto(
    pet: Pick<
      Pet,
      | 'id'
      | 'name'
      | 'species'
      | 'age'
      | 'sex'
      | 'size'
      | 'vaccinated'
      | 'neutered'
      | 'description'
      | 'latitude'
      | 'longitude'
      | 'ownerId'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
    > & {
      city?: string | null;
      breed?: string | null;
      adoptionReason?: string | null;
      feedingType?: string | null;
      feedingNotes?: string | null;
      media?: { url: string }[];
      owner?: { city: string | null } | null;
      partner?: { id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean } | null;
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
    // Cidade = local do anúncio (pet.city, preenchido por reverse geocode das coordenadas). Fallback = cidade do tutor.
    // Distância = do usuário que pediu o feed (userLat/userLng) até as coordenadas do pet.
    if (pet.city != null) dto.city = pet.city;
    else if (pet.owner?.city != null) dto.city = pet.owner.city;
    if (pet.partner != null) {
      dto.partner = {
        id: pet.partner.id,
        name: pet.partner.name,
        slug: pet.partner.slug,
        logoUrl: pet.partner.logoUrl ?? undefined,
        isPaidPartner: pet.partner.isPaidPartner,
      };
    }
    return dto;
  }

  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
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

  /**
   * Codifica cursor de paginação: score e id do último item (para ordenação por relevância).
   * Score arredondado para evitar problemas de precisão ao decodificar.
   */
  private encodeCursor(score: number, id: string): string {
    const s = Math.round(score * 1e10) / 1e10;
    return `${s}${CURSOR_SEP}${id}`;
  }

  private decodeCursor(cursor: string): { score: number; id: string } | null {
    const i = cursor.indexOf(CURSOR_SEP);
    if (i === -1) return null;
    const score = parseFloat(cursor.slice(0, i));
    const id = cursor.slice(i + 1);
    if (Number.isNaN(score) || !id) return null;
    return { score, id };
  }

  /**
   * Calcula score de relevância (0..1): distância, recência, engajamento, compatibilidade (espécie + tamanho), favoritos similares.
   */
  private relevanceScore(
    distanceKm: number,
    daysSinceCreated: number,
    favoriteCount: number,
    speciesMatch: number,
    sizeMatch: number,
    similarToFavorites: number,
  ): number {
    const distScore = 1 / (1 + distanceKm);
    const recencyScore = Math.exp(-DECAY_RECENCY * daysSinceCreated);
    const engagementScore = Math.min(1, Math.log(1 + favoriteCount) / 5);
    const compatibility = (speciesMatch + sizeMatch) / 2;
    return (
      WEIGHT_DISTANCE * distScore +
      WEIGHT_RECENCY * recencyScore +
      WEIGHT_ENGAGEMENT * engagementScore +
      WEIGHT_COMPATIBILITY * compatibility +
      WEIGHT_SIMILAR * similarToFavorites
    );
  }

  async getFeed(query: FeedQueryDto): Promise<FeedResponseDto> {
    const { lat, lng, radiusKm: queryRadiusKm, cursor, userId, species: querySpecies, breed: queryBreed, ownerId: queryOwnerId } = query;
    const pageSize = DEFAULT_PAGE_SIZE;

    // Listagem por dono (ex.: "Ver anúncios" no perfil do tutor): sem geo, ordenação por data
    if (queryOwnerId) {
      return this.getFeedByOwnerId(queryOwnerId, cursor ?? undefined, userId);
    }

    const [prefs, swipedPetIds, reportedPetIds, blockedByMe, blockedMe, favoritePets] = await Promise.all([
      userId
        ? this.prisma.userPreferences.findUnique({ where: { userId } })
        : Promise.resolve(null),
      userId
        ? this.prisma.swipe.findMany({ where: { userId }, select: { petId: true } })
        : Promise.resolve([]),
      this.reportsService.getReportedPetIds(),
      userId ? this.blocksService.getBlockedUserIds(userId) : Promise.resolve([]),
      userId ? this.blocksService.getBlockedByUserIds(userId) : Promise.resolve([]),
      userId
        ? this.prisma.favorite.findMany({
            where: { userId },
            include: { pet: { select: { species: true, size: true } } },
          })
        : Promise.resolve([]),
    ]);
    const speciesPref = querySpecies ?? prefs?.species;
    const speciesFilter =
      speciesPref && speciesPref !== 'BOTH' ? speciesPref.toUpperCase() : null;
    const sizePref = prefs?.sizePref?.toLowerCase() || null;
    const favoriteSpeciesSet = new Set(favoritePets.map((f) => f.pet.species));
    const favoriteSizeSet = new Set(favoritePets.map((f) => f.pet.size));
    const swipedIds = swipedPetIds.map((s) => s.petId);
    const excludeOwnerIds = userId ? [...blockedByMe, ...blockedMe] : [];

    const breedFilter = queryBreed?.trim();
    const now = new Date();
    const where = {
      status: 'AVAILABLE' as const,
      publicationStatus: 'APPROVED' as const,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      // species no banco pode ser "cat"/"dog" (create) ou "CAT"/"DOG"; filtro case-insensitive
      ...(speciesFilter ? { species: { equals: speciesFilter, mode: 'insensitive' as const } } : {}),
      ...(breedFilter ? { breed: { equals: breedFilter, mode: 'insensitive' as const } } : {}),
      ...(swipedIds.length > 0 ? { id: { notIn: swipedIds } } : {}),
      ...(reportedPetIds.length > 0 ? { id: { notIn: reportedPetIds } } : {}),
      ...(excludeOwnerIds.length > 0 ? { ownerId: { notIn: excludeOwnerIds } } : {}),
    };

    const include = {
      media: { orderBy: { sortOrder: 'asc' as const } },
      owner: { select: { city: true } },
      partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
    };

    const candidates = await this.prisma.pet.findMany({
      where,
      take: CANDIDATE_POOL_SIZE,
      orderBy: { id: 'desc' },
      include,
    });

    if (candidates.length === 0) {
      return { items: [], nextCursor: null, totalCount: 0 };
    }

    const petIds = candidates.map((p) => p.id);
    const favCounts =
      petIds.length > 0
        ? await this.prisma.favorite.groupBy({
            by: ['petId'],
            where: { petId: { in: petIds } },
            _count: { id: true },
          })
        : [];
    const favByPetId = Object.fromEntries(favCounts.map((f) => [f.petId, f._count.id]));

    const ownerIdsForPartnerCheck = [...new Set(candidates.filter((p) => !(p as { partner?: unknown }).partner).map((p) => p.ownerId))];
    const ownerPartnersForScore =
      ownerIdsForPartnerCheck.length > 0
        ? await this.prisma.partner.findMany({
            where: { userId: { in: ownerIdsForPartnerCheck } },
            select: { userId: true, isPaidPartner: true },
          })
        : [];
    const isPaidPartnerByOwnerId = Object.fromEntries(ownerPartnersForScore.map((p) => [p.userId, p.isPaidPartner]));

    const nowMs = Date.now();
    const radiusKm = Number(queryRadiusKm ?? prefs?.radiusKm ?? 50) || 50;
    const hasUserLocation = lat != null && lng != null;
    const scored = candidates.map((pet) => {
      // Pet sem coordenadas: não excluir do feed. Trata como dentro do raio (distanceKm = radiusKm)
      // para passar no filtro quando o usuário enviou localização (evita que anúncios do próprio usuário
      // ou outros sem localização sumam do feed).
      const distanceKm =
        hasUserLocation && pet.latitude != null && pet.longitude != null
          ? this.haversineKm(lat!, lng!, pet.latitude, pet.longitude)
          : hasUserLocation
            ? radiusKm
            : 50;
      const daysSinceCreated = (nowMs - pet.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const favoriteCount = favByPetId[pet.id] ?? 0;
      const speciesMatch = speciesFilter == null || pet.species === speciesFilter ? 1 : 0;
      const sizeMatch =
        !sizePref || sizePref === 'both' || pet.size === sizePref ? 1 : 0;
      const similarToFavorites =
        favoriteSpeciesSet.has(pet.species) || favoriteSizeSet.has(pet.size) ? 1 : 0;
      let score = this.relevanceScore(
        distanceKm,
        daysSinceCreated,
        favoriteCount,
        speciesMatch,
        sizeMatch,
        similarToFavorites,
      );
      const isPaidPartner =
        (pet as { partner?: { isPaidPartner?: boolean } }).partner?.isPaidPartner || isPaidPartnerByOwnerId[pet.ownerId];
      if (isPaidPartner) {
        score = Math.min(1, score + BOOST_PAID_PARTNER);
      }
      return { pet, score, distanceKm };
    });

    /** Filtra por raio quando lat/lng foram enviados (respeita preferência do usuário). */
    let withinRadius = scored;
    if (hasUserLocation) {
      withinRadius = scored.filter((s) => s.distanceKm <= radiusKm);
    }

    withinRadius.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.pet.id.localeCompare(a.pet.id);
    });

    let startIndex = 0;
    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      if (decoded) {
        const idx = withinRadius.findIndex((s) => s.pet.id === decoded.id);
        if (idx >= 0) {
          startIndex = idx + 1;
        } else {
          const idxAfter = withinRadius.findIndex(
            (s) =>
              s.score < decoded.score ||
              (s.score === decoded.score && s.pet.id <= decoded.id),
          );
          startIndex = idxAfter === -1 ? withinRadius.length : idxAfter;
        }
      }
    }

    const slice = withinRadius.slice(startIndex, startIndex + pageSize + 1);
    const hasMore = slice.length > pageSize;
    const items = slice.slice(0, pageSize);
    const nextCursor =
      hasMore && items.length > 0
        ? this.encodeCursor(items[items.length - 1].score, items[items.length - 1].pet.id)
        : null;

    const itemPetIds = items.map(({ pet }) => pet.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(itemPetIds);

    const itemPets = items.map(({ pet }) => pet);
    const ownerIdsNeedingPartner = [...new Set(itemPets.filter((p) => !(p as { partner?: unknown }).partner).map((p) => p.ownerId))];
    const ownerPartners =
      ownerIdsNeedingPartner.length > 0
        ? await this.prisma.partner.findMany({
            where: { userId: { in: ownerIdsNeedingPartner } },
            select: { userId: true, id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true },
          })
        : [];
    const partnerByOwnerId = Object.fromEntries(ownerPartners.map((p) => [p.userId, p]));

    return {
      items: items.map(({ pet }) => {
        const dto = this.mapToDto(pet, lat, lng, verifiedIds.has(pet.id));
        if (!dto.partner && partnerByOwnerId[pet.ownerId]) {
          const op = partnerByOwnerId[pet.ownerId];
          dto.partner = { id: op.id, name: op.name, slug: op.slug, logoUrl: op.logoUrl ?? undefined, isPaidPartner: op.isPaidPartner };
        }
        return dto;
      }),
      nextCursor,
      totalCount: withinRadius.length,
    };
  }

  /** Lista anúncios de um dono (ex.: tela "Ver anúncios" no perfil do tutor). */
  private async getFeedByOwnerId(
    ownerId: string,
    cursor: string | undefined,
    userId: string | undefined,
  ): Promise<FeedResponseDto> {
    const pageSize = DEFAULT_PAGE_SIZE;
    const reportedPetIds = await this.reportsService.getReportedPetIds();
    const now = new Date();
    const where = {
      ownerId,
      status: 'AVAILABLE' as const,
      publicationStatus: 'APPROVED' as const,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(reportedPetIds.length > 0 ? { id: { notIn: reportedPetIds } } : {}),
    };
    const [totalCount] = await Promise.all([
      this.prisma.pet.count({ where }),
    ]);
    const include = {
      media: { orderBy: { sortOrder: 'asc' as const } },
      owner: { select: { city: true } },
      partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
    };
    const pets = await this.prisma.pet.findMany({
      where,
      take: pageSize + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' },
      include,
    });
    const hasMore = pets.length > pageSize;
    const items = pets.slice(0, pageSize);
    const itemPetIds = items.map((p) => p.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(itemPetIds);
    const ownerIdsNeedingPartner = [...new Set(items.filter((p) => !(p as { partner?: unknown }).partner).map((p) => p.ownerId))];
    const ownerPartners =
      ownerIdsNeedingPartner.length > 0
        ? await this.prisma.partner.findMany({
            where: { userId: { in: ownerIdsNeedingPartner } },
            select: { userId: true, id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true },
          })
        : [];
    const partnerByOwnerId = Object.fromEntries(ownerPartners.map((p) => [p.userId, p]));
    return {
      items: items.map((pet) => {
        const dto = this.mapToDto(pet, undefined, undefined, verifiedIds.has(pet.id));
        if (!dto.partner && partnerByOwnerId[pet.ownerId]) {
          const op = partnerByOwnerId[pet.ownerId];
          dto.partner = { id: op.id, name: op.name, slug: op.slug, logoUrl: op.logoUrl ?? undefined, isPaidPartner: op.isPaidPartner };
        }
        return dto;
      }),
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
      totalCount,
    };
  }

  /** Pets com lat/lng para exibir no mapa (mesmos filtros do feed). */
  async getMapPins(
    lat: number,
    lng: number,
    radiusKm: number,
    userId?: string,
    species?: 'DOG' | 'CAT',
  ): Promise<{
    items: {
      id: string;
      name: string;
      age: number;
      species: string;
      size: string;
      vaccinated: boolean;
      city?: string;
      latitude: number;
      longitude: number;
      photoUrl: string;
      distanceKm: number;
      verified: boolean;
      partner?: { isPaidPartner: boolean };
    }[];
  }> {
    const [reportedPetIds, blockedByMe, blockedMe] = await Promise.all([
      this.reportsService.getReportedPetIds(),
      userId ? this.blocksService.getBlockedUserIds(userId) : Promise.resolve([]),
      userId ? this.blocksService.getBlockedByUserIds(userId) : Promise.resolve([]),
    ]);
    const excludeOwnerIds = userId ? [...blockedByMe, ...blockedMe] : [];
    const now = new Date();
    const candidates = await this.prisma.pet.findMany({
      where: {
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        latitude: { not: null },
        longitude: { not: null },
        ...(species ? { species } : {}),
        ...(reportedPetIds.length > 0 ? { id: { notIn: reportedPetIds } } : {}),
        ...(excludeOwnerIds.length > 0 ? { ownerId: { notIn: excludeOwnerIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        age: true,
        species: true,
        size: true,
        vaccinated: true,
        ownerId: true,
        latitude: true,
        longitude: true,
        city: true,
        media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
        owner: { select: { city: true } },
        partner: { select: { isPaidPartner: true } },
      },
    });
    const withinRadius: { p: (typeof candidates)[number]; distanceKm: number }[] = [];
    for (const p of candidates) {
      if (p.latitude == null || p.longitude == null) continue;
      const distanceKm = this.haversineKm(lat, lng, p.latitude, p.longitude);
      if (distanceKm <= radiusKm) {
        withinRadius.push({ p, distanceKm });
      }
    }
    const petIds = withinRadius.map(({ p }) => p.id);
    const verifiedIds = petIds.length > 0 ? await this.verificationService.getVerifiedPetIds(petIds) : new Set<string>();
    const ownerIdsNeedingPartner = [
      ...new Set(
        withinRadius
          .filter(({ p }) => !(p as { partner?: unknown }).partner)
          .map(({ p }) => p.ownerId),
      ),
    ];
    const ownerPartners =
      ownerIdsNeedingPartner.length > 0
        ? await this.prisma.partner.findMany({
            where: { userId: { in: ownerIdsNeedingPartner } },
            select: { userId: true, isPaidPartner: true },
          })
        : [];
    const partnerByOwnerId = Object.fromEntries(ownerPartners.map((op) => [op.userId, { isPaidPartner: op.isPaidPartner }]));
    const items = withinRadius.map(({ p, distanceKm }) => {
      const partnerFromPet = (p as { partner?: { isPaidPartner: boolean } | null }).partner;
      const partnerFromOwner = partnerByOwnerId[p.ownerId];
      const partner = partnerFromPet ?? partnerFromOwner;
      return {
        id: p.id,
        name: p.name,
        age: p.age,
        species: p.species,
        size: p.size,
        vaccinated: p.vaccinated,
        ...((p.city ?? p.owner?.city) != null && { city: p.city ?? p.owner?.city ?? undefined }),
        latitude: p.latitude!,
        longitude: p.longitude!,
        photoUrl: p.media[0]?.url ?? '',
        distanceKm,
        verified: verifiedIds.has(p.id),
        ...(partner != null && { partner: { isPaidPartner: partner.isPaidPartner } }),
      };
    });
    return { items };
  }

  /**
   * Conta pets novos (criados desde `since`) no raio do usuário, para notificação "novos pets na sua região".
   */
  async countNewPetsInRadius(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
    since: Date,
    species?: string,
  ): Promise<number> {
    const [reportedPetIds, blockedByMe, blockedMe] = await Promise.all([
      this.reportsService.getReportedPetIds(),
      this.blocksService.getBlockedUserIds(userId),
      this.blocksService.getBlockedByUserIds(userId),
    ]);
    const excludeOwnerIds = [...blockedByMe, ...blockedMe];
    const speciesFilter = species && species !== 'BOTH' ? species.toUpperCase() : null;
    const now = new Date();
    const candidates = await this.prisma.pet.findMany({
      where: {
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        createdAt: { gte: since },
        latitude: { not: null },
        longitude: { not: null },
        ownerId: { not: userId },
        ...(speciesFilter ? { species: speciesFilter } : {}),
        ...(reportedPetIds.length > 0 ? { id: { notIn: reportedPetIds } } : {}),
        ...(excludeOwnerIds.length > 0 ? { ownerId: { notIn: excludeOwnerIds } } : {}),
      },
      select: { id: true, latitude: true, longitude: true },
      take: 2000,
    });
    let count = 0;
    for (const p of candidates) {
      if (p.latitude == null || p.longitude == null) continue;
      if (this.haversineKm(lat, lng, p.latitude, p.longitude) <= radiusKm) count += 1;
    }
    return count;
  }

  /**
   * Conta pets que combinam com uma busca salva (para alerta de notificação).
   * Considera espécie, porte, raça, data de criação e, quando definido, raio (lat/lng).
   */
  async countPetsForSavedSearchAlert(s: {
    userId: string;
    lastCheckedAt: Date;
    species?: string | null;
    size?: string | null;
    breed?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radiusKm?: number;
  }): Promise<number> {
    const [reportedPetIds, blockedByMe, blockedMe] = await Promise.all([
      this.reportsService.getReportedPetIds(),
      this.blocksService.getBlockedUserIds(s.userId),
      this.blocksService.getBlockedByUserIds(s.userId),
    ]);
    const excludeOwnerIds = [...blockedByMe, ...blockedMe];
    const now = new Date();
    const speciesFilter =
      s.species && s.species !== 'BOTH' ? (s.species as string).toUpperCase() : null;
    const where: Prisma.PetWhereInput = {
      status: 'AVAILABLE',
      publicationStatus: 'APPROVED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      createdAt: { gte: s.lastCheckedAt },
      ownerId: { not: s.userId },
      ...(speciesFilter ? { species: speciesFilter } : {}),
      ...(s.size ? { size: s.size } : {}),
      ...(s.breed?.trim() ? { breed: { equals: s.breed.trim(), mode: 'insensitive' as const } } : {}),
      ...(reportedPetIds.length > 0 ? { id: { notIn: reportedPetIds } } : {}),
      ...(excludeOwnerIds.length > 0 ? { ownerId: { notIn: excludeOwnerIds } } : {}),
    };
    if (s.latitude != null && s.longitude != null) {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }
    const candidates = await this.prisma.pet.findMany({
      where,
      select: { id: true, latitude: true, longitude: true },
      take: 2000,
    });
    const radiusKm = s.radiusKm ?? 50;
    if (s.latitude != null && s.longitude != null) {
      let count = 0;
      for (const p of candidates) {
        if (p.latitude == null || p.longitude == null) continue;
        if (this.haversineKm(s.latitude, s.longitude, p.latitude, p.longitude) <= radiusKm)
          count += 1;
      }
      return count;
    }
    return candidates.length;
  }
}
