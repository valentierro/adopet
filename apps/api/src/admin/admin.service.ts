import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminStatsDto } from './dto/admin-stats.dto';
import type { AdoptionItemDto } from './dto/adoption-item.dto';
import type { UserSearchItemDto } from './dto/user-search-item.dto';
import type { PetAvailableItemDto } from './dto/pet-available-item.dto';
import type { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';

const SYSTEM_USER_EMAIL_DEFAULT = 'system@adopet.internal';
const AUTO_APPROVE_HOURS = 48;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAdoptions, adoptionsThisMonth, pendingPetsCount, pendingReportsCount, pendingAdoptionsByTutorCount] =
      await Promise.all([
        this.prisma.adoption.count(),
        this.prisma.adoption.count({
          where: { adoptedAt: { gte: startOfMonth } },
        }),
        this.prisma.pet.count({ where: { publicationStatus: 'PENDING' } }),
        this.prisma.report.count({ where: { resolvedAt: null } }),
        this.prisma.pet.count({
          where: {
            status: 'ADOPTED',
            adoption: null,
          },
        }),
      ]);

    return {
      totalAdoptions,
      adoptionsThisMonth,
      pendingPetsCount,
      pendingReportsCount,
      pendingAdoptionsByTutorCount,
    };
  }

  async getPendingAdoptionsByTutor(): Promise<PendingAdoptionByTutorDto[]> {
    const adoptedPetIds = await this.prisma.adoption.findMany({ select: { petId: true } }).then((a) => a.map((x) => x.petId));
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'ADOPTED',
        ...(adoptedPetIds.length > 0 ? { id: { notIn: adoptedPetIds } } : {}),
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return pets.map((p) => {
      const markedAt = p.markedAdoptedAt ?? p.updatedAt;
      const autoApproveAt = p.markedAdoptedAt
        ? new Date(p.markedAdoptedAt.getTime() + AUTO_APPROVE_HOURS * 60 * 60 * 1000)
        : null;
      return {
        petId: p.id,
        petName: p.name,
        tutorId: p.ownerId,
        tutorName: p.owner.name,
        markedAt: markedAt.toISOString(),
        autoApproveAt: autoApproveAt?.toISOString() ?? undefined,
      };
    });
  }

  async getAdoptions(): Promise<AdoptionItemDto[]> {
    const list = await this.prisma.adoption.findMany({
      orderBy: { adoptedAt: 'desc' },
      include: {
        pet: { select: { name: true } },
        tutor: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
      },
    });
    return list.map((a) => ({
      id: a.id,
      petId: a.petId,
      petName: a.pet.name,
      tutorId: a.tutorId,
      tutorName: a.tutor.name,
      adopterId: a.adopterId,
      adopterName: a.adopter.name,
      adoptedAt: a.adoptedAt.toISOString(),
    }));
  }

  async createAdoption(petId: string, adopterUserId: string): Promise<AdoptionItemDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: { select: { id: true, name: true } } },
    });
    if (!pet) {
      throw new BadRequestException('Pet não encontrado');
    }
    const adopter = await this.prisma.user.findUnique({
      where: { id: adopterUserId },
      select: { id: true, name: true },
    });
    if (!adopter) {
      throw new BadRequestException('Usuário adotante não encontrado');
    }
    const existing = await this.prisma.adoption.findUnique({
      where: { petId },
    });
    if (existing) {
      throw new BadRequestException('Este pet já possui um registro de adoção');
    }
    if (pet.ownerId === adopterUserId) {
      throw new BadRequestException('O adotante não pode ser o próprio tutor do pet');
    }

    const adoption = await this.prisma.$transaction(async (tx) => {
      const created = await tx.adoption.create({
        data: {
          petId,
          tutorId: pet.ownerId,
          adopterId: adopterUserId,
        },
        include: {
          pet: { select: { name: true } },
          tutor: { select: { id: true, name: true } },
          adopter: { select: { id: true, name: true } },
        },
      });
      await tx.pet.update({
        where: { id: petId },
        data: { status: 'ADOPTED' },
      });
      return created;
    });

    return {
      id: adoption.id,
      petId: adoption.petId,
      petName: adoption.pet.name,
      tutorId: adoption.tutorId,
      tutorName: adoption.tutor.name,
      adopterId: adoption.adopterId,
      adopterName: adoption.adopter.name,
      adoptedAt: adoption.adoptedAt.toISOString(),
    };
  }

  async searchUsers(search: string): Promise<UserSearchItemDto[]> {
    const term = (search ?? '').trim();
    if (term.length < 2) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: {
        deactivatedAt: null,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 20,
    });
    return users;
  }

  /** Retorna o id do usuário "Sistema" usado em adoções auto-aprovadas após 48h. Cria se não existir. */
  async getOrCreateSystemUser(): Promise<string> {
    const email =
      this.config.get<string>('SYSTEM_USER_EMAIL')?.trim() || SYSTEM_USER_EMAIL_DEFAULT;
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return existing.id;
    const passwordHash = await bcrypt.hash(
      `system-${Date.now()}-${Math.random().toString(36)}`,
      10,
    );
    const user = await this.prisma.user.create({
      data: {
        email,
        name: 'Sistema',
        passwordHash,
      },
      select: { id: true },
    });
    return user.id;
  }

  /** Cria registro de adoção para pets marcados como adotados há mais de 48h sem validação manual. */
  async runAutoApproveAdoptions(): Promise<{ processed: number }> {
    const systemUserId = await this.getOrCreateSystemUser();
    const deadline = new Date(Date.now() - AUTO_APPROVE_HOURS * 60 * 60 * 1000);
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'ADOPTED',
        adoption: null,
        OR: [
          { markedAdoptedAt: { lte: deadline } },
          { markedAdoptedAt: null },
        ],
      },
      select: { id: true, ownerId: true },
    });
    let processed = 0;
    for (const pet of pets) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.adoption.create({
            data: {
              petId: pet.id,
              tutorId: pet.ownerId,
              adopterId: systemUserId,
            },
          });
        });
        processed++;
      } catch (e) {
        console.warn('[AdminService] runAutoApproveAdoptions: skip pet', pet.id, e);
      }
    }
    return { processed };
  }

  async getPetsAvailable(): Promise<PetAvailableItemDto[]> {
    const adoptedPetIds = await this.prisma.adoption.findMany({ select: { petId: true } }).then((a) => a.map((x) => x.petId));
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'AVAILABLE',
        publicationStatus: 'APPROVED',
        ...(adoptedPetIds.length > 0 ? { id: { notIn: adoptedPetIds } } : {}),
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return pets.map((p) => ({
      id: p.id,
      name: p.name,
      ownerId: p.ownerId,
      ownerName: p.owner.name,
    }));
  }
}
