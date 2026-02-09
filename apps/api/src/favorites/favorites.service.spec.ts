import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: {
    pet: { findUnique: jest.Mock };
    favorite: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock; findMany: jest.Mock };
  };

  const userId = 'user-1';
  const petId = 'pet-1';
  const mockPet = {
    id: petId,
    name: 'Rex',
    species: 'DOG',
    age: 2,
    status: 'AVAILABLE',
    media: [{ url: 'https://example.com/1.jpg' }],
  };

  beforeEach(async () => {
    prisma = {
      pet: { findUnique: jest.fn() },
      favorite: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<FavoritesService>(FavoritesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should throw NotFoundException when pet does not exist', async () => {
      prisma.pet.findUnique.mockResolvedValue(null);
      await expect(service.add(userId, petId)).rejects.toThrow(NotFoundException);
      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when pet is already favorited', async () => {
      prisma.pet.findUnique.mockResolvedValue(mockPet);
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1', userId, petId });
      await expect(service.add(userId, petId)).rejects.toThrow(ConflictException);
      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });

    it('should create favorite and return item when pet exists and not favorited', async () => {
      prisma.pet.findUnique.mockResolvedValue(mockPet);
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue({
        id: 'fav-1',
        petId,
        createdAt: new Date(),
        pet: mockPet,
      });
      const result = await service.add(userId, petId);
      expect(result).toHaveProperty('id', 'fav-1');
      expect(result).toHaveProperty('petId', petId);
      expect(result.pet).toMatchObject({ id: petId, name: 'Rex', species: 'DOG', age: 2, status: 'AVAILABLE' });
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { userId, petId },
        include: expect.any(Object),
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when favorite does not exist', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      await expect(service.remove(userId, petId)).rejects.toThrow(NotFoundException);
      expect(prisma.favorite.delete).not.toHaveBeenCalled();
    });

    it('should delete favorite and return message when it exists', async () => {
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1', userId, petId });
      prisma.favorite.delete.mockResolvedValue({});
      const result = await service.remove(userId, petId);
      expect(result).toEqual({ message: 'OK' });
      expect(prisma.favorite.delete).toHaveBeenCalledWith({ where: { id: 'fav-1' } });
    });
  });

  describe('list', () => {
    it('should return list of favorites for user', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        {
          id: 'fav-1',
          petId,
          createdAt: new Date(),
          pet: mockPet,
        },
      ]);
      const result = await service.list(userId);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
      expect(result.items[0]).toHaveProperty('petId', petId);
      expect(result.items[0].pet.name).toBe('Rex');
      expect(prisma.favorite.findMany).toHaveBeenCalledWith({
        where: { userId },
        take: 21,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });
});
