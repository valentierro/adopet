import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from './blocks.service';

describe('BlocksService', () => {
  let service: BlocksService;
  let prisma: {
    user: { findUnique: jest.Mock };
    block: { upsert: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  const blockerId = 'user-1';
  const blockedUserId = 'user-2';

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      block: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<BlocksService>(BlocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('block', () => {
    it('should throw when blocking self', async () => {
      await expect(service.block(blockerId, { blockedUserId: blockerId })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.block.upsert).not.toHaveBeenCalled();
    });

    it('should throw when blocked user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.block(blockerId, { blockedUserId })).rejects.toThrow(NotFoundException);
    });

    it('should create block', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: blockedUserId });
      prisma.block.upsert.mockResolvedValue({ blockerId, blockedUserId });
      const result = await service.block(blockerId, { blockedUserId });
      expect(result).toEqual({ blocked: true });
      expect(prisma.block.upsert).toHaveBeenCalledWith({
        where: { blockerId_blockedUserId: { blockerId, blockedUserId } },
        create: { blockerId, blockedUserId },
        update: {},
      });
    });
  });

  describe('unblock', () => {
    it('should return unblocked', async () => {
      prisma.block.deleteMany.mockResolvedValue({ count: 1 });
      const result = await service.unblock(blockerId, blockedUserId);
      expect(result).toEqual({ unblocked: true });
    });
  });

  describe('isBlockedBetween', () => {
    it('should return true when block exists', async () => {
      prisma.block.count.mockResolvedValue(1);
      const result = await service.isBlockedBetween('a', 'b');
      expect(result).toBe(true);
    });

    it('should return false when no block', async () => {
      prisma.block.count.mockResolvedValue(0);
      const result = await service.isBlockedBetween('a', 'b');
      expect(result).toBe(false);
    });
  });
});
