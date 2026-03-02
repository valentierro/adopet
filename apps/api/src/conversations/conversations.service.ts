import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from '../moderation/blocks.service';
import { TypingService } from './typing.service';
import { PetPartnershipService } from '../pet-partnership/pet-partnership.service';
import { AdoptionFormsService } from '../adoption-forms/adoption-forms.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import type { ConversationListItemDto } from './dto/conversation-response.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blocksService: BlocksService,
    private readonly typingService: TypingService,
    private readonly petPartnershipService: PetPartnershipService,
    private readonly adoptionFormsService: AdoptionFormsService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  setTyping(conversationId: string, userId: string): void {
    this.typingService.setTyping(conversationId, userId);
  }

  private async isUserPartner(userId: string): Promise<boolean> {
    const [asOwner, asMember] = await Promise.all([
      this.prisma.partner.findUnique({ where: { userId }, select: { id: true } }),
      this.prisma.partnerMember.findFirst({ where: { userId }, select: { id: true } }),
    ]);
    return !!asOwner || !!asMember;
  }

  async createOrGet(userId: string, petId: string, adopterIdParam?: string): Promise<{ id: string }> {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    const ownerId = pet.ownerId;

    const isOwnerCalling = userId === ownerId;
    const adopterId = adopterIdParam ?? (isOwnerCalling ? undefined : userId);

    if (adopterIdParam != null) {
      if (!isOwnerCalling) throw new ForbiddenException('Apenas o dono do pet pode iniciar conversa com um adotante específico.');
      if (adopterIdParam === ownerId) throw new ForbiddenException('Você não pode iniciar conversa consigo mesmo.');
      const favorited = await this.prisma.favorite.findUnique({
        where: { userId_petId: { userId: adopterIdParam, petId } },
      });
      if (!favorited) throw new ForbiddenException('Este usuário não favoritou este pet.');
    } else {
      const favorited = await this.prisma.favorite.findUnique({
        where: { userId_petId: { userId, petId } },
      });
      if (!favorited) throw new ForbiddenException('Só é possível conversar com pets que você favoritou');
      if (isOwnerCalling) throw new ForbiddenException('Você é o dono do pet. Use adopterId para iniciar conversa com quem favoritou.');
    }

    const blocked = await this.blocksService.isBlockedBetween(userId, adopterId!);
    if (blocked) throw new ForbiddenException('Não é possível iniciar conversa com este usuário.');

    const existing = await this.prisma.conversation.findUnique({
      where: { petId_adopterId_type: { petId, adopterId: adopterId!, type: 'NORMAL' } },
    });
    if (existing) return { id: existing.id };

    const [adopter, ownerPrefs, adopterPrefs, ownerUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adopterId }, select: { name: true } }),
      this.prisma.userPreferences.findUnique({ where: { userId: ownerId }, select: { notifyMessages: true } }),
      this.prisma.userPreferences.findUnique({ where: { userId: adopterId! }, select: { notifyMessages: true } }),
      this.prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } }),
    ]);
    const conv = await this.prisma.conversation.create({
      data: {
        petId,
        adopterId: adopterId!,
        type: 'NORMAL',
        participants: {
          create: [
            { userId: ownerId },
            { userId: adopterId! },
          ],
        },
      },
      include: { pet: { select: { name: true } } },
    });
    if (conv.pet) {
      if (isOwnerCalling && adopterPrefs?.notifyMessages !== false && ownerUser?.name) {
        await this.inAppNotifications.create(
          adopterId!,
          IN_APP_NOTIFICATION_TYPES.NEW_CONVERSATION,
          'Nova conversa',
          `${ownerUser.name} quer conversar sobre ${conv.pet.name}`,
          { conversationId: conv.id },
          { conversationId: conv.id },
        );
      } else if (!isOwnerCalling && ownerPrefs?.notifyMessages !== false && adopter?.name) {
        await this.inAppNotifications.create(
          ownerId,
          IN_APP_NOTIFICATION_TYPES.NEW_CONVERSATION,
          'Nova conversa',
          `${adopter.name} quer conversar sobre ${conv.pet.name}`,
          { conversationId: conv.id },
          { conversationId: conv.id },
        );
      }
    }
    return { id: conv.id };
  }

  async getOne(
    conversationId: string,
    userId: string,
  ): Promise<{
    id: string;
    otherUser: { id: string; name: string };
    pet?: { name: string; photoUrl?: string; species?: string; size?: string; age?: number };
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
                deactivatedAt: true,
                kycStatus: true,
              },
            },
          },
        },
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            adoption: { select: { id: true, adopterId: true } },
          },
        },
      },
    });
    if (!conv) return null;
    const other = conv.participants.find((p) => p.userId !== userId)?.user as
      | { id: string; name: string; avatarUrl: string | null; city: string | null; housingType: string | null; hasYard: boolean | null; hasOtherPets: boolean | null; hasChildren: boolean | null; timeAtHome: string | null; deactivatedAt: Date | null; kycStatus: string | null }
      | undefined;
    const otherUserIsPartner = other?.id ? await this.isUserPartner(other.id) : false;
    const otherUserDeactivated = !!other?.deactivatedAt;
    const otherUserTyping = this.typingService.isOtherUserTyping(conversationId, userId);
    // Adoção finalizada = Adopet confirmou (adopetConfirmedAt); após isso nem tutor nem adotante podem cancelar/desistir
    const petWithAdoption = conv.pet as typeof conv.pet & { adopetConfirmedAt?: Date | null; adopterConfirmedAt?: Date | null; adoption?: { adopterId: string } | null };
    const adoptionFinalized = conv.pet?.status === 'ADOPTED' && !!petWithAdoption?.adopetConfirmedAt;
    const adopterHasConfirmed = !!(conv.pet?.adopterConfirmedAt || conv.pet?.adoption);
    const canAdopterDecline =
      conv.adopterId === userId &&
      conv.pet?.status === 'ADOPTED' &&
      !petWithAdoption?.adopetConfirmedAt &&
      (conv.pet.pendingAdopterId === userId || petWithAdoption?.adoption?.adopterId === userId);
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
        kycVerified?: boolean;
        isPartner?: boolean;
      };
      pet?: { name: string; photoUrl?: string; species?: string; size?: string; age?: number; adoptionFinalized?: boolean; adopterHasConfirmed?: boolean; pendingAdopterId?: string; isTutor?: boolean; status?: string; canAdopterDecline?: boolean; canSendAdoptionForm?: boolean };
      otherUserTyping?: boolean;
      otherUserDeactivated?: boolean;
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
            kycVerified: other.kycStatus === 'VERIFIED',
            ...(otherUserIsPartner && { isPartner: true }),
          }
        : { id: '', name: '' },
      otherUserTyping,
      ...(otherUserDeactivated && { otherUserDeactivated: true }),
    };
    if (conv.pet) {
      const isTutor = conv.pet.ownerId === userId;
      let canSendAdoptionForm = false;
      if (isTutor && conv.pet.partnerId && conv.pet.status !== 'ADOPTED') {
        try {
          const userPartnerId = await this.petPartnershipService.getPartnerIdForUser(userId);
          const partnerMatches = !!userPartnerId && userPartnerId === conv.pet.partnerId;
          if (partnerMatches) {
            const templates = await this.adoptionFormsService.listTemplates(userId);
            canSendAdoptionForm = templates.length >= 1;
          }
        } catch {
          // user is not partner or pet doesn't belong to their partner
        }
      }
      result.pet = {
        name: conv.pet.name,
        photoUrl: conv.pet.media?.[0]?.url,
        species: conv.pet.species ?? undefined,
        size: conv.pet.size ?? undefined,
        age: conv.pet.age ?? undefined,
        adoptionFinalized,
        ...(adopterHasConfirmed && { adopterHasConfirmed: true }),
        pendingAdopterId: conv.pet.pendingAdopterId ?? undefined,
        isTutor,
        status: conv.pet.status,
        ...(canAdopterDecline && { canAdopterDecline: true }),
        ...(canSendAdoptionForm && { canSendAdoptionForm: true }),
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
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            adoption: { select: { id: true } },
          },
        },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, kycStatus: true } } } },
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
      const petWithAdopt = c.pet as { adopetConfirmedAt?: Date | null };
      const adoptionFinalized = c.pet.status === 'ADOPTED' && !!petWithAdopt?.adopetConfirmedAt;
      return {
        id: c.id,
        petId: c.petId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        pet: {
          id: c.pet.id,
          name: c.pet.name,
          photos: (c.pet.media ?? []).map((m) => m.url),
          adoptionFinalized,
        },
        otherUser: {
          id: other?.id ?? '',
          name: other?.name ?? '',
          avatarUrl: other?.avatarUrl ?? undefined,
          kycVerified: other?.kycStatus === 'VERIFIED',
        },
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId ?? '',
              messageType: (last as { messageType?: string }).messageType,
              metadata: (last as { metadata?: unknown }).metadata as Record<string, unknown> | undefined,
            }
          : undefined,
        unreadCount: unreadByConv[c.id] ?? 0,
      };
    });
  }

  /** Lista conversas com usuários que eu bloqueei (para seção "Usuários bloqueados"). */
  async listBlocked(userId: string): Promise<ConversationListItemDto[]> {
    const blockedByMe = await this.blocksService.getBlockedUserIds(userId);
    if (blockedByMe.length === 0) return [];

    const convs = await this.prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: { in: blockedByMe } } } },
        ],
      },
      include: {
        pet: {
          include: {
            media: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            adoption: { select: { id: true } },
          },
        },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, kycStatus: true } } } },
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
      const petWithAdopt = c.pet as { adopetConfirmedAt?: Date | null };
      const adoptionFinalized = c.pet.status === 'ADOPTED' && !!petWithAdopt?.adopetConfirmedAt;
      return {
        id: c.id,
        petId: c.petId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        pet: {
          id: c.pet.id,
          name: c.pet.name,
          photos: (c.pet.media ?? []).map((m) => m.url),
          adoptionFinalized,
        },
        otherUser: {
          id: other?.id ?? '',
          name: other?.name ?? '',
          avatarUrl: other?.avatarUrl ?? undefined,
          kycVerified: other?.kycStatus === 'VERIFIED',
        },
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId ?? '',
              messageType: (last as { messageType?: string }).messageType,
              metadata: (last as { metadata?: unknown }).metadata as Record<string, unknown> | undefined,
            }
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
