import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PetsService } from './pets.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import { PushService } from '../notifications/push.service';
import { AdminService } from '../admin/admin.service';

jest.mock('../common/geocoding', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

describe('PetsService', () => {
  let service: PetsService;
  let prisma: {
    pet: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    petMedia: { create: jest.Mock };
    partner: { findFirst: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
  };

  const basePet = {
    id: 'pet-1',
    name: 'Rex',
    species: 'DOG',
    age: 2,
    sex: 'male',
    size: 'medium',
    vaccinated: true,
    neutered: false,
    description: 'Desc',
    ownerId: 'owner-1',
    status: 'AVAILABLE',
    createdAt: new Date(),
    updatedAt: new Date(),
    latitude: null,
    longitude: null,
    city: null,
    breed: null,
    adoptionReason: null,
    feedingType: null,
    feedingNotes: null,
    publicationStatus: 'PENDING',
    publicationRejectionReason: null,
    expiresAt: null,
    media: [] as { id: string; url: string; sortOrder?: number }[],
    partner: null,
  };

  beforeEach(async () => {
    prisma = {
      pet: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      petMedia: { create: jest.fn() },
      partner: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const verification = {
      isPetVerified: jest.fn().mockResolvedValue(false),
      isUserVerified: jest.fn().mockResolvedValue(false),
      getVerifiedPetIds: jest.fn().mockResolvedValue(new Set<string>()),
    };
    const tutorStats = { getStats: jest.fn().mockResolvedValue({ points: 0, level: '0', title: '', verifiedCount: 0, adoptedCount: 0 }) };
    const config = { get: jest.fn().mockReturnValue(50) };
    const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const admin = { notifyNewPetSubmission: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: VerificationService, useValue: verification },
        { provide: TutorStatsService, useValue: tutorStats },
        { provide: ConfigService, useValue: config },
        { provide: PushService, useValue: push },
        { provide: AdminService, useValue: admin },
      ],
    }).compile();
    service = module.get<PetsService>(PetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('persiste campos de triagem (energyLevel, temperament, goodWith*, hasSpecialNeeds, healthNotes)', async () => {
      const created = {
        ...basePet,
        energyLevel: 'HIGH',
        healthNotes: null,
        hasSpecialNeeds: false,
        goodWithDogs: 'YES',
        goodWithCats: 'NO',
        goodWithChildren: 'YES',
        temperament: 'PLAYFUL',
      };
      prisma.pet.create.mockResolvedValue(created);
      prisma.pet.findUnique.mockResolvedValue({ ...created, media: [] });

      await service.create('owner-1', {
        name: 'Rex',
        species: 'dog',
        age: 2,
        sex: 'male',
        size: 'medium',
        vaccinated: true,
        neutered: false,
        description: 'Desc',
        energyLevel: 'HIGH',
        temperament: 'PLAYFUL',
        goodWithDogs: 'YES',
        goodWithCats: 'NO',
        goodWithChildren: 'YES',
        hasSpecialNeeds: false,
      });

      expect(prisma.pet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            energyLevel: 'HIGH',
            temperament: 'PLAYFUL',
            goodWithDogs: 'YES',
            goodWithCats: 'NO',
            goodWithChildren: 'YES',
            hasSpecialNeeds: false,
          }),
        }),
      );
    });

    it('persiste healthNotes e hasSpecialNeeds true quando informados', async () => {
      const created = { ...basePet, healthNotes: 'Cardíaco', hasSpecialNeeds: true };
      prisma.pet.create.mockResolvedValue(created);
      prisma.pet.findUnique.mockResolvedValue({ ...created, media: [] });

      await service.create('owner-1', {
        name: 'Rex',
        species: 'dog',
        age: 2,
        sex: 'male',
        size: 'medium',
        vaccinated: true,
        neutered: false,
        description: 'Desc',
        healthNotes: 'Cardíaco',
        hasSpecialNeeds: true,
      });

      expect(prisma.pet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            healthNotes: 'Cardíaco',
            hasSpecialNeeds: true,
          }),
        }),
      );
    });

    it('persiste isDocile e isTrained quando informados', async () => {
      const created = { ...basePet, isDocile: true, isTrained: true };
      prisma.pet.create.mockResolvedValue(created);
      prisma.pet.findUnique.mockResolvedValue({ ...created, media: [] });

      await service.create('owner-1', {
        name: 'Rex',
        species: 'dog',
        age: 2,
        sex: 'male',
        size: 'medium',
        vaccinated: true,
        neutered: false,
        description: 'Desc',
        isDocile: true,
        isTrained: true,
      });

      expect(prisma.pet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isDocile: true,
            isTrained: true,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('atualiza campos de triagem quando enviados', async () => {
      const updated = {
        ...basePet,
        energyLevel: 'LOW',
        temperament: 'CALM',
        goodWithChildren: 'YES',
      };
      prisma.pet.update.mockResolvedValue(updated);

      await service.update('pet-1', 'owner-1', {
        energyLevel: 'LOW',
        temperament: 'CALM',
        goodWithChildren: 'YES',
      });

      expect(prisma.pet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pet-1' },
          data: expect.objectContaining({
            energyLevel: 'LOW',
            temperament: 'CALM',
            goodWithChildren: 'YES',
          }),
        }),
      );
    });

    it('atualiza isDocile e isTrained quando enviados', async () => {
      const updated = { ...basePet, isDocile: true, isTrained: false };
      prisma.pet.update.mockResolvedValue(updated);

      await service.update('pet-1', 'owner-1', {
        isDocile: true,
        isTrained: false,
      });

      expect(prisma.pet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pet-1' },
          data: expect.objectContaining({
            isDocile: true,
            isTrained: false,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retorna DTO com campos de triagem quando o pet os possui', async () => {
      const petWithTriage = {
        ...basePet,
        owner: {
          id: 'owner-1',
          name: 'Tutor',
          avatarUrl: null,
          city: 'SP',
          bio: null,
          housingType: null,
          hasYard: null,
          hasOtherPets: null,
          hasChildren: null,
          timeAtHome: null,
          petsAllowedAtHome: null,
          dogExperience: null,
          catExperience: null,
          householdAgreesToAdoption: null,
          whyAdopt: null,
        },
        energyLevel: 'MEDIUM',
        temperament: 'SOCIABLE',
        goodWithDogs: 'YES',
        goodWithCats: 'UNKNOWN',
        goodWithChildren: 'YES',
        hasSpecialNeeds: false,
        healthNotes: null,
        isDocile: true,
        isTrained: false,
      };
      prisma.pet.findUnique.mockResolvedValue(petWithTriage);

      const result = await service.findOne('pet-1');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        energyLevel: 'MEDIUM',
        temperament: 'SOCIABLE',
        goodWithDogs: 'YES',
        goodWithCats: 'UNKNOWN',
        goodWithChildren: 'YES',
        hasSpecialNeeds: false,
        isDocile: true,
        isTrained: false,
      });
    });
  });
});
