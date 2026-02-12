import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSwipeDto } from './dto/create-swipe.dto';
import type { PetResponseDto } from '../pets/dto/pet-response.dto';

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
    const swipes = await this.prisma.swipe.findMany({
      where: { userId, action: 'PASS' },
      orderBy: { createdAt: 'desc' },
      include: {
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 5 },
            partner: { select: { id: true, name: true, slug: true, logoUrl: true, isPaidPartner: true } },
          },
        },
      },
    });
    const items = swipes.map((s) => this.petToDto(s.pet));
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
