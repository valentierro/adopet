import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import type { SavedSearchItemDto } from './dto/saved-search-response.dto';

@Injectable()
export class SavedSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSavedSearchDto): Promise<SavedSearchItemDto> {
    const search = await this.prisma.savedSearch.create({
      data: {
        userId,
        species: dto.species ?? undefined,
        size: dto.size ?? undefined,
        breed: dto.breed?.trim() || undefined,
        latitude: dto.latitude ?? undefined,
        longitude: dto.longitude ?? undefined,
        radiusKm: dto.radiusKm ?? 50,
      },
    });
    return this.toDto(search);
  }

  async list(userId: string): Promise<SavedSearchItemDto[]> {
    const list = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((s) => this.toDto(s));
  }

  async delete(userId: string, id: string): Promise<{ message: string }> {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
    });
    if (!search) throw new NotFoundException('Busca salva não encontrada');
    await this.prisma.savedSearch.delete({ where: { id } });
    return { message: 'OK' };
  }

  private toDto(s: {
    id: string;
    species: string | null;
    size: string | null;
    breed: string | null;
    latitude: number | null;
    longitude: number | null;
    radiusKm: number;
    createdAt: Date;
  }): SavedSearchItemDto {
    return {
      id: s.id,
      species: s.species ?? undefined,
      size: s.size ?? undefined,
      breed: s.breed ?? undefined,
      latitude: s.latitude ?? undefined,
      longitude: s.longitude ?? undefined,
      radiusKm: s.radiusKm,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
