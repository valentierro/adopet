import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMatchScore } from '../match-engine/compute-match-score';
import type { AdopterProfile } from '../match-engine/match-engine.types';
import type { CreateSwipeDto } from './dto/create-swipe.dto';
import type { PetResponseDto } from '../pets/dto/pet-response.dto';

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

export type CreateSwipeInput = CreateSwipeDto & { userId: string };

@Injectable()
export class SwipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSwipeInput): Promise<{ id: string; action: string }> {
    const swipe = await this.prisma.swipe.upsert({
      where: {
        userId_petId: { userId: dto.userId, petId: dto.petId },
      },
      create: {
        userId: dto.userId,
        petId: dto.petId,
        action: dto.action,
      },
      update: { action: dto.action },
    });
    return { id: swipe.id, action: swipe.action };
  }

  /** Lista pets que o usuário passou (PASS), para "reconsiderar". */
  async getPassed(userId: string): Promise<{ items: PetResponseDto[] }> {
    const [swipes, adopterProfile, prefs] = await Promise.all([
      this.prisma.swipe.findMany({
        where: {
          userId,
          action: 'PASS',
          pet: { owner: { deactivatedAt: null } },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          pet: {
            include: {
              media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 5 },
              partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
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
    const items = swipes.map((s) => {
      const dto = this.petToDto(s.pet);
      if (profileForMatch && s.pet) {
        const matchResult = computeMatchScore(profileForMatch, s.pet);
        dto.matchScore = matchResult.score;
      }
      return dto;
    });
    return { items };
  }

  /** Remove o swipe (desfazer pass) para o pet voltar ao feed. */
  async deleteByPetId(userId: string, petId: string): Promise<{ message: string }> {
    const swipe = await this.prisma.swipe.findUnique({
      where: { userId_petId: { userId, petId } },
    });
    if (!swipe) throw new NotFoundException('Swipe não encontrado');
    if (swipe.action !== 'PASS') throw new NotFoundException('Só é possível desfazer um pass.');
    await this.prisma.swipe.delete({
      where: { userId_petId: { userId, petId } },
    });
    return { message: 'OK' };
  }

  private petToDto(pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    age: number;
    sex: string;
    size: string;
    vaccinated: boolean;
    neutered: boolean;
    description: string;
    adoptionReason: string | null;
    latitude: number | null;
    longitude: number | null;
    ownerId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    media: { url: string }[];
    partner?: { id: string; name: string; slug: string; logoUrl: string | null; isPaidPartner: boolean } | null;
  }): PetResponseDto {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      age: pet.age,
      sex: pet.sex,
      size: pet.size,
      vaccinated: pet.vaccinated,
      neutered: pet.neutered,
      description: pet.description,
      photos: pet.media.map((m) => m.url),
      ownerId: pet.ownerId,
      status: pet.status,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
      ...(pet.breed != null && { breed: pet.breed }),
      ...(pet.adoptionReason != null && { adoptionReason: pet.adoptionReason }),
      ...(pet.partner != null && {
        partner: {
          id: pet.partner.id,
          name: pet.partner.name,
          slug: pet.partner.slug,
          logoUrl: pet.partner.logoUrl ?? undefined,
          isPaidPartner: pet.partner.isPaidPartner,
        },
      }),
    };
  }
}
