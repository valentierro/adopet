import { Test, TestingModule } from '@nestjs/testing';
import { MeService } from './me.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MeService', () => {
  let service: MeService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    userPreferences: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      userPreferences: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<MeService>(MeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPreferences', () => {
    it('should return default when no preferences', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue(null);
      const res = await service.getPreferences('user-1');
      expect(res).toEqual({ species: 'BOTH', radiusKm: 50 });
    });

    it('should return stored preferences', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue({
        species: 'DOG',
        radiusKm: 25,
      });
      const res = await service.getPreferences('user-1');
      expect(res).toEqual({ species: 'DOG', radiusKm: 25 });
    });
  });

  describe('updatePreferences', () => {
    it('should upsert and return preferences', async () => {
      prisma.userPreferences.upsert.mockResolvedValue({
        species: 'CAT',
        radiusKm: 100,
      });
      const res = await service.updatePreferences('user-1', {
        species: 'CAT',
        radiusKm: 100,
      });
      expect(res).toEqual({ species: 'CAT', radiusKm: 100 });
    });
  });
});
