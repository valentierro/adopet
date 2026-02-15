import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from '../moderation/blocks.service';
import { TypingService } from './typing.service';
import { PushService } from '../notifications/push.service';
import type { ConversationListItemDto } from './dto/conversation-response.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocksService: BlocksService,
    private readonly typingService: TypingService,
    private readonly push: PushService,
  ) {}

  setTyping(conversationId: string, userId: string): void {
    this.typingService.setTyping(conversationId, userId);
  }

  async createOrGet(userId: string, petId: string): Promise<{ id: string }> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    const favorited = await this.prisma.favorite.findUnique({
      where: { userId_petId: { userId, petId } },
    });
    if (!favorited) throw new ForbiddenException('Só é possível conversar com pets que você favoritou');
    const ownerId = pet.ownerId;
    if (ownerId === userId) throw new ForbiddenException('Você é o dono do pet');

    const blocked = await this.blocksService.isBlockedBetween(userId, ownerId);
    if (blocked) throw new ForbiddenException('Não é possível iniciar conversa com este usuário.');

    const existing = await this.prisma.conversation.findUnique({
      where: { petId_adopterId_type: { petId, adopterId: userId, type: 'NORMAL' } },
    });
    if (existing) return { id: existing.id };

    const [adopter, ownerPrefs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      this.prisma.userPreferences.findUnique({ where: { userId: ownerId }, select: { notifyMessages: true } }),
    ]);
    const conv = await this.prisma.conversation.create({
      data: {
        petId,
        adopterId: userId,
        type: 'NORMAL',
        participants: {
          create: [
            { userId: ownerId },
            { userId },
          ],
        },
      },
      include: { pet: { select: { name: true } } },
    });
    if (ownerPrefs?.notifyMessages !== false && adopter?.name && conv.pet) {
      await this.push.sendToUser(
        ownerId,
        'Nova conversa',
        `${adopter.name} quer conversar sobre ${conv.pet.name}`,
        { conversationId: conv.id },
      );
    }
    return { id: conv.id };
  }

  async getOne(
    conversationId: string,
    userId: string,
  ): Promise<{
    id: string;
    otherUser: { id: string; name: string };
    pet?: { name: string; photoUrl?: string };
    otherUserTyping?: boolean;
  } | null> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                city: true,
                housingType: true,
                hasYard: true,
                hasOtherPets: true,
                hasChildren: true,
                timeAtHome: true,
              },
            },
          },
        },
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            adoption: { select: { id: true } },
          },
        },
      },
    });
    if (!conv) return null;
    const other = conv.participants.find((p) => p.userId !== userId)?.user as
      | { id: string; name: string; avatarUrl: string | null; city: string | null; housingType: string | null; hasYard: boolean | null; hasOtherPets: boolean | null; hasChildren: boolean | null; timeAtHome: string | null }
      | undefined;
    const otherUserTyping = this.typingService.isOtherUserTyping(conversationId, userId);
    // Adoção finalizada = adotante já confirmou ou já existe registro Adoption; antes disso exibe botão "Confirmar adoção"
    const adoptionFinalized =
      conv.pet?.status === 'ADOPTED' &&
      (!!conv.pet.adopterConfirmedAt || !!conv.pet.adoption);
    const result: {
      id: string;
      type: string;
      petId?: string;
      otherUser: {
        id: string;
        name: string;
        avatarUrl?: string;
        city?: string;
        housingType?: string;
        hasYard?: boolean;
        hasOtherPets?: boolean;
        hasChildren?: boolean;
        timeAtHome?: string;
      };
      pet?: { name: string; photoUrl?: string; adoptionFinalized?: boolean; pendingAdopterId?: string; isTutor?: boolean; status?: string };
      otherUserTyping?: boolean;
    } = {
      id: conv.id,
      type: conv.type ?? 'NORMAL',
      petId: conv.petId,
      otherUser: other
        ? {
            id: other.id,
            name: other.name,
            avatarUrl: other.avatarUrl ?? undefined,
            city: other.city ?? undefined,
            housingType: other.housingType ?? undefined,
            hasYard: other.hasYard ?? undefined,
            hasOtherPets: other.hasOtherPets ?? undefined,
            hasChildren: other.hasChildren ?? undefined,
            timeAtHome: other.timeAtHome ?? undefined,
          }
        : { id: '', name: '' },
      otherUserTyping,
    };
    if (conv.pet) {
      result.pet = {
        name: conv.pet.name,
        photoUrl: conv.pet.media?.[0]?.url,
        adoptionFinalized,
        pendingAdopterId: conv.pet.pendingAdopterId ?? undefined,
        isTutor: conv.pet.ownerId === userId,
        status: conv.pet.status,
      };
    }
    return result;
  }

  async list(userId: string): Promise<ConversationListItemDto[]> {
    const [blockedByMe, blockedMe] = await Promise.all([
      this.blocksService.getBlockedUserIds(userId),
      this.blocksService.getBlockedByUserIds(userId),
    ]);
    const excludeUserIds = [...blockedByMe, ...blockedMe];

    const convs = await this.prisma.conversation.findMany({
      where: {
        ...(excludeUserIds.length > 0
          ? {
              AND: [
                { participants: { some: { userId } } },
                { participants: { none: { userId: { in: excludeUserIds } } } },
              ],
            }
          : { participants: { some: { userId } } }),
      },
      include: {
        pet: { include: { media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } } },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const convIds = convs.map((c) => c.id);
    const unreadCounts =
      convIds.length > 0
        ? await this.prisma.message.groupBy({
            by: ['conversationId'],
            where: {
              conversationId: { in: convIds },
              readAt: null,
              OR: [{ senderId: { not: userId } }, { senderId: null }],
            },
            _count: { id: true },
          })
        : [];
    const unreadByConv = Object.fromEntries(unreadCounts.map((u) => [u.conversationId, u._count.id]));

    return convs.map((c) => {
      const other = c.participants.find((p) => p.userId !== userId)?.user;
      const last = c.messages[0];
      return {
        id: c.id,
        petId: c.petId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        pet: {
          id: c.pet.id,
          name: c.pet.name,
          photos: (c.pet.media ?? []).map((m) => m.url),
        },
        otherUser: {
          id: other?.id ?? '',
          name: other?.name ?? '',
          avatarUrl: other?.avatarUrl ?? undefined,
        },
        lastMessage: last
          ? { content: last.content, createdAt: last.createdAt.toISOString(), senderId: last.senderId ?? '' }
          : undefined,
        unreadCount: unreadByConv[c.id] ?? 0,
      };
    });
  }

  async delete(conversationId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
      },
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }
}
