import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import {
  POINTS_PER_VERIFIED_PET,
  POINTS_PER_ADOPTED_PET,
  BONUS_FIRST_ADOPTION,
  MILESTONE_BONUS,
  MILESTONE_AT,
  TUTOR_LEVELS,
} from './tutor-stats.constants';

export type TutorStatsDto = {
  points: number;
  level: string;
  title: string;
  verifiedCount: number;
  adoptedCount: number;
};

@Injectable()
export class TutorStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
  ) {}

  async getStats(userId: string): Promise<TutorStatsDto> {
    const pets = await this.prisma.pet.findMany({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });

    const petIds = pets.length > 0 ? pets.map((p) => p.id) : [];
    const verifiedCount =
      petIds.length > 0 ? (await this.verificationService.getVerifiedPetIds(petIds)).size : 0;

    // Só contam adoções confirmadas pela Adopet (admin ou 48h)
    const adoptedCountAsTutor = await this.prisma.adoption.count({
      where: { tutorId: userId, pet: { adopetConfirmedAt: { not: null } } },
    });
    const adoptedCountAsAdopter = await this.prisma.adoption.count({
      where: { adopterId: userId, pet: { adopetConfirmedAt: { not: null } } },
    });
    const totalAdoptedCount = adoptedCountAsTutor + adoptedCountAsAdopter;
    // adoptedCount no retorno = pets que doou com adoção confirmada (para exibir "X adoções" no perfil)
    const adoptedCount = adoptedCountAsTutor;

    let points = verifiedCount * POINTS_PER_VERIFIED_PET + totalAdoptedCount * POINTS_PER_ADOPTED_PET;
    if (totalAdoptedCount >= 1) points += BONUS_FIRST_ADOPTION;
    for (const at of MILESTONE_AT) {
      if (totalAdoptedCount >= at) points += MILESTONE_BONUS;
    }
    points = Math.max(0, Math.round(points));
    if (Number.isNaN(points)) points = 0;

    return this.toStats(points, verifiedCount, adoptedCount);
  }

  private toStats(points: number, verifiedCount: number, adoptedCount: number): TutorStatsDto {
    const safePoints = Number.isFinite(points) && points >= 0 ? points : 0;
    const levelEntry =
      TUTOR_LEVELS.find((l) => safePoints >= l.minPoints) ?? TUTOR_LEVELS[TUTOR_LEVELS.length - 1];
    return {
      points: safePoints,
      level: levelEntry.level,
      title: levelEntry.title,
      verifiedCount: Math.max(0, Number.isFinite(verifiedCount) ? verifiedCount : 0),
      adoptedCount: Math.max(0, Number.isFinite(adoptedCount) ? adoptedCount : 0),
    };
  }
}
