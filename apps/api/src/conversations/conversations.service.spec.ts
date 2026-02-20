import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from '../moderation/blocks.service';
import { TypingService } from './typing.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { ConversationsService } from './conversations.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: {
    pet: { findUnique: jest.Mock };
    favorite: { findUnique: jest.Mock };
    conversation: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock };
    message: { groupBy: jest.Mock };
    user: { findUnique: jest.Mock };
    userPreferences: { findUnique: jest.Mock };
  };

  const adopterId = 'user-adopter';
  const ownerId = 'user-owner';
  const petId = 'pet-1';

  beforeEach(async () => {
    prisma = {
      pet: { findUnique: jest.fn() },
      favorite: { findUnique: jest.fn() },
      conversation: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      message: { groupBy: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn() },
      userPreferences: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BlocksService,
          useValue: {
            isBlockedBetween: jest.fn().mockResolvedValue(false),
            getBlockedUserIds: jest.fn().mockResolvedValue([]),
            getBlockedByUserIds: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: TypingService, useValue: { setTyping: jest.fn() } },
        { provide: InAppNotificationsService, useValue: { create: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrGet', () => {
    it('should throw NotFoundException when pet does not exist', async () => {
      prisma.pet.findUnique.mockResolvedValue(null);
      await expect(service.createOrGet(adopterId, petId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has not favorited the pet', async () => {
      prisma.pet.findUnique.mockResolvedValue({ id: petId, ownerId });
      prisma.favorite.findUnique.mockResolvedValue(null);
      await expect(service.createOrGet(adopterId, petId)).rejects.toThrow(ForbiddenException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is the owner', async () => {
      prisma.pet.findUnique.mockResolvedValue({ id: petId, ownerId });
      prisma.favorite.findUnique.mockResolvedValue({ userId: ownerId, petId });
      await expect(service.createOrGet(ownerId, petId)).rejects.toThrow(ForbiddenException);
    });

    it('should return existing conversation when one already exists', async () => {
      prisma.pet.findUnique.mockResolvedValue({ id: petId, ownerId });
      prisma.favorite.findUnique.mockResolvedValue({ userId: adopterId, petId });
      prisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
      const result = await service.createOrGet(adopterId, petId);
      expect(result).toEqual({ id: 'conv-1' });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation and return id when favorited and no existing conversation', async () => {
      prisma.pet.findUnique.mockResolvedValue({ id: petId, ownerId });
      prisma.favorite.findUnique.mockResolvedValue({ userId: adopterId, petId });
      prisma.conversation.findUnique.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({
        id: 'conv-new',
        petId,
        adopterId,
      });
      prisma.user.findUnique.mockResolvedValue({ name: 'Adopter' });
      prisma.userPreferences.findUnique.mockResolvedValue({ notifyMessages: true });
      const result = await service.createOrGet(adopterId, petId);
      expect(result).toEqual({ id: 'conv-new' });
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          petId,
          adopterId,
          type: 'NORMAL',
          participants: {
            create: [{ userId: ownerId }, { userId: adopterId }],
          },
        },
        include: {
          pet: { select: { name: true } },
        },
      });
    });
  });

  describe('list', () => {
    it('should return conversations for user with pet and otherUser', async () => {
      prisma.conversation.findMany.mockResolvedValue([
        {
          id: 'conv-1',
          petId,
          createdAt: new Date(),
          updatedAt: new Date(),
          pet: { id: petId, name: 'Rex', media: [{ url: 'x.jpg' }] },
          participants: [
            { userId: ownerId, user: { id: ownerId, name: 'Owner', avatarUrl: null } },
            { userId: adopterId, user: { id: adopterId, name: 'Adopter', avatarUrl: null } },
          ],
          messages: [{ content: 'Hi', createdAt: new Date(), senderId: adopterId }],
        },
      ]);
      const result = await service.list(adopterId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-1');
      expect(result[0].pet.name).toBe('Rex');
      expect(result[0].otherUser.id).toBe(ownerId);
      expect(result[0].lastMessage?.content).toBe('Hi');
      expect(result[0].unreadCount).toBe(0);
    });
  });
});
