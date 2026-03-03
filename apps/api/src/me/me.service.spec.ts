import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MeService } from './me.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';

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
        { provide: VerificationService, useValue: { assertUser: jest.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
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
      expect(res.species).toBe('BOTH');
      expect(res.radiusKm).toBe(50);
      expect(res.notifyNewPets).toBe(true);
      expect(res.completionPercent).toBe(25);
      expect(res.missingFields).toHaveLength(3);
    });

    it('should return stored preferences', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue({
        species: 'DOG',
        radiusKm: 25,
      });
      const res = await service.getPreferences('user-1');
      expect(res.species).toBe('DOG');
      expect(res.radiusKm).toBe(25);
      expect(res.completionPercent).toBe(25);
      expect(res.missingFields).toHaveLength(3);
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
      expect(res.species).toBe('CAT');
      expect(res.radiusKm).toBe(100);
      expect(res.completionPercent).toBeDefined();
      expect(res.missingFields).toBeDefined();
    });
  });
});
