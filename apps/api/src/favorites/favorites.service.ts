import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import type { FavoriteItemDto } from './dto/favorite-response.dto';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
  ) {}

  async add(userId: string, petId: string): Promise<FavoriteItemDto> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_petId: { userId, petId } },
    });
    if (existing) throw new ConflictException('Pet já está nos favoritos');
    const fav = await this.prisma.favorite.create({
      data: { userId, petId },
      include: { pet: { include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } } } },
    });
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
      include: { pet: { include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } } } },
    });
    const safeList = Array.isArray(list) ? list : [];
    const withPet = safeList.filter((f) => f?.pet != null);
    const hasMore = safeList.length > this.PAGE_SIZE;
    const items = withPet.slice(0, this.PAGE_SIZE);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
    const petIds = items.map((f) => f.pet!.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(petIds);
    const dtos = items
      .map((f) => this.toItemDto(f, verifiedIds.has(f.pet!.id)))
      .filter((d): d is FavoriteItemDto => d != null);
    return { items: dtos, nextCursor };
  }

  private toItemDto(
    fav: {
      id: string;
      petId: string;
      createdAt: Date;
      pet: { id: string; name: string; species: string; age: number; status: string; media?: { url: string }[] } | null;
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
        photos: media.map((m) => m.url),
        status: pet.status,
        verified,
      },
    };
  }
}
