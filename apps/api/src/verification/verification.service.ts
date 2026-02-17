import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../notifications/push.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import type { VerificationStatusDto, VerificationItemDto } from './dto/verification-status.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    @Inject(forwardRef(() => TutorStatsService))
    private readonly tutorStats: TutorStatsService,
  ) {}

  async request(
    userId: string,
    type: 'USER_VERIFIED' | 'PET_VERIFIED',
    petId?: string,
    evidenceUrls?: string[],
    skipEvidenceReason?: string,
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

    const urls = evidenceUrls?.filter((u) => typeof u === 'string' && u.trim().length > 0) ?? [];
    const skipReason = skipEvidenceReason?.trim() || undefined;

    if (!skipReason) {
      if (type === 'USER_VERIFIED' && urls.length < 1) {
        throw new BadRequestException(
          'Envie pelo menos uma foto de rosto (sem óculos escuros) para solicitar verificação de perfil. Se você não puder enviar fotos, use a opção "Não consigo enviar fotos".',
        );
      }
      if (type === 'PET_VERIFIED' && urls.length < 2) {
        throw new BadRequestException(
          'Envie duas fotos: uma do seu rosto (sem óculos escuros) e outra sua com o pet. Se você não puder enviar fotos, use a opção "Não consigo enviar fotos".',
        );
      }
    }

    const existingPending = await this.prisma.verification.findFirst({
      where: {
        userId,
        status: 'PENDING',
        ...(type === 'PET_VERIFIED' && petId
          ? { type: 'PET_VERIFIED', metadata: { path: ['petId'], equals: petId } }
          : { type: 'USER_VERIFIED' }),
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        type === 'PET_VERIFIED'
          ? 'Você já tem uma solicitação de verificação em análise para este pet. Aguarde a resposta antes de solicitar novamente.'
          : 'Você já tem uma solicitação de verificação de perfil em análise. Aguarde a resposta antes de solicitar novamente.',
      );
    }

    const metadata: { petId?: string; evidenceUrls?: string[]; skipEvidenceReason?: string } =
      type === 'PET_VERIFIED' && petId ? { petId } : {};
    if (urls.length > 0) metadata.evidenceUrls = urls;
    if (skipReason) metadata.skipEvidenceReason = skipReason;

    const verification = await this.prisma.verification.create({
      data: {
        userId,
        type,
        status: 'PENDING',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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

  /** Lista solicitações pendentes (admin) com dados do usuário e do pet para cards. */
  async listPending(): Promise<VerificationItemDto[]> {
    const list = await this.prisma.verification.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, city: true, username: true } },
      },
    });
    const petIds = list
      .map((v) => (v.metadata as { petId?: string } | null)?.petId)
      .filter((id): id is string => !!id);
    let petMap = new Map<
      string,
      { name: string; species: string; age: number; sex: string; vaccinated: boolean; neutered: boolean; photoUrl?: string; ownerName?: string }
    >();
    if (petIds.length > 0) {
      const pets = await this.prisma.pet.findMany({
        where: { id: { in: petIds } },
        select: {
          id: true,
          name: true,
          species: true,
          age: true,
          sex: true,
          vaccinated: true,
          neutered: true,
          media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          owner: { select: { name: true } },
        },
      });
      for (const p of pets) {
        petMap.set(p.id, {
          name: p.name,
          species: p.species,
          age: p.age,
          sex: p.sex,
          vaccinated: p.vaccinated,
          neutered: p.neutered,
          photoUrl: p.media[0]?.url,
          ownerName: p.owner?.name,
        });
      }
    }
    const dtos = list.map((v) => {
      const dto = this.toItemDto(v);
      dto.userId = v.user?.id;
      dto.userName = v.user?.name;
      dto.userAvatarUrl = v.user?.avatarUrl ?? undefined;
      dto.userCity = v.user?.city ?? undefined;
      dto.userUsername = v.user?.username ?? undefined;
      const meta = v.metadata as { petId?: string } | null;
      if (meta?.petId && petMap.has(meta.petId)) {
        const pet = petMap.get(meta.petId)!;
        dto.petName = pet.name;
        dto.petSpecies = pet.species;
        dto.petAge = pet.age;
        dto.petSex = pet.sex;
        dto.petVaccinated = pet.vaccinated;
        dto.petNeutered = pet.neutered;
        dto.petPhotoUrl = pet.photoUrl;
        dto.petOwnerName = pet.ownerName;
      }
      return dto;
    });
    const userIds = [...new Set(list.map((v) => v.user?.id).filter((id): id is string => !!id))];
    const ongMemberIds = new Set<string>();
    if (userIds.length > 0) {
      const members = await this.prisma.partnerMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, partner: { select: { type: true } } },
      });
      for (const m of members) {
        if (m.partner?.type === 'ONG') ongMemberIds.add(m.userId);
      }
    }
    const badgeMap = new Map<
      string,
      { userVerified: boolean; userTutorLevel: string; userTutorTitle: string; userOngMember: boolean }
    >();
    const fallbackTitle = 'Tutor Iniciante';
    const fallbackLevel = 'BEGINNER';
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const [userVerified, stats] = await Promise.all([
            this.isUserVerified(uid),
            this.tutorStats.getStats(uid),
          ]);
          badgeMap.set(uid, {
            userVerified,
            userTutorLevel: stats.level,
            userTutorTitle: stats.title,
            userOngMember: ongMemberIds.has(uid),
          });
        } catch (err) {
          console.warn(`[VerificationService] listPending badges for user ${uid}:`, err);
          badgeMap.set(uid, {
            userVerified: false,
            userTutorLevel: fallbackLevel,
            userTutorTitle: fallbackTitle,
            userOngMember: ongMemberIds.has(uid),
          });
        }
      }),
    );
    for (let i = 0; i < list.length; i++) {
      const uid = list[i].user?.id;
      if (uid && badgeMap.has(uid)) {
        const b = badgeMap.get(uid)!;
        dtos[i].userVerified = b.userVerified;
        dtos[i].userTutorLevel = b.userTutorLevel;
        dtos[i].userTutorTitle = b.userTutorTitle;
        dtos[i].userOngMember = b.userOngMember;
      }
    }
    return dtos;
  }

  /** Aprovar ou rejeitar solicitação (admin). Envia push ao usuário com o resultado. */
  async resolve(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<VerificationItemDto> {
    const v = await this.prisma.verification.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? (rejectionReason?.trim() || null) : null,
      },
      include: { user: { select: { name: true } } },
    });
    const dto = this.toItemDto(v);
    const meta = v.metadata as { petId?: string } | null;
    const petName = meta?.petId
      ? await this.prisma.pet.findUnique({ where: { id: meta.petId }, select: { name: true } }).then((p) => p?.name)
      : null;
    const targetLabel = v.type === 'PET_VERIFIED' && petName ? `pet ${petName}` : 'perfil';
    if (status === 'APPROVED') {
      this.push
        .sendToUser(v.userId, 'Verificação aprovada', `Sua verificação de ${targetLabel} foi aprovada!`, {
          screen: 'verification',
        })
        .catch((e) => console.warn('[VerificationService] push approved failed', e));
    } else {
      const body = rejectionReason
        ? `Sua solicitação de verificação não foi aprovada: ${rejectionReason}. Você pode solicitar novamente após ajustes.`
        : 'Sua solicitação de verificação não foi aprovada. Você pode solicitar novamente após ajustes.';
      this.push
        .sendToUser(v.userId, 'Verificação não aprovada', body, { screen: 'verification' })
        .catch((e) => console.warn('[VerificationService] push rejected failed', e));
    }
    return dto;
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
    rejectionReason?: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): VerificationItemDto {
    const meta = (v.metadata as { petId?: string; evidenceUrls?: string[]; skipEvidenceReason?: string } | null) ?? {};
    const dto: VerificationItemDto = {
      id: v.id,
      type: v.type,
      status: v.status,
      petId: meta.petId,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
    if (v.rejectionReason != null) dto.rejectionReason = v.rejectionReason;
    if (meta.evidenceUrls?.length) dto.evidenceUrls = meta.evidenceUrls;
    if (meta.skipEvidenceReason) dto.skipEvidenceReason = meta.skipEvidenceReason;
    return dto;
  }
}
