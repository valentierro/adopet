import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';

export interface SatisfactionStatsDto {
  totalResponses: number;
  averageTrust?: number;
  averageEase?: number;
  averageEaseOfUse?: number;
  averageCommunication?: number;
  averageOverall?: number;
  byRole?: {
    adopter: { count: number; avgOverall: number };
    tutor: { count: number; avgOverall: number };
  };
}

export interface SatisfactionResponseItemDto {
  id: string;
  adoptionId: string | null;
  userId: string;
  userName: string;
  role: string;
  trustScore: number;
  easeOfUseScore: number;
  communicationScore: number;
  overallScore: number;
  comment?: string | null;
  createdAt: string;
}

@Injectable()
export class SatisfactionService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, dto: SubmitSatisfactionDto): Promise<{ message: string }> {
    await this.prisma.satisfactionSurvey.create({
      data: {
        userId,
        adoptionId: dto.adoptionId ?? null,
        role: dto.role,
        trustScore: dto.trustScore,
        easeOfUseScore: dto.easeOfUseScore,
        communicationScore: dto.communicationScore,
        overallScore: dto.overallScore,
        comment: dto.comment ?? null,
      },
    });
    return { message: 'OK' };
  }

  async getStats(): Promise<SatisfactionStatsDto> {
    const [total, agg, adopterAgg, tutorAgg] = await Promise.all([
      this.prisma.satisfactionSurvey.count(),
      this.prisma.satisfactionSurvey.aggregate({
        _avg: {
          trustScore: true,
          easeOfUseScore: true,
          communicationScore: true,
          overallScore: true,
        },
      }),
      this.prisma.satisfactionSurvey.aggregate({
        where: { role: 'ADOPTER' },
        _count: { id: true },
        _avg: { overallScore: true },
      }),
      this.prisma.satisfactionSurvey.aggregate({
        where: { role: 'TUTOR' },
        _count: { id: true },
        _avg: { overallScore: true },
      }),
    ]);
    const adopterAvg = adopterAgg._avg.overallScore ?? 0;
    const tutorAvg = tutorAgg._avg.overallScore ?? 0;
    return {
      totalResponses: total,
      averageTrust: agg._avg.trustScore ?? undefined,
      averageEase: agg._avg.easeOfUseScore ?? undefined,
      averageEaseOfUse: agg._avg.easeOfUseScore ?? undefined,
      averageCommunication: agg._avg.communicationScore ?? undefined,
      averageOverall: agg._avg.overallScore ?? undefined,
      byRole: {
        adopter: { count: adopterAgg._count.id, avgOverall: adopterAvg },
        tutor: { count: tutorAgg._count.id, avgOverall: tutorAvg },
      },
    };
  }

  async getResponses(
    page: number,
    limit: number,
  ): Promise<{ items: SatisfactionResponseItemDto[]; total: number }> {
    const skip = Math.max(0, (page - 1) * limit);
    const [items, total] = await Promise.all([
      this.prisma.satisfactionSurvey.findMany({
        skip,
        take: Math.min(limit, 100),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          adoptionId: true,
          userId: true,
          role: true,
          trustScore: true,
          easeOfUseScore: true,
          communicationScore: true,
          overallScore: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.satisfactionSurvey.count(),
    ]);
    return {
      items: items.map((r) => ({
        id: r.id,
        adoptionId: r.adoptionId ?? null,
        userId: r.userId,
        userName: r.user?.name ?? 'Usuário',
        role: r.role,
        trustScore: r.trustScore,
        easeOfUseScore: r.easeOfUseScore,
        communicationScore: r.communicationScore,
        overallScore: r.overallScore,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }
}
