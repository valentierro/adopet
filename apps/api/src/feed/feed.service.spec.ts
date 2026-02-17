import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../moderation/reports.service';
import { BlocksService } from '../moderation/blocks.service';
import { VerificationService } from '../verification/verification.service';

describe('FeedService', () => {
  let service: FeedService;
  let prisma: {
    pet: { findMany: jest.Mock };
    partner: { findMany: jest.Mock };
  };
  let reports: { getReportedPetIds: jest.Mock };
  let blocks: { getBlockedUserIds: jest.Mock; getBlockedByUserIds: jest.Mock };
  let verification: { getVerifiedPetIds: jest.Mock };

  const lat = -23.55;
  const lng = -46.63;
  const radiusKm = 50;

  const mockPet = (id: string, species: string, petLat: number, petLng: number) => ({
    id,
    name: 'Pet',
    age: 2,
    species,
    size: 'MEDIUM',
    vaccinated: true,
    ownerId: 'owner-1',
    latitude: petLat,
    longitude: petLng,
    media: [{ url: 'https://example.com/photo.jpg' }],
    owner: { city: 'São Paulo' },
    partner: null,
  });

  beforeEach(async () => {
    prisma = {
      pet: { findMany: jest.fn() },
      partner: { findMany: jest.fn().mockResolvedValue([]) },
    };
    reports = { getReportedPetIds: jest.fn().mockResolvedValue([]) };
    blocks = {
      getBlockedUserIds: jest.fn().mockResolvedValue([]),
      getBlockedByUserIds: jest.fn().mockResolvedValue([]),
    };
    verification = { getVerifiedPetIds: jest.fn().mockResolvedValue(new Set<string>()) };

    const fullPrisma = {
      ...prisma,
      adoption: { findMany: jest.fn(), findUnique: jest.fn() },
      favorite: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
      userPreferences: { findUnique: jest.fn().mockResolvedValue(null) },
      swipe: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: fullPrisma },
        { provide: ReportsService, useValue: reports },
        { provide: BlocksService, useValue: blocks },
        { provide: VerificationService, useValue: verification },
      ],
    }).compile();
    service = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMapPins', () => {
    it('chama findMany sem species quando species não é passado', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getMapPins(lat, lng, radiusKm, 'user-1');
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ species: expect.anything() }),
        }),
      );
    });

    it('chama findMany com species quando species é DOG', async () => {
      prisma.pet.findMany.mockResolvedValue([
        mockPet('p1', 'DOG', -23.55, -46.63),
      ]);
      await service.getMapPins(lat, lng, radiusKm, 'user-1', 'DOG');
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ species: 'DOG' }),
        }),
      );
    });

    it('chama findMany com species quando species é CAT', async () => {
      prisma.pet.findMany.mockResolvedValue([
        mockPet('p1', 'CAT', -23.55, -46.64),
      ]);
      await service.getMapPins(lat, lng, radiusKm, 'user-1', 'CAT');
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ species: 'CAT' }),
        }),
      );
    });

    it('retorna items com shape correto (id, name, latitude, longitude, etc)', async () => {
      const pet = mockPet('pet-1', 'DOG', -23.55, -46.63);
      prisma.pet.findMany.mockResolvedValue([pet]);
      const res = await service.getMapPins(lat, lng, radiusKm, 'user-1');
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({
        id: 'pet-1',
        name: 'Pet',
        age: 2,
        species: 'DOG',
        latitude: -23.55,
        longitude: -46.63,
        photoUrl: 'https://example.com/photo.jpg',
        verified: false,
      });
      expect(typeof res.items[0].distanceKm).toBe('number');
    });

    it('retorna apenas pets dentro do raio', async () => {
      const perto = mockPet('p1', 'DOG', -23.55, -46.63);
      const longe = mockPet('p2', 'DOG', -22.0, -46.0);
      prisma.pet.findMany.mockResolvedValue([perto, longe]);
      const res = await service.getMapPins(lat, lng, 10);
      expect(res.items.length).toBeLessThanOrEqual(2);
      res.items.forEach((item) => {
        expect(item.distanceKm).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('getFeed', () => {
    const baseQuery = {
      lat,
      lng,
      radiusKm,
      userId: 'user-1',
    };

    it('inclui energyLevel no where quando energyLevel é passado', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, energyLevel: 'HIGH' });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ energyLevel: 'HIGH' }),
        }),
      );
    });

    it('inclui temperament no where quando temperament é passado', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, temperament: 'CALM' });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ temperament: 'CALM' }),
        }),
      );
    });

    it('inclui goodWithChildren no where quando goodWithChildren é passado', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, goodWithChildren: 'YES' });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ goodWithChildren: 'YES' }),
        }),
      );
    });

    it('inclui hasSpecialNeeds: true no where quando hasSpecialNeeds é true', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, hasSpecialNeeds: true });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hasSpecialNeeds: true }),
        }),
      );
    });

    it('pode combinar múltiplos filtros de triagem', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({
        ...baseQuery,
        energyLevel: 'MEDIUM',
        temperament: 'PLAYFUL',
        goodWithDogs: 'YES',
      });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            energyLevel: 'MEDIUM',
            temperament: 'PLAYFUL',
            goodWithDogs: 'YES',
          }),
        }),
      );
    });

    it('inclui isDocile: true no where quando isDocile é true', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, isDocile: true });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDocile: true }),
        }),
      );
    });

    it('inclui isTrained: true no where quando isTrained é true', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await service.getFeed({ ...baseQuery, isTrained: true });
      expect(prisma.pet.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isTrained: true }),
        }),
      );
    });
  });
});
