import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { VerificationStatusDto, VerificationItemDto } from './dto/verification-status.dto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async request(
    userId: string,
    type: 'USER_VERIFIED' | 'PET_VERIFIED',
    petId?: string,
  ): Promise<VerificationItemDto> {
    if (type === 'PET_VERIFIED' && !petId) {
      throw new BadRequestException('petId é obrigatório para verificação de pet');
    }
    if (type === 'PET_VERIFIED' && petId) {
      const pet = await this.prisma.pet.findFirst({
        where: { id: petId, ownerId: userId },
      });
      if (!pet) {
        throw new BadRequestException('Pet não encontrado ou você não é o dono');
      }
    }

    const verification = await this.prisma.verification.create({
      data: {
        userId,
        type,
        status: 'PENDING',
        metadata: type === 'PET_VERIFIED' && petId ? { petId } : undefined,
      },
    });
    return this.toItemDto(verification);
  }

  async getStatus(userId: string): Promise<VerificationStatusDto> {
    const [requests, userApproved] = await Promise.all([
      this.prisma.verification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.verification.findFirst({
        where: { userId, type: 'USER_VERIFIED', status: 'APPROVED' },
      }),
    ]);

    return {
      requests: requests.map((r) => this.toItemDto(r)),
      userVerified: !!userApproved,
    };
  }

  async isUserVerified(userId: string): Promise<boolean> {
    const v = await this.prisma.verification.findFirst({
      where: { userId, type: 'USER_VERIFIED', status: 'APPROVED' },
    });
    return !!v;
  }

  async isPetVerified(petId: string): Promise<boolean> {
    const v = await this.prisma.verification.findFirst({
      where: {
        type: 'PET_VERIFIED',
        status: 'APPROVED',
        metadata: { path: ['petId'], equals: petId },
      },
    });
    return !!v;
  }

  /** Lista solicitações pendentes (admin). */
  async listPending(): Promise<VerificationItemDto[]> {
    const list = await this.prisma.verification.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((v) => this.toItemDto(v));
  }

  /** Aprovar ou rejeitar solicitação (admin). */
  async resolve(id: string, status: 'APPROVED' | 'REJECTED'): Promise<VerificationItemDto> {
    const v = await this.prisma.verification.update({
      where: { id },
      data: { status },
    });
    return this.toItemDto(v);
  }

  /** [Admin] Revogar verificação aprovada (passa a não contar mais como verificada). */
  async revoke(id: string): Promise<VerificationItemDto> {
    const v = await this.prisma.verification.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    return this.toItemDto(v);
  }

  /** [Admin] Listar verificações aprovadas (para revogar), com userName e petName para exibição. */
  async listApproved(): Promise<VerificationItemDto[]> {
    const list = await this.prisma.verification.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
    const petIds = list
      .map((v) => (v.metadata as { petId?: string } | null)?.petId)
      .filter((id): id is string => !!id);
    const petMap = new Map<string, string>();
    if (petIds.length > 0) {
      const pets = await this.prisma.pet.findMany({
        where: { id: { in: petIds } },
        select: { id: true, name: true },
      });
      for (const p of pets) petMap.set(p.id, p.name);
    }
    return list.map((v) => {
      const dto = this.toItemDto(v);
      const meta = v.metadata as { petId?: string } | null;
      return {
        ...dto,
        userName: v.user?.name,
        petName: meta?.petId ? petMap.get(meta.petId) : undefined,
      };
    });
  }

  /** Retorna o conjunto de IDs de pets que possuem verificação aprovada (evita N+1 no feed/listagens). */
  async getVerifiedPetIds(petIds: string[]): Promise<Set<string>> {
    if (petIds.length === 0) return new Set();
    const list = await this.prisma.verification.findMany({
      where: {
        type: 'PET_VERIFIED',
        status: 'APPROVED',
      },
      select: { metadata: true },
    });
    const set = new Set<string>();
    const idSet = new Set(petIds);
    for (const row of list) {
      const meta = row.metadata as { petId?: string } | null;
      if (meta?.petId && idSet.has(meta.petId)) set.add(meta.petId);
    }
    return set;
  }

  private toItemDto(v: {
    id: string;
    type: string;
    status: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): VerificationItemDto {
    const meta = v.metadata as { petId?: string } | null;
    return {
      id: v.id,
      type: v.type,
      status: v.status,
      petId: meta?.petId,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }
}
