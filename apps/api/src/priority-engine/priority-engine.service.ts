import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchEngineService } from '../match-engine/match-engine.service';
import type { PriorityAdopterItem } from './priority-engine.types';

/** Campos do User usados para calcular completude do perfil (triagem) */
const PROFILE_FIELDS = [
  'city',
  'bio',
  'housingType',
  'hasYard',
  'hasOtherPets',
  'hasChildren',
  'timeAtHome',
  'petsAllowedAtHome',
  'dogExperience',
  'catExperience',
  'householdAgreesToAdoption',
  'whyAdopt',
  'activityLevel',
  'preferredPetAge',
  'commitsToVetCare',
  'walkFrequency',
  'monthlyBudgetForPet',
] as const;

const PROFILE_FIELDS_COUNT = PROFILE_FIELDS.length;

/** Peso do match no score de prioridade (0–1) */
const WEIGHT_MATCH = 0.5;
/** Peso da completude do perfil (0–1) */
const WEIGHT_COMPLETENESS = 0.3;
/** Peso de "já conversou" (0–1) */
const WEIGHT_CONVERSATION = 0.2;

@Injectable()
export class PriorityEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchEngine: MatchEngineService,
  ) {}

  /**
   * Lista adotantes que favoritaram o pet, ordenados por prioridade (quem o tutor deve priorizar).
   * Apenas o tutor (dono do pet) pode chamar.
   */
  async getPriorityAdopters(
    petId: string,
    requestUserId: string,
  ): Promise<PriorityAdopterItem[]> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { ownerId: true },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.ownerId !== requestUserId) {
      throw new ForbiddenException('Apenas o tutor do pet pode ver a lista de prioridade.');
    }

    const favorites = await this.prisma.favorite.findMany({
      where: { petId },
      select: { userId: true },
    });
    const adopterIds = [...new Set(favorites.map((f) => f.userId))].filter(
      (id) => id !== pet.ownerId,
    );
    if (adopterIds.length === 0) return [];

    const [adopters, conversations] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: adopterIds }, deactivatedAt: null },
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
          activityLevel: true,
          preferredPetAge: true,
          commitsToVetCare: true,
          walkFrequency: true,
          monthlyBudgetForPet: true,
        },
      }),
      this.prisma.conversation.findMany({
        where: { petId, type: 'NORMAL', adopterId: { in: adopterIds } },
        select: { id: true, adopterId: true },
      }),
    ]);
    const conversationByAdopterId = new Map<string, string>();
    conversations.forEach((c) => {
      if (c.adopterId) conversationByAdopterId.set(c.adopterId, c.id);
    });
    const conversationAdopterIds = new Set(conversationByAdopterId.keys());

    const items: PriorityAdopterItem[] = await Promise.all(
      adopters.map(async (u) => {
        let matchScore: number | null = null;
        try {
          const result = await this.matchEngine.getMatchScore(
            petId,
            u.id,
            requestUserId,
          );
          matchScore = result.score;
        } catch {
          // pet ou adotante inválido; segue com matchScore null
        }

        const filled = PROFILE_FIELDS.filter((f) => {
          const v = (u as Record<string, unknown>)[f];
          if (v === undefined || v === null) return false;
          if (typeof v === 'string') return v.trim() !== '';
          return true;
        }).length;
        const profileCompleteness = Math.round(
          (filled / PROFILE_FIELDS_COUNT) * 100,
        );

        const hasConversation = conversationAdopterIds.has(u.id);

        const priorityScore = Math.round(
          (WEIGHT_MATCH * (matchScore ?? 0) / 100 +
            WEIGHT_COMPLETENESS * profileCompleteness / 100 +
            WEIGHT_CONVERSATION * (hasConversation ? 1 : 0)) *
            100,
        );

        return {
          adopterId: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl ?? undefined,
          matchScore,
          profileCompleteness,
          hasConversation,
          conversationId: conversationByAdopterId.get(u.id) ?? undefined,
          priorityScore: Math.min(100, Math.max(0, priorityScore)),
        };
      }),
    );

    items.sort((a, b) => b.priorityScore - a.priorityScore);
    return items;
  }
}
