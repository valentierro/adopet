import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../notifications/push.service';
import { BlocksService } from '../moderation/blocks.service';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: {
    message: { findMany: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    conversation: { findUnique: jest.Mock };
    userPreferences: { findUnique: jest.Mock };
  };
  let push: { sendToUser: jest.Mock };

  const userId = 'user-1';
  const otherUserId = 'user-2';
  const conversationId = 'conv-1';

  beforeEach(async () => {
    prisma = {
      message: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      conversation: { findUnique: jest.fn() },
      userPreferences: { findUnique: jest.fn().mockResolvedValue({ notifyMessages: true }) },
    };
    push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const blocksService = { isBlockedBetween: jest.fn().mockResolvedValue(false) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
        { provide: BlocksService, useValue: blocksService },
      ],
    }).compile();
    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPage', () => {
    it('should throw NotFoundException when conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);
      await expect(service.getPage(conversationId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce({
          id: conversationId,
          participants: [{ userId: otherUserId }],
        });
      await expect(service.getPage(conversationId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should return messages page when user is participant', async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce({
          id: conversationId,
          participants: [{ userId }, { userId: otherUserId }],
        });
      prisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          conversationId,
          senderId: userId,
          content: 'Hello',
          createdAt: new Date(),
          readAt: null,
        },
      ]);
      const result = await service.getPage(conversationId, userId);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toBe('Hello');
      expect(result.items[0].senderId).toBe(userId);
      expect(prisma.message.findMany).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should throw ForbiddenException when user is not a participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        participants: [{ userId: otherUserId }],
      });
      await expect(service.send(conversationId, userId, { content: 'Hi' })).rejects.toThrow(ForbiddenException);
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('should create message and send push to other participant', async () => {
      prisma.conversation.findUnique
        .mockResolvedValueOnce({
          id: conversationId,
          participants: [{ userId }, { userId: otherUserId }],
        });
      prisma.message.create.mockResolvedValue({
        id: 'msg-1',
        conversationId,
        senderId: userId,
        content: 'Hello',
        imageUrl: null,
        createdAt: new Date(),
        readAt: null,
      });
      prisma.conversation.findUnique
        .mockResolvedValueOnce({
          id: conversationId,
          participants: [{ userId }, { userId: otherUserId }],
          pet: { name: 'Rex' },
        });
      const result = await service.send(conversationId, userId, { content: 'Hello' });
      expect(result.content).toBe('Hello');
      expect(result.senderId).toBe(userId);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId, senderId: userId, content: 'Hello', imageUrl: undefined },
      });
      expect(push.sendToUser).toHaveBeenCalledWith(
        otherUserId,
        'Nova mensagem',
        expect.stringContaining('Hello'),
        { conversationId },
      );
    });
  });
});
