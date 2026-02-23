import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
import { InAppNotificationsService, IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { FeatureFlagService } from '../feature-flag/feature-flag.service';
import { UploadsService } from '../uploads/uploads.service';
import type { AdminStatsDto } from './dto/admin-stats.dto';
import type { AdoptionItemDto } from './dto/adoption-item.dto';
import type { UserSearchItemDto } from './dto/user-search-item.dto';
import type { AdminUserListItemDto, AdminUserListResponseDto } from './dto/admin-user-list-item.dto';
import type { PetAvailableItemDto } from './dto/pet-available-item.dto';
import type { PendingAdoptionByTutorDto } from './dto/pending-adoption-by-tutor.dto';
import type { TopTutorPfItemDto } from './dto/top-tutor-pf.dto';
import type {
  PetsReportAggregatesDto,
  UsersReportAggregatesDto,
  AdoptionsReportAggregatesDto,
} from './dto/reports-aggregates.dto';

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
    private readonly inAppNotificationsService: InAppNotificationsService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly uploadsService: UploadsService,
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
      pendingKycCount,
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
      this.prisma.user.count({ where: { kycStatus: 'PENDING' } }),
    ]);

    return {
      totalAdoptions,
      adoptionsThisMonth,
      pendingPetsCount,
      pendingReportsCount,
      pendingAdoptionsByTutorCount,
      pendingVerificationsCount,
      pendingKycCount,
    };
  }

  /** Tutores PF (sem conta parceiro) com mais adoções concluídas nos últimos 12 meses. Útil para identificar possíveis red flags. */
  async getTopTutorsPfByAdoptions(limit = 50): Promise<TopTutorPfItemDto[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const grouped = await this.prisma.adoption.groupBy({
      by: ['tutorId'],
      where: { adoptedAt: { gte: twelveMonthsAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (grouped.length === 0) return [];

    const tutorIds = grouped.map((g) => g.tutorId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: tutorIds },
        partner: null, // PF = sem conta parceiro
      },
      select: { id: true, name: true, email: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const countByTutorId = new Map(grouped.map((g) => [g.tutorId, g._count.id]));

    const result: TopTutorPfItemDto[] = [];
    for (const g of grouped) {
      const user = userMap.get(g.tutorId);
      if (!user) continue; // ONG/parceiro, pulado
      result.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        username: user.username ?? null,
        adoptionCount: countByTutorId.get(g.tutorId) ?? 0,
      });
      if (result.length >= limit) break;
    }
    return result;
  }

  /** Lista usuários com KYC pendente (documento + selfie enviados, aguardando análise). */
  async getPendingKyc(): Promise<
    Array<{
      userId: string;
      name: string;
      email: string;
      phone?: string | null;
      document?: string | null;
      kycSubmittedAt: string;
      documentUrl?: string | null;
      selfieUrl?: string | null;
    }>
  > {
    const users = await this.prisma.user.findMany({
      where: { kycStatus: 'PENDING' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        kycSubmittedAt: true,
        kycDocumentKey: true,
        kycSelfieKey: true,
      },
      orderBy: { kycSubmittedAt: 'asc' },
    });
    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      document: u.document ?? null,
      kycSubmittedAt: u.kycSubmittedAt?.toISOString() ?? '',
      documentUrl: this.uploadsService.getPublicUrl(u.kycDocumentKey) ?? null,
      selfieUrl: this.uploadsService.getPublicUrl(u.kycSelfieKey) ?? null,
    }));
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

  /** Cria registro de adoção. fromAdopetConfirmation=true quando admin ou auto-approve confirma (badge "Confirmado pelo Adopet"). responsibilityTermAcceptedAt quando o adotante aceitou o termo no app. */
  async createAdoption(
    petId: string,
    adopterUserId?: string,
    fromAdopetConfirmation = false,
    responsibilityTermAcceptedAt?: Date,
  ): Promise<AdoptionItemDto> {
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
          ...(responsibilityTermAcceptedAt && { responsibilityTermAcceptedAt }),
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
    this.sendSatisfactionSurveyNotifications(adoption.id).catch((e) =>
      console.warn('[AdminService] sendSatisfactionSurveyNotifications failed', e),
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

  /** [Admin] Lista usuários com busca opcional e paginação (para seção Usuários e banir). */
  async getUsersList(search?: string, page = 1, limit = 30): Promise<AdminUserListResponseDto> {
    const term = (search ?? '').trim();
    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.min(100, Math.max(1, limit));
    const where = term.length >= 2
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { email: { contains: term, mode: 'insensitive' as const } },
            { username: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          deactivatedAt: true,
          bannedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username ?? undefined,
        phone: u.phone ?? undefined,
        deactivatedAt: u.deactivatedAt?.toISOString(),
        bannedAt: u.bannedAt?.toISOString(),
      })),
      total,
    };
  }

  /** [Admin] Banir usuário (sem denúncia). Define deactivatedAt e opcionalmente bannedAt/bannedById/bannedReason. Não permite banir admin. */
  async banUser(userId: string, adminId: string, reason?: string): Promise<{ message: string }> {
    const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (adminIds.includes(userId)) {
      throw new BadRequestException('Não é permitido banir um administrador.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deactivatedAt: now,
        bannedAt: now,
        bannedById: adminId,
        bannedReason: reason?.trim() || null,
      },
    });
    return { message: 'Usuário banido. A conta foi desativada e não poderá fazer login; e-mail, nome de usuário e telefone continuam bloqueados para novo cadastro.' };
  }

  /** Aprovar ou rejeitar KYC de um usuário. Ao aprovar, envia mensagem no chat. Após decisão, apaga as imagens do storage e zera as keys (não retenção; redução de risco jurídico). */
  async updateUserKyc(
    userId: string,
    status: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, kycStatus: true, name: true, kycDocumentKey: true, kycSelfieKey: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.kycStatus !== 'PENDING') {
      throw new BadRequestException(
        `KYC do usuário não está pendente (status atual: ${user.kycStatus ?? 'nunca enviou'}).`,
      );
    }
    if (status === 'REJECTED' && !rejectionReason?.trim()) {
      throw new BadRequestException('Informe o motivo da rejeição para notificar o solicitante.');
    }
    const now = new Date();
    const docKey = user.kycDocumentKey;
    const selfieKey = user.kycSelfieKey;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(status === 'VERIFIED'
          ? { kycStatus: 'VERIFIED', kycVerifiedAt: now, kycRejectedAt: null, kycRejectionReason: null }
          : {
              kycStatus: 'REJECTED',
              kycRejectedAt: now,
              kycRejectionReason: rejectionReason?.trim() || null,
              kycVerifiedAt: null,
            }),
        kycDocumentKey: null,
        kycSelfieKey: null,
      },
    });

    await Promise.all([
      this.uploadsService.deleteByKey(docKey),
      this.uploadsService.deleteByKey(selfieKey),
    ]);
    if (status === 'VERIFIED') {
      const convs = await this.prisma.conversation.findMany({
        where: { type: 'NORMAL', participants: { some: { userId } } },
        select: { id: true },
      });
      const content = `O interessado ${user.name} finalizou a verificação de identidade. Você já pode marcá-lo como adotante.`;
      await Promise.all(
        convs.map((c) =>
          this.prisma.message.create({
            data: { conversationId: c.id, senderId: null, isSystem: true, content },
          }),
        ),
      );
      await this.inAppNotificationsService
        .create(
          userId,
          IN_APP_NOTIFICATION_TYPES.KYC_APPROVED,
          'Parabéns!',
          'Sua verificação de identidade foi aprovada. Você já pode confirmar adoções no app.',
          undefined,
          { screen: 'profile' },
        )
        .catch((e) => console.warn('[AdminService] KYC approved in-app notification failed', e));
    } else {
      const body = rejectionReason?.trim()
        ? `Sua verificação de identidade não foi aprovada: ${rejectionReason.trim()}. Você pode enviar novamente em Perfil → Verificação de identidade.`
        : 'Sua verificação de identidade não foi aprovada. Você pode enviar novamente em Perfil → Verificação de identidade.';
      await this.inAppNotificationsService
        .create(
          userId,
          IN_APP_NOTIFICATION_TYPES.KYC_REJECTED,
          'Verificação de identidade',
          body,
          undefined,
          { screen: 'profile' },
        )
        .catch((e) => console.warn('[AdminService] KYC rejected in-app notification failed', e));
    }
    return {
      message: status === 'VERIFIED' ? 'KYC aprovado. O usuário pode confirmar adoções.' : 'KYC rejeitado.',
    };
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
        this.sendSatisfactionSurveyNotifications(created.id).catch((e) =>
          console.warn('[AdminService] sendSatisfactionSurveyNotifications (auto) failed', e),
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
        this.sendSatisfactionSurveyNotifications(a.id).catch((e) =>
          console.warn('[AdminService] sendSatisfactionSurveyNotifications (auto confirm) failed', e),
        );
        processed++;
      } catch (e) {
        console.warn('[AdminService] runAutoApproveAdoptions: skip adoption', a.id, e);
      }
    }

    return { processed };
  }

  /** [Admin] Marca uma adoção já existente como confirmada pela Adopet (badge "Confirmado pelo Adopet"). Idempotente: se já confirmada, não faz nada. Notifica tutor e adotante in-app + push. */
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
    const petName = pet.name || 'Pet';
    const title = 'Adoção confirmada pelo Adopet';
    const body = `A adoção do ${petName} foi oficialmente confirmada pelo Adopet. 🎉`;
    const metadata = { petId, type: IN_APP_NOTIFICATION_TYPES.ADOPTION_CONFIRMED_BY_ADOPET };
    await Promise.all([
      this.inAppNotificationsService.create(
        pet.adoption.tutorId,
        IN_APP_NOTIFICATION_TYPES.ADOPTION_CONFIRMED_BY_ADOPET,
        title,
        body,
        metadata,
      ),
      this.inAppNotificationsService.create(
        pet.adoption.adopterId,
        IN_APP_NOTIFICATION_TYPES.ADOPTION_CONFIRMED_BY_ADOPET,
        title,
        body,
        metadata,
      ),
    ]);
    this.sendSatisfactionSurveyNotifications(pet.adoption.id).catch((e) =>
      console.warn('[AdminService] sendSatisfactionSurveyNotifications failed', e),
    );
  }

  /** Envia notificação in-app + push para tutor e adotante convidando à pesquisa de satisfação (após adoção confirmada). */
  private async sendSatisfactionSurveyNotifications(adoptionId: string): Promise<void> {
    const adoption = await this.prisma.adoption.findUnique({
      where: { id: adoptionId },
      select: { tutorId: true, adopterId: true },
    });
    if (!adoption) return;
    const title = 'Como foi sua experiência?';
    const body = 'Avalie o app em poucos toques. Sua opinião nos ajuda a melhorar.';
    const type = IN_APP_NOTIFICATION_TYPES.SATISFACTION_SURVEY;
    await Promise.all([
      this.inAppNotificationsService.create(
        adoption.tutorId,
        type,
        title,
        body,
        { adoptionId, role: 'TUTOR' },
        { adoptionId, role: 'TUTOR' },
      ),
      this.inAppNotificationsService.create(
        adoption.adopterId,
        type,
        title,
        body,
        { adoptionId, role: 'ADOPTER' },
        { adoptionId, role: 'ADOPTER' },
      ),
    ]);
  }

  /** [Admin] Rejeita uma adoção já existente pela Adopet; exibe badge "Rejeitado pelo Adopet" para tutor e adotante. */
  async rejectAdoptionByAdopet(petId: string, rejectionReason?: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { adoption: true },
    });
    if (!pet) throw new BadRequestException('Pet não encontrado');
    if (!pet.adoption) throw new BadRequestException('Este pet não possui adoção registrada');
    await this.prisma.pet.update({
      where: { id: petId },
      data: {
        adoptionRejectedAt: new Date(),
        adoptionRejectionReason: rejectionReason?.trim() || null,
      },
    });
  }

  /** Rejeita a marcação de adoção pelo tutor: pet continua como ADOPTED (não volta ao feed), não cria registro de adoção (não computa pontos), exibe badge "Rejeitado pelo Adopet" para o tutor. */
  async rejectPendingAdoptionByTutor(petId: string, rejectionReason?: string): Promise<void> {
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
      data: {
        adoptionRejectedAt: new Date(),
        adoptionRejectionReason: rejectionReason?.trim() || null,
      },
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

  /** [Admin] Listar todas as feature flags (com scope, cityId, partnerId, rollout). */
  async listFeatureFlags(): Promise<
    Array<{
      id: string;
      key: string;
      enabled: boolean;
      description: string | null;
      scope: string;
      cityId: string | null;
      partnerId: string | null;
      rolloutPercent: number | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return this.prisma.featureFlag.findMany({
      orderBy: [{ key: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        key: true,
        enabled: true,
        description: true,
        scope: true,
        cityId: true,
        partnerId: true,
        rolloutPercent: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /** [Admin] Criar feature flag. */
  async createFeatureFlag(dto: {
    key: string;
    enabled?: boolean;
    description?: string | null;
    scope?: string;
    cityId?: string | null;
    partnerId?: string | null;
    rolloutPercent?: number | null;
  }): Promise<{
    id: string;
    key: string;
    enabled: boolean;
    description: string | null;
    scope: string;
    cityId: string | null;
    partnerId: string | null;
    rolloutPercent: number | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const keyNorm = (dto.key ?? '').trim();
    if (!keyNorm) throw new BadRequestException('Key é obrigatória');
    const scope = dto.scope ?? 'GLOBAL';
    const cityId = scope === 'CITY' ? (dto.cityId ?? null) : null;
    const partnerId = scope === 'PARTNER' ? (dto.partnerId ?? null) : null;
    const flag = await this.prisma.featureFlag.create({
      data: {
        key: keyNorm,
        enabled: dto.enabled ?? false,
        description: dto.description ?? null,
        scope,
        cityId,
        partnerId,
        rolloutPercent: dto.rolloutPercent ?? null,
      },
    });
    this.featureFlagService.invalidateKey(keyNorm);
    return flag;
  }

  /** [Admin] Atualizar feature flag por id. */
  async updateFeatureFlag(
    id: string,
    dto: {
      enabled?: boolean;
      description?: string | null;
      scope?: string;
      cityId?: string | null;
      partnerId?: string | null;
      rolloutPercent?: number | null;
    },
  ): Promise<{
    id: string;
    key: string;
    enabled: boolean;
    description: string | null;
    scope: string;
    cityId: string | null;
    partnerId: string | null;
    rolloutPercent: number | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const existing = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Feature flag não encontrada');
    const scope = dto.scope ?? existing.scope;
    const cityId = scope === 'CITY' ? (dto.cityId ?? existing.cityId) : null;
    const partnerId = scope === 'PARTNER' ? (dto.partnerId ?? existing.partnerId) : null;
    const flag = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.description !== undefined && { description: dto.description }),
        scope,
        cityId,
        partnerId,
        ...(dto.rolloutPercent !== undefined && { rolloutPercent: dto.rolloutPercent }),
      },
    });
    this.featureFlagService.invalidateKey(existing.key);
    return flag;
  }

  /** [Admin] Agregados para relatórios de pets/anúncios */
  async getPetsReportAggregates(): Promise<PetsReportAggregatesDto> {
    const pets = await this.prisma.pet.findMany({
      select: {
        species: true,
        breed: true,
        sex: true,
        city: true,
        age: true,
        publicationStatus: true,
        status: true,
        vaccinated: true,
        neutered: true,
      },
    });
    const bySpecies: Record<string, number> = {};
    const byBreed: Record<string, number> = {};
    const bySex: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byAgeRange: Record<string, number> = {};
    const byPublicationStatus: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byVaccinated: Record<string, number> = {};
    const byNeutered: Record<string, number> = {};

    for (const p of pets) {
      const sp = p.species ?? 'OUTRO';
      bySpecies[sp] = (bySpecies[sp] ?? 0) + 1;
      const breed = p.breed?.trim() || 'SRD/Não informada';
      byBreed[breed] = (byBreed[breed] ?? 0) + 1;
      const sex = p.sex ?? 'Não informado';
      bySex[sex] = (bySex[sex] ?? 0) + 1;
      const city = p.city?.trim() || 'Não informada';
      byCity[city] = (byCity[city] ?? 0) + 1;
      const age = p.age ?? 0;
      const range = age <= 1 ? '0-1 ano' : age <= 5 ? '2-5 anos' : age <= 10 ? '6-10 anos' : '11+ anos';
      byAgeRange[range] = (byAgeRange[range] ?? 0) + 1;
      byPublicationStatus[p.publicationStatus] = (byPublicationStatus[p.publicationStatus] ?? 0) + 1;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byVaccinated[p.vaccinated ? 'Sim' : 'Não'] = (byVaccinated[p.vaccinated ? 'Sim' : 'Não'] ?? 0) + 1;
      byNeutered[p.neutered ? 'Sim' : 'Não'] = (byNeutered[p.neutered ? 'Sim' : 'Não'] ?? 0) + 1;
    }

    return {
      total: pets.length,
      bySpecies,
      byBreed,
      bySex,
      byCity,
      byAgeRange,
      byPublicationStatus,
      byStatus,
      byVaccinated,
      byNeutered,
    };
  }

  /** [Admin] Agregados para relatórios de usuários */
  async getUsersReportAggregates(): Promise<UsersReportAggregatesDto> {
    const users = await this.prisma.user.findMany({
      select: {
        city: true,
        createdAt: true,
        kycStatus: true,
        deactivatedAt: true,
        id: true,
      },
    });
    const byCity: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byKycStatus: Record<string, number> = {};
    let withListings = 0;
    let deactivated = 0;

    const ownerIdsWithPets = await this.prisma.pet
      .findMany({ select: { ownerId: true } })
      .then((rows) => new Set(rows.map((r) => r.ownerId)));

    for (const u of users) {
      const city = u.city?.trim() || 'Não informada';
      byCity[city] = (byCity[city] ?? 0) + 1;
      const month = u.createdAt.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + 1;
      const kyc = u.kycStatus ?? 'Nunca enviou';
      byKycStatus[kyc] = (byKycStatus[kyc] ?? 0) + 1;
      if (ownerIdsWithPets.has(u.id)) withListings++;
      if (u.deactivatedAt != null) deactivated++;
    }

    return {
      total: users.length,
      byCity,
      byMonth,
      byKycStatus,
      withListings,
      withoutListings: users.length - withListings,
      deactivated,
    };
  }

  /** [Admin] Agregados para relatório de adoções (inclui species do pet) */
  async getAdoptionsReportAggregates(): Promise<AdoptionsReportAggregatesDto> {
    const adoptions = await this.prisma.adoption.findMany({
      orderBy: { adoptedAt: 'desc' },
      include: { pet: { select: { species: true, adopetConfirmedAt: true } } },
    });
    const byMonth: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    let confirmedByAdopet = 0;

    for (const a of adoptions) {
      const month = a.adoptedAt.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + 1;
      const sp = (a.pet as { species: string }).species ?? 'OUTRO';
      bySpecies[sp] = (bySpecies[sp] ?? 0) + 1;
      if ((a.pet as { adopetConfirmedAt: Date | null }).adopetConfirmedAt != null) confirmedByAdopet++;
    }

    return {
      total: adoptions.length,
      byMonth,
      bySpecies,
      confirmedByAdopet,
      notConfirmedByAdopet: adoptions.length - confirmedByAdopet,
    };
  }
}
