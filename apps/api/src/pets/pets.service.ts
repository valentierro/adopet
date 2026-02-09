import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import { PushService } from '../notifications/push.service';
import type { PetResponseDto } from './dto/pet-response.dto';
import type { CreatePetDto } from './dto/create-pet.dto';
import type { UpdatePetDto } from './dto/update-pet.dto';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly tutorStatsService: TutorStatsService,
    private readonly config: ConfigService,
    private readonly push: PushService,
  ) {}

  private mapToDto(
    pet: {
      id: string;
      name: string;
      species: string;
      age: number;
      sex: string;
      size: string;
      vaccinated: boolean;
      neutered: boolean;
      description: string;
      ownerId: string;
      status: string;
      publicationStatus?: string | null;
      createdAt: Date;
      updatedAt: Date;
      latitude?: number | null;
      longitude?: number | null;
      breed?: string | null;
      adoptionReason?: string | null;
      media: { id: string; url: string; sortOrder?: number }[];
    },
    userLat?: number,
    userLng?: number,
    verified?: boolean,
  ): PetResponseDto {
    let distanceKm: number | undefined;
    if (userLat != null && userLng != null && pet.latitude != null && pet.longitude != null) {
      distanceKm = this.haversineKm(userLat, userLng, pet.latitude, pet.longitude);
    }
    const dto: PetResponseDto = {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      age: pet.age,
      sex: pet.sex,
      size: pet.size,
      vaccinated: pet.vaccinated,
      neutered: pet.neutered,
      description: pet.description,
      distanceKm,
      photos: (pet.media ?? []).map((m) => m.url),
      ownerId: pet.ownerId,
      status: pet.status,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
      verified,
    };
    if (pet.breed != null) dto.breed = pet.breed;
    if (pet.adoptionReason != null) dto.adoptionReason = pet.adoptionReason;
    if (pet.publicationStatus != null) dto.publicationStatus = pet.publicationStatus;
    return dto;
  }

  private mapOwnerToPublicDto(
    owner: {
      id: string;
      name: string;
      avatarUrl: string | null;
      city: string | null;
      bio: string | null;
      housingType: string | null;
      hasYard: boolean | null;
      hasOtherPets: boolean | null;
      hasChildren: boolean | null;
      timeAtHome: string | null;
    },
    petsCount: number,
    verified?: boolean,
  ): NonNullable<PetResponseDto['owner']> {
    const dto: NonNullable<PetResponseDto['owner']> = {
      id: owner.id,
      name: owner.name,
      avatarUrl: owner.avatarUrl ?? undefined,
      petsCount,
    };
    if (verified === true) dto.verified = true;
    if (owner.city != null) dto.city = owner.city;
    if (owner.bio != null) dto.bio = owner.bio;
    if (owner.housingType != null) dto.housingType = owner.housingType;
    if (owner.hasYard != null) dto.hasYard = owner.hasYard;
    if (owner.hasOtherPets != null) dto.hasOtherPets = owner.hasOtherPets;
    if (owner.hasChildren != null) dto.hasChildren = owner.hasChildren;
    if (owner.timeAtHome != null) dto.timeAtHome = owner.timeAtHome;
    return dto;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  async findAll(): Promise<PetResponseDto[]> {
    const pets = await this.prisma.pet.findMany({
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
    const verifiedIds = await this.verificationService.getVerifiedPetIds(pets.map((p) => p.id));
    return pets.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
  }

  async findOne(id: string, userLat?: number, userLng?: number): Promise<PetResponseDto | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        owner: {
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
          },
        },
      },
    });
    if (!pet) return null;
    const [verified, petsCount, ownerVerified] = await Promise.all([
      this.verificationService.isPetVerified(pet.id),
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      pet.owner ? this.verificationService.isUserVerified(pet.owner.id) : Promise.resolve(false),
    ]);
    const dto = this.mapToDto(pet, userLat, userLng, verified);
    if (pet.owner) {
      dto.owner = this.mapOwnerToPublicDto(pet.owner, petsCount, ownerVerified);
      dto.owner.tutorStats = await this.tutorStatsService.getStats(pet.ownerId);
    }
    if (pet.media?.length) {
      dto.mediaItems = pet.media.map((m) => ({
        id: m.id,
        url: m.url,
        sortOrder: m.sortOrder ?? 0,
      }));
    }
    return dto;
  }

  /** [Admin] Listar pets com publicação pendente (para aprovar/rejeitar no feed). */
  async findPendingPublication(): Promise<PetResponseDto[]> {
    const pets = await this.prisma.pet.findMany({
      where: { publicationStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    const petIds = pets.map((p) => p.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(petIds);
    return pets.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
  }

  /** [Admin] Aprovar ou rejeitar anúncio (publicação no feed). */
  async setPublicationStatus(petId: string, status: 'APPROVED' | 'REJECTED'): Promise<PetResponseDto | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    if (!pet) return null;
    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: { publicationStatus: status },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    const verified = await this.verificationService.isPetVerified(updated.id);
    return this.mapToDto(updated, undefined, undefined, verified);
  }

  /** Perfil público do tutor do pet (sem dados de contato). */
  async findOwnerProfileByPetId(petId: string): Promise<NonNullable<PetResponseDto['owner']> | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
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
          },
        },
      },
    });
    if (!pet?.owner) return null;
    const [petsCount, ownerVerified] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      this.verificationService.isUserVerified(pet.owner.id),
    ]);
    const ownerDto = this.mapOwnerToPublicDto(pet.owner, petsCount, ownerVerified);
    ownerDto.tutorStats = await this.tutorStatsService.getStats(pet.owner.id);
    return ownerDto;
  }

  /** Perfil do tutor com telefone (apenas para admin). */
  async findOwnerProfileByPetIdForAdmin(petId: string): Promise<(NonNullable<PetResponseDto['owner']> & { phone?: string }) | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        owner: {
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
            phone: true,
          },
        },
      },
    });
    if (!pet?.owner) return null;
    const [petsCount, ownerVerified] = await Promise.all([
      this.prisma.pet.count({ where: { ownerId: pet.ownerId } }),
      this.verificationService.isUserVerified(pet.owner.id),
    ]);
    const ownerDto = this.mapOwnerToPublicDto(
      {
        id: pet.owner.id,
        name: pet.owner.name,
        avatarUrl: pet.owner.avatarUrl,
        city: pet.owner.city,
        bio: pet.owner.bio,
        housingType: pet.owner.housingType,
        hasYard: pet.owner.hasYard,
        hasOtherPets: pet.owner.hasOtherPets,
        hasChildren: pet.owner.hasChildren,
        timeAtHome: pet.owner.timeAtHome,
      },
      petsCount,
      ownerVerified,
    ) as NonNullable<PetResponseDto['owner']> & { phone?: string };
    ownerDto.tutorStats = await this.tutorStatsService.getStats(pet.owner.id);
    if (pet.owner.phone) ownerDto.phone = pet.owner.phone;
    return ownerDto;
  }

  private readonly MINE_PAGE_SIZE = 20;

  async findMine(
    ownerId: string,
    opts?: { cursor?: string; species?: string; status?: string },
  ): Promise<{ items: PetResponseDto[]; nextCursor: string | null }> {
    const cursor = opts?.cursor;
    const where: { ownerId: string; species?: string; status?: string } = { ownerId };
    if (opts?.species && opts.species !== 'BOTH') {
      where.species = opts.species.toUpperCase();
    }
    if (opts?.status) {
      where.status = opts.status;
    }
    const pets = await this.prisma.pet.findMany({
      where,
      take: this.MINE_PAGE_SIZE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    const hasMore = pets.length > this.MINE_PAGE_SIZE;
    const items = pets.slice(0, this.MINE_PAGE_SIZE);
    const petIds = items.map((p) => p.id);
    const verifiedIds = await this.verificationService.getVerifiedPetIds(petIds);
    const dtos = items.map((p) => this.mapToDto(p, undefined, undefined, verifiedIds.has(p.id)));
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
    return { items: dtos, nextCursor };
  }

  async create(ownerId: string, dto: CreatePetDto): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.create({
      data: {
        ownerId,
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        age: dto.age,
        sex: dto.sex,
        size: dto.size,
        vaccinated: dto.vaccinated,
        neutered: dto.neutered,
        description: dto.description,
        adoptionReason: dto.adoptionReason,
        latitude: dto.latitude,
        longitude: dto.longitude,
        status: 'AVAILABLE',
        publicationStatus: 'PENDING',
      },
      include: { media: true },
    });
    if (dto.initialPhotoUrl) {
      await this.prisma.petMedia.create({
        data: {
          petId: pet.id,
          url: dto.initialPhotoUrl,
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }
    const withMedia = await this.prisma.pet.findUnique({
      where: { id: pet.id },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    const verified = withMedia
      ? await this.verificationService.isPetVerified(withMedia.id)
      : false;
    return this.mapToDto(withMedia!, undefined, undefined, verified);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.species !== undefined && { species: dto.species }),
        ...(dto.breed !== undefined && { breed: dto.breed }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.sex !== undefined && { sex: dto.sex }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.vaccinated !== undefined && { vaccinated: dto.vaccinated }),
        ...(dto.neutered !== undefined && { neutered: dto.neutered }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.adoptionReason !== undefined && { adoptionReason: dto.adoptionReason }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      },
      include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    });
    const verified = await this.verificationService.isPetVerified(pet.id);
    return this.mapToDto(pet, undefined, undefined, verified);
  }

  async patchStatus(
    id: string,
    ownerId: string,
    status: 'AVAILABLE' | 'IN_PROCESS' | 'ADOPTED',
  ): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        status,
        ...(status === 'ADOPTED' ? { markedAdoptedAt: new Date() } : {}),
      },
      include: {
        media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        owner: { select: { name: true } },
      },
    });
    if (status === 'ADOPTED' && pet.owner) {
      const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const title = 'Pet marcado como adotado';
      const body = `${pet.name} foi marcado como adotado pelo tutor ${pet.owner.name}. Confira no painel para registrar a adoção.`;
      for (const adminId of adminIds) {
        this.push.sendToUser(adminId, title, body, { screen: 'admin', petId: pet.id }).catch(() => {});
      }
    }
    const verified = await this.verificationService.isPetVerified(pet.id);
    return this.mapToDto(pet, undefined, undefined, verified);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      select: { ownerId: true, status: true },
    });
    if (!pet || pet.ownerId !== ownerId) {
      throw new BadRequestException('Pet não encontrado ou você não é o dono');
    }
    if (pet.status === 'ADOPTED') {
      throw new BadRequestException('Não é possível remover um anúncio de pet já adotado');
    }
    await this.prisma.pet.delete({ where: { id } });
  }

  async deleteMedia(petId: string, ownerId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.petMedia.findFirst({
      where: { id: mediaId, petId },
      include: { pet: true },
    });
    if (!media || media.pet.ownerId !== ownerId) {
      throw new BadRequestException('Mídia não encontrada ou você não é o dono do pet');
    }
    await this.prisma.petMedia.delete({ where: { id: mediaId } });
  }

  async reorderMedia(petId: string, ownerId: string, mediaIds: string[]): Promise<PetResponseDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { media: true },
    });
    if (!pet || pet.ownerId !== ownerId) {
      throw new BadRequestException('Pet não encontrado ou você não é o dono');
    }
    const validIds = new Set(pet.media.map((m) => m.id));
    if (mediaIds.some((id) => !validIds.has(id)) || mediaIds.length !== validIds.size) {
      throw new BadRequestException('mediaIds deve conter exatamente os IDs das mídias do pet');
    }
    await Promise.all(
      mediaIds.map((id, index) =>
        this.prisma.petMedia.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        }),
      ),
    );
    const updated = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    const verified = await this.verificationService.isPetVerified(petId);
    return this.mapToDto(updated!, undefined, undefined, verified);
  }
}
