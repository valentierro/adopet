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
  PET_PUBLICATION_APPROVED: 'PET_PUBLICATION_APPROVED',
  PET_PUBLICATION_REJECTED: 'PET_PUBLICATION_REJECTED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  PET_FAVORITED: 'PET_FAVORITED',
} as const;

export type InAppNotificationType = (typeof IN_APP_NOTIFICATION_TYPES)[keyof typeof IN_APP_NOTIFICATION_TYPES];

export type InAppNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
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

  async listByUser(userId: string, limit = 50): Promise<InAppNotificationItem[]> {
    const list = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      metadata: n.metadata ? (JSON.parse(n.metadata) as Record<string, unknown>) : null,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { userId, readAt: null },
    });
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
    const result = await this.prisma.inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
