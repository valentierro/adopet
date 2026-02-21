import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { BlocksService } from '../moderation/blocks.service';
import type { MessageItemDto } from './dto/message-response.dto';
import type { MessagesPageDto } from './dto/message-response.dto';

const PAGE_SIZE = 30;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationsService,
    private readonly blocksService: BlocksService,
    private readonly config: ConfigService,
  ) {}

  async getPage(
    conversationId: string,
    userId: string,
    cursor?: string,
  ): Promise<MessagesPageDto> {
    await this.ensureParticipant(conversationId, userId);
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        readAt: null,
        OR: [{ senderId: { not: userId } }, { isSystem: true }],
      },
      data: { readAt: new Date() },
    });
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: PAGE_SIZE + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = messages.length > PAGE_SIZE;
    const items = messages.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return {
      items: items.reverse().map((m) => this.toDto(m)),
      nextCursor,
    };
  }

  async send(
    conversationId: string,
    userId: string,
    dto: { content?: string; imageUrl?: string },
  ): Promise<MessageItemDto> {
    const content = (dto.content ?? '').trim();
    const imageUrl = dto.imageUrl?.trim() || undefined;
    if (!content && !imageUrl) {
      throw new BadRequestException('Envie um texto ou uma imagem.');
    }
    await this.ensureParticipant(conversationId, userId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content: content || '', imageUrl },
    });
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        pet: { select: { name: true } },
      },
    });
    if (conv) {
      const other = conv.participants.find((p) => p.userId !== userId);
      if (other) {
        const prefs = await this.prisma.userPreferences.findUnique({
          where: { userId: other.userId },
          select: { notifyMessages: true },
        });
        if (prefs?.notifyMessages !== false) {
          const title = `Tutor de ${conv.pet.name}`;
          const body = imageUrl
            ? `${conv.pet.name}: Foto`
            : `${conv.pet.name}: ${content.slice(0, 80)}${content.length > 80 ? '...' : ''}`;
          await this.inAppNotifications.create(
            other.userId,
            IN_APP_NOTIFICATION_TYPES.NEW_MESSAGE,
            title,
            body,
            { conversationId },
            { conversationId },
          );
        }
      }
    }
    return this.toDto(message);
  }

  private async ensureParticipant(conversationId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { include: { user: { select: { deactivatedAt: true } } } } },
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    const isParticipant = conv.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não participa desta conversa');
    const other = conv.participants.find((p) => p.userId !== userId);
    if (other) {
      if ((other.user as { deactivatedAt: Date | null })?.deactivatedAt) {
        throw new ForbiddenException(
          'Este chat foi desativado pois o usuário não está mais ativo no app.',
        );
      }
      const blocked = await this.blocksService.isBlockedBetween(userId, other.userId);
      if (blocked) throw new ForbiddenException('Não é possível enviar mensagens nesta conversa.');
    }
  }

  private toDto(m: {
    id: string;
    conversationId: string;
    senderId: string | null;
    isSystem: boolean;
    content: string;
    imageUrl: string | null;
    createdAt: Date;
    readAt: Date | null;
  }): MessageItemDto {
    let imageUrl = m.imageUrl ?? undefined;
    if (imageUrl && !imageUrl.startsWith('http')) {
      const base = this.config.get<string>('S3_PUBLIC_BASE')?.replace(/\/$/, '');
      if (base) imageUrl = `${base}/${imageUrl}`;
    }
    return {
      id: m.id,
      conversationId: m.conversationId,
      ...(m.senderId != null && { senderId: m.senderId }),
      isSystem: m.isSystem,
      content: m.content,
      imageUrl,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString(),
    };
  }
}
