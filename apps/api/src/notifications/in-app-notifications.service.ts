import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

export const IN_APP_NOTIFICATION_TYPES = {
  PARTNERSHIP_ENDED_ONG: 'PARTNERSHIP_ENDED_ONG',
  PARTNERSHIP_ENDED_PAID_SCHEDULED: 'PARTNERSHIP_ENDED_PAID_SCHEDULED',
  PARTNERSHIP_ENDED_PAID_TODAY: 'PARTNERSHIP_ENDED_PAID_TODAY',
  ADOPTION_CONFIRMED_BY_ADOPET: 'ADOPTION_CONFIRMED_BY_ADOPET',
  NEW_MESSAGE: 'NEW_MESSAGE',
  NEW_CONVERSATION: 'NEW_CONVERSATION',
  ADOPTION_CONFIRMATION_REQUESTED: 'ADOPTION_CONFIRMATION_REQUESTED',
  /** Tutor cancelou o processo de adoção (removeu indicação ou cancelou após adotante confirmar). */
  ADOPTION_CANCELLED_BY_TUTOR: 'ADOPTION_CANCELLED_BY_TUTOR',
  /** Adotante desistiu da adoção (antes ou após confirmar). */
  ADOPTION_DECLINED_BY_ADOPTER: 'ADOPTION_DECLINED_BY_ADOPTER',
  /** Para admins: pet marcado como adotado pelo tutor, aguardando confirmação no painel. */
  PENDING_ADOPTION_BY_TUTOR: 'PENDING_ADOPTION_BY_TUTOR',
  PET_PUBLICATION_APPROVED: 'PET_PUBLICATION_APPROVED',
  PET_PUBLICATION_REJECTED: 'PET_PUBLICATION_REJECTED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  KYC_REVOKED: 'KYC_REVOKED',
  PET_FAVORITED: 'PET_FAVORITED',
  PET_PARTNERSHIP_REQUEST: 'PET_PARTNERSHIP_REQUEST',
  PET_PARTNERSHIP_CONFIRMED: 'PET_PARTNERSHIP_CONFIRMED',
  /** Para admins: nova solicitação de parceria ONG aguardando aprovação. */
  PARTNERSHIP_REQUEST_ONG: 'PARTNERSHIP_REQUEST_ONG',
  PET_PARTNERSHIP_REJECTED: 'PET_PARTNERSHIP_REJECTED',
  PET_PARTNERSHIP_CANCELLED_BY_PARTNER: 'PET_PARTNERSHIP_CANCELLED_BY_PARTNER',
  SATISFACTION_SURVEY: 'SATISFACTION_SURVEY',
  /** Parceiro enviou formulário de adoção para o interessado. */
  ADOPTION_FORM_SENT: 'ADOPTION_FORM_SENT',
  /** Interessado preencheu e enviou o formulário de adoção. */
  ADOPTION_FORM_SUBMITTED: 'ADOPTION_FORM_SUBMITTED',
  /** Parceiro aprovou o interessado (proposta de adoção). */
  ADOPTION_PROPOSED: 'ADOPTION_PROPOSED',
  /** Parceiro rejeitou a solicitação de adoção. */
  ADOPTION_REQUEST_REJECTED: 'ADOPTION_REQUEST_REJECTED',
  /** Parceiro excluiu o formulário; formulário enviado ou aguardando análise foi cancelado. */
  ADOPTION_FORM_CANCELLED_BY_PARTNER: 'ADOPTION_FORM_CANCELLED_BY_PARTNER',
  /** Para admin ONG: novo anúncio criado por membro, aguardando aprovação. */
  ONG_PET_PENDING_APPROVAL: 'ONG_PET_PENDING_APPROVAL',
  /** Para admin app: novo anúncio de ONG criado por membro (conhecimento). */
  ONG_PET_NEW_BY_MEMBER: 'ONG_PET_NEW_BY_MEMBER',
} as const;

export type InAppNotificationType = (typeof IN_APP_NOTIFICATION_TYPES)[keyof typeof IN_APP_NOTIFICATION_TYPES];

export type InAppNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
};

@Injectable()
export class InAppNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  /** Cria notificação in-app e envia push (não falha se push falhar). pushData é enviado no payload do push para deep link (valores devem ser string). */
  async create(
    userId: string,
    type: InAppNotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
    pushData?: Record<string, string>,
  ): Promise<void> {
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    await this.prisma.inAppNotification.create({
      data: { userId, type, title, body, metadata: metadataStr },
    });
    const data: Record<string, string> = { type, ...pushData };
    this.pushService.sendToUser(userId, title, body, data).catch(() => {});
  }

  async listByUser(userId: string, limit = 50, archived = false): Promise<InAppNotificationItem[]> {
    // Arquivadas: só onde archivedAt não é null. Recentes: onde archivedAt é null (ou inexistente).
    const where = archived
      ? { userId, archivedAt: { not: null } }
      : { userId, archivedAt: null };
    let list: Awaited<ReturnType<PrismaService['inAppNotification']['findMany']>>;
    try {
      list = await this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (err) {
      // Fallback: se a coluna archivedAt não existir ou der erro, "recentes" retorna todas; "arquivadas" retorna []
      if (!archived) {
        list = await this.prisma.inAppNotification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
      } else {
        list = [];
      }
    }
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      metadata: n.metadata ? (JSON.parse(n.metadata) as Record<string, unknown>) : null,
      readAt: n.readAt?.toISOString() ?? null,
      archivedAt: n.archivedAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.prisma.inAppNotification.count({
        where: { userId, readAt: null, archivedAt: null },
      });
    } catch {
      return this.prisma.inAppNotification.count({
        where: { userId, readAt: null },
      });
    }
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const n = await this.prisma.inAppNotification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    await this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    try {
      const result = await this.prisma.inAppNotification.updateMany({
        where: { userId, readAt: null, archivedAt: null },
        data: { readAt: new Date() },
      });
      return { updated: result.count };
    } catch {
      const result = await this.prisma.inAppNotification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return { updated: result.count };
    }
  }

  async archive(userId: string, notificationId: string): Promise<void> {
    const n = await this.prisma.inAppNotification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    try {
      await this.prisma.inAppNotification.update({
        where: { id: notificationId },
        data: { archivedAt: new Date() },
      });
    } catch {
      // Client antigo sem campo archivedAt: ignora (evita 500)
    }
  }

  async archiveMany(userId: string, ids: string[]): Promise<{ archived: number }> {
    if (ids.length === 0) return { archived: 0 };
    try {
      const result = await this.prisma.inAppNotification.updateMany({
        where: { id: { in: ids }, userId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      return { archived: result.count };
    } catch {
      return { archived: 0 };
    }
  }

  async delete(userId: string, notificationId: string): Promise<void> {
    const n = await this.prisma.inAppNotification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    await this.prisma.inAppNotification.delete({
      where: { id: notificationId },
    });
  }

  async deleteMany(userId: string, ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };
    try {
      const result = await this.prisma.inAppNotification.deleteMany({
        where: { id: { in: ids }, userId },
      });
      return { deleted: result.count };
    } catch (err) {
      console.warn('[InAppNotifications] deleteMany failed', err);
      return { deleted: 0 };
    }
  }
}
