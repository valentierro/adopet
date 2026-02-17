import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeSimilarityScore } from './compute-similarity-score';
import type { PetSimilarityProfile, SimilarPetScoreItem } from './similar-pets-engine.types';

const CANDIDATE_POOL_SIZE = 80;

@Injectable()
export class SimilarPetsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna ids de pets similares ao pet informado, ordenados por score de similaridade (maior primeiro).
   * Considera apenas pets disponíveis, aprovados e não expirados; mesma espécie.
   */
  async getSimilarScores(petId: string, limit = 12): Promise<SimilarPetScoreItem[]> {
    const source = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: {
        id: true,
        species: true,
        size: true,
        age: true,
        sex: true,
        energyLevel: true,
        temperament: true,
        breed: true,
      },
    });
    if (!source) throw new NotFoundException('Pet não encontrado');

    const now = new Date();
    const candidates = await this.prisma.pet.findMany({
      where: {
        id: { not: petId },
        species: source.species,
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        species: true,
        size: true,
        age: true,
        sex: true,
        energyLevel: true,
        temperament: true,
        breed: true,
      },
      take: CANDIDATE_POOL_SIZE,
      orderBy: { createdAt: 'desc' },
    });

    const sourceProfile: PetSimilarityProfile = {
      id: source.id,
      species: source.species,
      size: source.size,
      age: source.age,
      sex: source.sex,
      energyLevel: source.energyLevel,
      temperament: source.temperament,
      breed: source.breed,
    };

    const scored: SimilarPetScoreItem[] = candidates.map((c) => ({
      petId: c.id,
      similarityScore: computeSimilarityScore(sourceProfile, {
        id: c.id,
        species: c.species,
        size: c.size,
        age: c.age,
        sex: c.sex,
        energyLevel: c.energyLevel,
        temperament: c.temperament,
        breed: c.breed,
      }),
    }));

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, limit);
  }
}
