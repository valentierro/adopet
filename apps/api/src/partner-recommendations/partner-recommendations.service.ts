import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartnerRecommendationDto } from './dto/create-partner-recommendation.dto';
import type { PartnerRecommendationResponseDto } from './dto/partner-recommendation-response.dto';

@Injectable()
export class PartnerRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePartnerRecommendationDto, userId: string): Promise<{ id: string }> {
    const rec = await this.prisma.partnerRecommendation.create({
      data: {
        indicadorUserId: userId,
        suggestedName: dto.suggestedName.trim(),
        suggestedType: dto.suggestedType,
        suggestedCity: dto.suggestedCity?.trim() || null,
        suggestedEmail: dto.suggestedEmail?.trim() || null,
        suggestedPhone: dto.suggestedPhone?.trim() || null,
        message: dto.message?.trim() || null,
      },
    });
    return { id: rec.id };
  }

  async findAllForAdmin(): Promise<PartnerRecommendationResponseDto[]> {
    const list = await this.prisma.partnerRecommendation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        indicador: { select: { id: true, name: true, email: true } },
      },
    });
    return list.map((r) => ({
      id: r.id,
      indicadorUserId: r.indicadorUserId,
      indicadorName: r.indicador?.name ?? null,
      indicadorEmail: r.indicador?.email ?? null,
      suggestedName: r.suggestedName,
      suggestedType: r.suggestedType,
      suggestedCity: r.suggestedCity ?? undefined,
      suggestedEmail: r.suggestedEmail ?? undefined,
      suggestedPhone: r.suggestedPhone ?? undefined,
      message: r.message ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
