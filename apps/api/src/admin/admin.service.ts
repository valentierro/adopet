import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  getAdoptionCongratulationsAdopterHtml,
  getAdoptionCongratulationsAdopterText,
} from '../email/templates/adoption-congratulations-adopter.email';
import {
  getAdoptionCongratulationsTutorHtml,
  getAdoptionCongratulationsTutorText,
} from '../email/templates/adoption-congratulations-tutor.email';
import type { AdminStatsDto } from './dto/admin-stats.dto';
import type { AdoptionItemDto } from './dto/adoption-item.dto';
import type { UserSearchItemDto } from './dto/user-search-item.dto';
import type { PetAvailableItemDto } from './dto/pet-available-item.dto';
import type { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';

const SYSTEM_USER_EMAIL_DEFAULT = 'system@adopet.internal';
const SYSTEM_USER_NAME_DEFAULT = 'Adopet';
const AUTO_APPROVE_HOURS = 48;
const speciesLabel: Record<string, string> = { dog: 'Cachorro', cat: 'Gato', DOG: 'Cachorro', CAT: 'Gato' };

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAdoptions,
      adoptionsThisMonth,
      pendingPetsCount,
      pendingReportsCount,
      pendingAdoptionsByTutorCount,
      pendingVerificationsCount,
    ] = await Promise.all([
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
      this.prisma.verification.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalAdoptions,
      adoptionsThisMonth,
      pendingPetsCount,
      pendingReportsCount,
      pendingAdoptionsByTutorCount,
      pendingVerificationsCount,
    };
  }

  async getPendingAdoptionsByTutor(): Promise<PendingAdoptionByTutorDto[]> {
    const adoptedPetIds = await this.prisma.adoption.findMany({ select: { petId: true } }).then((a) => a.map((x) => x.petId));
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'ADOPTED',
        adoptionRejectedAt: null,
        ...(adoptedPetIds.length > 0 ? { id: { notIn: adoptedPetIds } } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        pendingAdopter: { select: { id: true, name: true, username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return pets.map((p) => {
      const markedAt = p.markedAdoptedAt ?? p.updatedAt;
      const autoApproveAt =
        p.markedAdoptedAt && p.adopterConfirmedAt
          ? new Date(p.markedAdoptedAt.getTime() + AUTO_APPROVE_HOURS * 60 * 60 * 1000)
          : null;
      return {
        petId: p.id,
        petName: p.name,
        tutorId: p.ownerId,
        tutorName: p.owner.name,
        markedAt: markedAt.toISOString(),
        autoApproveAt: autoApproveAt?.toISOString() ?? undefined,
        adopterConfirmedAt: p.adopterConfirmedAt?.toISOString() ?? undefined,
        pendingAdopterId: p.pendingAdopter?.id,
        pendingAdopterName: p.pendingAdopter?.name,
        pendingAdopterUsername: p.pendingAdopter?.username ?? undefined,
      };
    });
  }

  async getAdoptions(): Promise<AdoptionItemDto[]> {
    const list = await this.prisma.adoption.findMany({
      orderBy: { adoptedAt: 'desc' },
      include: {
        pet: { select: { name: true, adopetConfirmedAt: true } },
        tutor: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
      },
    });
    return list.map((a) => {
      const pet = a.pet as { name: string; adopetConfirmedAt: Date | null };
      return {
        id: a.id,
        petId: a.petId,
        petName: pet.name,
        tutorId: a.tutorId,
        tutorName: a.tutor.name,
        adopterId: a.adopterId,
        adopterName: a.adopter.name,
        adoptedAt: a.adoptedAt.toISOString(),
        confirmedByAdopet: pet.adopetConfirmedAt != null,
      };
    });
  }

  /** Cria registro de adoção. fromAdopetConfirmation=true quando admin ou auto-approve confirma (badge "Confirmado pelo Adopet"). */
  async createAdoption(petId: string, adopterUserId?: string, fromAdopetConfirmation = false): Promise<AdoptionItemDto> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { owner: { select: { id: true, name: true } }, pendingAdopter: { select: { id: true, name: true } } },
    });
    if (!pet) {
      throw new BadRequestException('Pet não encontrado');
    }
    const resolvedAdopterId = adopterUserId ?? pet.pendingAdopterId ?? undefined;
    if (!resolvedAdopterId) {
      throw new BadRequestException('Informe o adotante ou peça para o tutor indicar quem adotou ao marcar o pet como adotado.');
    }
    const adopter = await this.prisma.user.findUnique({
      where: { id: resolvedAdopterId },
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
    if (pet.ownerId === resolvedAdopterId) {
      throw new BadRequestException('O adotante não pode ser o próprio tutor do pet');
    }

    const adoption = await this.prisma.$transaction(async (tx) => {
      const created = await tx.adoption.create({
        data: {
          petId,
          tutorId: pet.ownerId,
          adopterId: resolvedAdopterId,
        },
        include: {
          pet: { select: { name: true } },
          tutor: { select: { id: true, name: true } },
          adopter: { select: { id: true, name: true } },
        },
      });
      await tx.pet.update({
        where: { id: petId },
        data: {
          status: 'ADOPTED',
          pendingAdopterId: null,
          ...(fromAdopetConfirmation && { adopetConfirmedAt: new Date() }),
        },
      });
      await tx.favorite.deleteMany({ where: { petId } });
      return created;
    });

    this.sendAdoptionCongratulationsEmails(adoption.id).catch((e) =>
      console.warn('[AdminService] sendAdoptionCongratulationsEmails failed', e),
    );
    return {
      id: adoption.id,
      petId: adoption.petId,
      petName: adoption.pet.name,
      tutorId: adoption.tutorId,
      tutorName: adoption.tutor.name,
      adopterId: adoption.adopterId,
      adopterName: adoption.adopter.name,
      adoptedAt: adoption.adoptedAt.toISOString(),
      confirmedByAdopet: fromAdopetConfirmation,
    };
  }

  /** Envia e-mails de parabéns ao tutor e ao adotante após confirmação da adoção. */
  private async sendAdoptionCongratulationsEmails(adoptionId: string): Promise<void> {
    if (!this.emailService.isConfigured()) return;
    const adoption = await this.prisma.adoption.findUnique({
      where: { id: adoptionId },
      include: {
        pet: {
          include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
        },
        tutor: { select: { email: true, name: true } },
        adopter: { select: { email: true, name: true } },
      },
    });
    if (!adoption?.tutor?.email || !adoption?.adopter?.email) return;
    const photoUrl = adoption.pet.media?.[0]?.url ?? null;
    const data = {
      petName: adoption.pet.name,
      petPhotoUrl: photoUrl,
      tutorName: adoption.tutor.name,
      recipientName: '', // preenchido por destinatário
      speciesLabel: speciesLabel[adoption.pet.species] ?? adoption.pet.species,
      breed: adoption.pet.breed,
      age: adoption.pet.age,
    };
    const appUrl = (this.config.get<string>('APP_URL') ?? 'https://appadopet.com.br').replace(/\/$/, '');
    const logoUrl = (
      this.config.get<string>('EMAIL_LOGO_URL') ||
      this.config.get<string>('LOGO_URL') ||
      `${appUrl}/logo.png`
    ).trim();
    await Promise.all([
      this.emailService
        .sendMail({
          to: adoption.adopter.email,
          subject: `Parabéns pela sua adoção de ${adoption.pet.name}! – Adopet`,
          text: getAdoptionCongratulationsAdopterText({ ...data, recipientName: adoption.adopter.name }),
          html: getAdoptionCongratulationsAdopterHtml({ ...data, recipientName: adoption.adopter.name }, logoUrl),
        })
        .catch((e) => console.warn('[AdminService] adoption email to adopter failed', e)),
      this.emailService
        .sendMail({
          to: adoption.tutor.email,
          subject: `Obrigado por essa adoção – ${adoption.pet.name} encontrou um lar – Adopet`,
          text: getAdoptionCongratulationsTutorText({ ...data, recipientName: adoption.tutor.name }),
          html: getAdoptionCongratulationsTutorHtml({ ...data, recipientName: adoption.tutor.name }, logoUrl),
        })
        .catch((e) => console.warn('[AdminService] adoption email to tutor failed', e)),
    ]);
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
    const displayName = this.config.get<string>('SYSTEM_USER_NAME')?.trim() || SYSTEM_USER_NAME_DEFAULT;
    const user = await this.prisma.user.create({
      data: {
        email,
        name: displayName,
        passwordHash,
      },
      select: { id: true },
    });
    return user.id;
  }

  /** Cria registro de adoção para pets sem registro e 48h passaram; aplica badge "Confirmado pelo Adopet" em adoções já existentes após 48h. */
  async runAutoApproveAdoptions(): Promise<{ processed: number }> {
    const deadline = new Date(Date.now() - AUTO_APPROVE_HOURS * 60 * 60 * 1000);
    let processed = 0;

    // 1) Pets sem registro de adoção: criar Adoption e marcar adopetConfirmedAt
    const petsWithoutAdoption = await this.prisma.pet.findMany({
      where: {
        status: 'ADOPTED',
        adoption: null,
        adoptionRejectedAt: null,
        pendingAdopterId: { not: null },
        adopterConfirmedAt: { not: null },
        markedAdoptedAt: { lte: deadline },
      },
      select: { id: true, ownerId: true, pendingAdopterId: true },
    });
    for (const pet of petsWithoutAdoption) {
      const adopterId = pet.pendingAdopterId!;
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const a = await tx.adoption.create({
            data: {
              petId: pet.id,
              tutorId: pet.ownerId,
              adopterId,
            },
            select: { id: true },
          });
          await tx.pet.update({
            where: { id: pet.id },
            data: { pendingAdopterId: null, adopetConfirmedAt: new Date() },
          });
          return a;
        });
        this.sendAdoptionCongratulationsEmails(created.id).catch((e) =>
          console.warn('[AdminService] sendAdoptionCongratulationsEmails (auto) failed', e),
        );
        processed++;
      } catch (e) {
        console.warn('[AdminService] runAutoApproveAdoptions: skip pet', pet.id, e);
      }
    }

    // 2) Adoções já criadas (ex.: pelo adotante) mas sem adopetConfirmedAt: aplicar após 48h do adoptedAt
    const adoptionsToConfirm = await this.prisma.adoption.findMany({
      where: {
        adoptedAt: { lte: deadline },
        pet: {
          adoptionRejectedAt: null,
          adopetConfirmedAt: null,
        },
      },
      select: { id: true, petId: true },
    });
    for (const a of adoptionsToConfirm) {
      try {
        await this.prisma.pet.update({
          where: { id: a.petId },
          data: { adopetConfirmedAt: new Date() },
        });
        processed++;
      } catch (e) {
        console.warn('[AdminService] runAutoApproveAdoptions: skip adoption', a.id, e);
      }
    }

    return { processed };
  }

  /** [Admin] Marca uma adoção já existente como confirmada pela Adopet (badge "Confirmado pelo Adopet"). Idempotente: se já confirmada, não faz nada. */
  async confirmAdoptionByAdopet(petId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { adoption: true },
    });
    if (!pet) throw new BadRequestException('Pet não encontrado');
    if (!pet.adoption) throw new BadRequestException('Este pet não possui adoção registrada');
    if (pet.adopetConfirmedAt != null) return; // já confirmada; evita duplicar e erro na UI
    await this.prisma.pet.update({
      where: { id: petId },
      data: { adopetConfirmedAt: new Date() },
    });
  }

  /** [Admin] Rejeita uma adoção já existente pela Adopet; exibe badge "Rejeitado pelo Adopet" para tutor e adotante. */
  async rejectAdoptionByAdopet(petId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { adoption: true },
    });
    if (!pet) throw new BadRequestException('Pet não encontrado');
    if (!pet.adoption) throw new BadRequestException('Este pet não possui adoção registrada');
    await this.prisma.pet.update({
      where: { id: petId },
      data: { adoptionRejectedAt: new Date() },
    });
  }

  /** Rejeita a marcação de adoção pelo tutor: pet continua como ADOPTED (não volta ao feed), não cria registro de adoção (não computa pontos), exibe badge "Rejeitado pelo Adopet" para o tutor. */
  async rejectPendingAdoptionByTutor(petId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { adoption: true },
    });
    if (!pet) {
      throw new BadRequestException('Pet não encontrado');
    }
    if (pet.adoption) {
      throw new BadRequestException('Este pet já possui adoção registrada');
    }
    if (pet.status !== 'ADOPTED') {
      throw new BadRequestException('Pet não está marcado como adotado pelo tutor');
    }
    await this.prisma.pet.update({
      where: { id: petId },
      data: { adoptionRejectedAt: new Date() },
    });
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

  /** [Admin] Listar feature flags (key, enabled, description). */
  async getFeatureFlags(): Promise<{ key: string; enabled: boolean; description: string | null }[]> {
    const list = await this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, enabled: true, description: true },
    });
    return list;
  }

  /** [Admin] Habilitar ou desabilitar uma feature flag (cria se não existir). */
  async setFeatureFlag(key: string, enabled: boolean): Promise<{ key: string; enabled: boolean }> {
    const keyNorm = key.trim();
    if (!keyNorm) throw new BadRequestException('Key é obrigatória');
    const flag = await this.prisma.featureFlag.upsert({
      where: { key: keyNorm },
      create: { key: keyNorm, enabled },
      update: { enabled },
      select: { key: true, enabled: true },
    });
    return flag;
  }
}
