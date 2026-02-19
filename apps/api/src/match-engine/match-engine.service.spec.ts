import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchEngineService } from './match-engine.service';

describe('MatchEngineService', () => {
  let service: MatchEngineService;
  let prisma: {
    pet: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  const petId = 'pet-1';
  const adopterId = 'adopter-1';
  const ownerId = 'owner-1';

  const petRow = {
    ownerId,
    preferredTutorHousingType: 'CASA',
    preferredTutorHasYard: 'SIM',
    preferredTutorHasOtherPets: null,
    preferredTutorHasChildren: null,
    preferredTutorTimeAtHome: null,
    preferredTutorPetsAllowedAtHome: null,
    preferredTutorDogExperience: null,
    preferredTutorCatExperience: null,
    preferredTutorHouseholdAgrees: null,
  };

  const adopterRow = {
    id: adopterId,
    housingType: 'CASA',
    hasYard: true,
    hasOtherPets: null,
    hasChildren: null,
    timeAtHome: null,
    petsAllowedAtHome: null,
    dogExperience: null,
    catExperience: null,
    householdAgreesToAdoption: null,
  };

  beforeEach(async () => {
    prisma = {
      pet: { findUnique: jest.fn().mockResolvedValue(petRow) },
      user: { findUnique: jest.fn().mockResolvedValue(adopterRow) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchEngineService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MatchEngineService>(MatchEngineService);
  });

  it('retorna score quando solicitante é o tutor (owner)', async () => {
    const result = await service.getMatchScore(petId, adopterId, ownerId);
    expect(result.score).toBe(100);
    expect(result.criteriaCount).toBe(2);
    expect(prisma.pet.findUnique).toHaveBeenCalledWith({
      where: { id: petId },
      select: expect.any(Object),
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: adopterId, deactivatedAt: null },
      select: expect.any(Object),
    });
  });

  it('retorna score quando solicitante é o próprio adotante', async () => {
    const result = await service.getMatchScore(petId, adopterId, adopterId);
    expect(result.score).toBe(100);
  });

  it('lança NotFoundException quando pet não existe', async () => {
    prisma.pet.findUnique.mockResolvedValue(null);
    await expect(service.getMatchScore(petId, adopterId, ownerId)).rejects.toThrow(NotFoundException);
    await expect(service.getMatchScore(petId, adopterId, ownerId)).rejects.toThrow('Pet não encontrado');
  });

  it('lança NotFoundException quando adotante não existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getMatchScore(petId, adopterId, ownerId)).rejects.toThrow(NotFoundException);
    await expect(service.getMatchScore(petId, adopterId, ownerId)).rejects.toThrow('Adotante não encontrado');
  });

  it('lança ForbiddenException quando usuário não é tutor nem adotante', async () => {
    const otherUserId = 'other-user';
    await expect(service.getMatchScore(petId, adopterId, otherUserId)).rejects.toThrow(ForbiddenException);
    await expect(service.getMatchScore(petId, adopterId, otherUserId)).rejects.toThrow(
      'Apenas o tutor do pet ou o adotante podem ver o score de match',
    );
  });

  it('retorna score null quando pet não tem preferências definidas', async () => {
    prisma.pet.findUnique.mockResolvedValue({
      ...petRow,
      preferredTutorHousingType: null,
      preferredTutorHasYard: null,
    });
    const result = await service.getMatchScore(petId, adopterId, ownerId);
    expect(result.score).toBeNull();
    expect(result.criteriaCount).toBe(0);
  });
});
