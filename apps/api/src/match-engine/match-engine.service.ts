import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMatchScore } from './compute-match-score';
import type { MatchResult } from './match-engine.types';

@Injectable()
export class MatchEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o score de match entre um pet e um adotante.
   * Apenas o tutor do pet ou o próprio adotante podem solicitar.
   */
  async getMatchScore(
    petId: string,
    adopterId: string,
    requestUserId: string,
  ): Promise<MatchResult> {
    const [pet, adopter, prefs] = await Promise.all([
      this.prisma.pet.findUnique({
        where: { id: petId },
        select: {
          ownerId: true,
          species: true,
          sex: true,
          preferredTutorHousingType: true,
          preferredTutorHasYard: true,
          preferredTutorHasOtherPets: true,
          preferredTutorHasChildren: true,
          preferredTutorTimeAtHome: true,
          preferredTutorPetsAllowedAtHome: true,
          preferredTutorDogExperience: true,
          preferredTutorCatExperience: true,
          preferredTutorHouseholdAgrees: true,
          preferredTutorWalkFrequency: true,
          hasOngoingCosts: true,
          size: true,
          age: true,
          energyLevel: true,
          hasSpecialNeeds: true,
          healthNotes: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: adopterId, deactivatedAt: null },
        select: {
          id: true,
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
        where: { userId: adopterId },
        select: { sizePref: true, species: true, sexPref: true },
      }),
    ]);

    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (!adopter) throw new NotFoundException('Adotante não encontrado');

    const isOwner = pet.ownerId === requestUserId;
    const isAdopter = adopterId === requestUserId;
    if (!isOwner && !isAdopter) {
      throw new ForbiddenException('Apenas o tutor do pet ou o adotante podem ver o score de match.');
    }

    const profileForMatch = {
      ...adopter,
      sizePref: prefs?.sizePref ?? undefined,
      speciesPref: prefs?.species ?? undefined,
      sexPref: prefs?.sexPref ?? undefined,
    };
    return computeMatchScore(profileForMatch, pet);
  }

  /**
   * Retorna o score de match (0–100 ou null) para cada pet em relação ao mesmo adotante.
   * Usado ex.: na lista "Pets similares" para exibir o match do usuário com cada pet.
   */
  async getMatchScoresForAdopter(
    petIds: string[],
    adopterId: string,
  ): Promise<Record<string, number | null>> {
    if (petIds.length === 0) return {};
    const [adopter, prefs, pets] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: adopterId, deactivatedAt: null },
        select: {
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
        where: { userId: adopterId },
        select: { sizePref: true, species: true, sexPref: true },
      }),
      this.prisma.pet.findMany({
        where: { id: { in: petIds } },
        select: {
          id: true,
          species: true,
          sex: true,
          preferredTutorHousingType: true,
          preferredTutorHasYard: true,
          preferredTutorHasOtherPets: true,
          preferredTutorHasChildren: true,
          preferredTutorTimeAtHome: true,
          preferredTutorPetsAllowedAtHome: true,
          preferredTutorDogExperience: true,
          preferredTutorCatExperience: true,
          preferredTutorHouseholdAgrees: true,
          preferredTutorWalkFrequency: true,
          hasOngoingCosts: true,
          size: true,
          age: true,
          energyLevel: true,
          hasSpecialNeeds: true,
          healthNotes: true,
        },
      }),
    ]);
    if (!adopter) return Object.fromEntries(petIds.map((id) => [id, null]));
    const profileForMatch = {
      ...adopter,
      sizePref: prefs?.sizePref ?? undefined,
      speciesPref: prefs?.species ?? undefined,
      sexPref: prefs?.sexPref ?? undefined,
    };
    const result: Record<string, number | null> = {};
    for (const pet of pets) {
      const matchResult = computeMatchScore(profileForMatch, pet);
      result[pet.id] = matchResult.score;
    }
    for (const id of petIds) {
      if (!(id in result)) result[id] = null;
    }
    return result;
  }
}
