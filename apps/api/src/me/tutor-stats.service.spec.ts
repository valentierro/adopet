import { Test, TestingModule } from '@nestjs/testing';
import { TutorStatsService } from './tutor-stats.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationService } from '../verification/verification.service';
import {
  POINTS_PER_VERIFIED_PET,
  POINTS_PER_ADOPTED_PET,
  BONUS_FIRST_ADOPTION,
  MILESTONE_BONUS,
  MILESTONE_AT,
} from './tutor-stats.constants';

describe('TutorStatsService', () => {
  let service: TutorStatsService;
  let prisma: {
    pet: { findMany: jest.Mock };
    adoption: { count: jest.Mock };
  };
  let verification: { getVerifiedPetIds: jest.Mock };

  beforeEach(async () => {
    prisma = {
      pet: { findMany: jest.fn() },
      adoption: { count: jest.fn() },
    };
    verification = { getVerifiedPetIds: jest.fn().mockResolvedValue(new Set()) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorStatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: VerificationService, useValue: verification },
      ],
    }).compile();
    service = module.get<TutorStatsService>(TutorStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats - pontuação só com adoções confirmadas pela Adopet', () => {
    it('deve retornar 0 adoções e 0 pontos quando usuário não tem pets', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      prisma.adoption.count.mockResolvedValue(0);
      const res = await service.getStats('user-1');
      expect(res.points).toBe(0);
      expect(res.adoptedCount).toBe(0);
      expect(res.verifiedCount).toBe(0);
    });

    it('deve contar apenas adoções com adopetConfirmedAt preenchido (tutor)', async () => {
      prisma.pet.findMany.mockResolvedValue([{ id: 'pet-1', status: 'ADOPTED' }]);
      verification.getVerifiedPetIds.mockResolvedValue(new Set());
      prisma.adoption.count
        .mockResolvedValueOnce(0) // adoptedCountAsTutor: nenhuma confirmada
        .mockResolvedValueOnce(0); // adoptedCountAsAdopter

      const res = await service.getStats('user-1');
      expect(res.adoptedCount).toBe(0);
      expect(res.points).toBe(0);
      expect(prisma.adoption.count).toHaveBeenNthCalledWith(1, {
        where: { tutorId: 'user-1', pet: { adopetConfirmedAt: { not: null } } },
      });
      expect(prisma.adoption.count).toHaveBeenNthCalledWith(2, {
        where: { adopterId: 'user-1', pet: { adopetConfirmedAt: { not: null } } },
      });
    });

    it('deve somar pontos quando há adoção confirmada (tutor doou 1 pet)', async () => {
      prisma.pet.findMany.mockResolvedValue([{ id: 'pet-1', status: 'ADOPTED' }]);
      verification.getVerifiedPetIds.mockResolvedValue(new Set());
      prisma.adoption.count
        .mockResolvedValueOnce(1) // adoptedCountAsTutor
        .mockResolvedValueOnce(0); // adoptedCountAsAdopter

      const res = await service.getStats('user-1');
      expect(res.adoptedCount).toBe(1);
      const expectedPoints =
        1 * POINTS_PER_ADOPTED_PET + BONUS_FIRST_ADOPTION;
      expect(res.points).toBe(expectedPoints);
    });

    it('deve somar pontos de adotante (adopter) com adoção confirmada', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      prisma.adoption.count
        .mockResolvedValueOnce(0) // tutor
        .mockResolvedValueOnce(2); // adopter: 2 adoções confirmadas

      const res = await service.getStats('user-1');
      expect(res.adoptedCount).toBe(0); // adoptedCount = só tutor
      const expectedPoints =
        2 * POINTS_PER_ADOPTED_PET + BONUS_FIRST_ADOPTION;
      expect(res.points).toBe(expectedPoints);
    });

    it('deve aplicar bônus de marco (3ª, 5ª, 10ª adoção)', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      prisma.adoption.count
        .mockResolvedValueOnce(10) // tutor 10 adoções confirmadas
        .mockResolvedValueOnce(0);

      const res = await service.getStats('user-1');
      expect(res.adoptedCount).toBe(10);
      const basePoints = 10 * POINTS_PER_ADOPTED_PET + BONUS_FIRST_ADOPTION;
      const milestoneBonus = MILESTONE_AT.filter((at) => 10 >= at).length * MILESTONE_BONUS;
      expect(res.points).toBe(basePoints + milestoneBonus);
    });

    it('deve somar pontos de pets verificados', async () => {
      prisma.pet.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      verification.getVerifiedPetIds.mockResolvedValue(new Set(['p1', 'p2']));
      prisma.adoption.count.mockResolvedValue(0);

      const res = await service.getStats('user-1');
      expect(res.verifiedCount).toBe(2);
      expect(res.points).toBe(2 * POINTS_PER_VERIFIED_PET);
    });

    it('adoptedCount no retorno deve ser só adoções como tutor (doou), não como adotante', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      prisma.adoption.count
        .mockResolvedValueOnce(2) // tutor doou 2
        .mockResolvedValueOnce(3); // adotou 3

      const res = await service.getStats('user-1');
      expect(res.adoptedCount).toBe(2);
      const totalAdopted = 5;
      const expectedPoints =
        totalAdopted * POINTS_PER_ADOPTED_PET +
        BONUS_FIRST_ADOPTION +
        MILESTONE_AT.filter((at) => totalAdopted >= at).length * MILESTONE_BONUS;
      expect(res.points).toBe(expectedPoints);
    });
  });
});
