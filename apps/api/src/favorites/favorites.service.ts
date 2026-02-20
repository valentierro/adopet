import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import { PetViewService } from '../pets/pet-view.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { computeMatchScore } from '../match-engine/compute-match-score';
import type { AdopterProfile } from '../match-engine/match-engine.types';
import type { FavoriteItemDto } from './dto/favorite-response.dto';

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
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly petViewService: PetViewService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  async add(userId: string, petId: string): Promise<FavoriteItemDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
        owner: { select: { city: true } },
      },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.ownerId === userId) {
      throw new BadRequestException('Você não pode favoritar seu próprio anúncio.');
    }
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_petId: { userId, petId } },
    });
    if (existing) throw new ConflictException('Pet já está nos favoritos');
    const [fav, favoriter] = await Promise.all([
      this.prisma.favorite.create({
        data: { userId, petId },
        include: {
          pet: {
            include: {
              media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
              partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
              owner: { select: { city: true } },
            },
          },
        },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    const ownerId = pet.ownerId;
    if (ownerId) {
      this.inAppNotifications
        .create(
          ownerId,
          IN_APP_NOTIFICATION_TYPES.PET_FAVORITED,
          'Alguém favoritou seu pet',
          `${favoriter?.name ?? 'Alguém'} favoritou ${pet.name}`,
          { petId },
          { screen: 'pet', petId },
        )
        .catch(() => {});
    }
    const verified = await this.verificationService.isPetVerified(petId);
    const dto = this.toItemDto(fav, verified);
    if (!dto) throw new NotFoundException('Pet não encontrado');
    return dto;
  }

  async remove(userId: string, petId: string): Promise<{ message: string }> {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_petId: { userId, petId } },
    });
    if (!fav) throw new NotFoundException('Favorito não encontrado');
    await this.prisma.favorite.delete({ where: { id: fav.id } });
    return { message: 'OK' };
  }

  private readonly PAGE_SIZE = 20;

  async list(userId: string, cursor?: string): Promise<{ items: FavoriteItemDto[]; nextCursor: string | null }> {
    const list = await this.prisma.favorite.findMany({
      where: { userId },
      take: this.PAGE_SIZE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
            partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
            owner: { select: { city: true } },
          },
        },
      },
    });
    const safeList = Array.isArray(list) ? list : [];
    const withPet = safeList.filter((f) => f?.pet != null);
    const hasMore = safeList.length > this.PAGE_SIZE;
    const items = withPet.slice(0, this.PAGE_SIZE);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
    const petIds = items.map((f) => f.pet!.id);
    const [verifiedIds, viewCounts, adopterProfile, prefs] = await Promise.all([
      this.verificationService.getVerifiedPetIds(petIds),
      this.petViewService.getViewCountsLast24h(petIds),
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
    const dtos = items
      .map((f) => {
        const dto = this.toItemDto(f, verifiedIds.has(f.pet!.id));
        if (dto && profileForMatch && f.pet) {
          const matchResult = computeMatchScore(profileForMatch, f.pet);
          dto.pet.matchScore = matchResult.score;
        }
        if (dto) {
          const vc = viewCounts.get(f.pet!.id);
          if (vc !== undefined && vc > 0) dto.pet.viewCountLast24h = vc;
        }
        return dto;
      })
      .filter((d): d is FavoriteItemDto => d != null);
    return { items: dtos, nextCursor };
  }

  private toItemDto(
    fav: {
      id: string;
      petId: string;
      createdAt: Date;
      pet: {
        id: string;
        name: string;
        species: string;
        age: number;
        sex: string;
        size: string;
        vaccinated: boolean;
        neutered: boolean;
        createdAt: Date;
        status: string;
        media?: { url: string }[];
        partner?: { id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean } | null;
        owner?: { city: string | null } | null;
      } | null;
    },
    verified = false,
  ): FavoriteItemDto | null {
    if (!fav?.pet) return null;
    const pet = fav.pet;
    const media = pet.media ?? [];
    return {
      id: fav.id,
      petId: fav.petId,
      createdAt: fav.createdAt.toISOString(),
      pet: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        age: pet.age,
        sex: pet.sex,
        size: pet.size,
        vaccinated: pet.vaccinated,
        neutered: pet.neutered,
        photos: media.map((m) => m.url),
        status: pet.status,
        verified,
        createdAt: pet.createdAt.toISOString(),
        city: pet.owner?.city ?? undefined,
        ...(pet.partner && {
          partner: {
            id: pet.partner.id,
            name: pet.partner.name,
            slug: pet.partner.slug,
            logoUrl: pet.partner.logoUrl ?? undefined,
            isPaidPartner: pet.partner.isPaidPartner,
          },
        }),
      },
    };
  }
}
