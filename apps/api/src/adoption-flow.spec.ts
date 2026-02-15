/**
 * Testes do fluxo de adoção completo:
 * 1. Tutor cria anúncio (pet) -> aprovado
 * 2. Outro usuário favorita o pet
 * 3. Inicia conversa (após favoritar)
 * 4. Troca mensagens -> notificação de mensagem ao tutor
 * 5. Tutor marca pet como adotado (adotante indicado)
 * 6. Adotante confirma adoção no app
 * 7. Admin (ou job 48h) confirma pela Adopet -> adopetConfirmedAt
 * 8. Pontuação do tutor e adotante reflete a adoção confirmada
 *
 * Este arquivo testa o encadeamento crítico: confirmação pela Adopet e pontuação.
 * Criar anúncio, favoritar, conversar e notificações são cobertos em pets, favorites, conversations e messages specs.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma/prisma.service';
import { TutorStatsService } from './me/tutor-stats.service';
import { VerificationService } from './verification/verification.service';
import { AdminService } from './admin/admin.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import {
  POINTS_PER_ADOPTED_PET,
  BONUS_FIRST_ADOPTION,
} from './me/tutor-stats.constants';

describe('Fluxo de adoção completo (confirmação e pontuação)', () => {
  let tutorStatsService: TutorStatsService;
  let adminService: AdminService;
  let prisma: {
    pet: { findUnique: jest.Mock; update: jest.Mock };
    adoption: { count: jest.Mock };
    adoptionFindMany?: jest.Mock;
    petFindMany?: jest.Mock;
  };
  let verification: { getVerifiedPetIds: jest.Mock };

  const tutorId = 'user-tutor';
  const adopterId = 'user-adopter';
  const petId = 'pet-1';

  beforeEach(async () => {
    prisma = {
      pet: { findUnique: jest.fn(), update: jest.fn() },
      adoption: { count: jest.fn() },
    };
    verification = { getVerifiedPetIds: jest.fn().mockResolvedValue(new Set()) };
    const fullPrisma = {
      ...prisma,
      pet: { ...prisma.pet, findMany: jest.fn().mockResolvedValue([]) },
      adoption: { ...prisma.adoption, findMany: jest.fn() },
    };

    const tutorStatsModule: TestingModule = await Test.createTestingModule({
      providers: [
        TutorStatsService,
        { provide: PrismaService, useValue: fullPrisma },
        { provide: VerificationService, useValue: verification },
      ],
    }).compile();
    tutorStatsService = tutorStatsModule.get<TutorStatsService>(TutorStatsService);

    const adminModule: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: fullPrisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: { send: jest.fn() } },
      ],
    }).compile();
    adminService = adminModule.get<AdminService>(AdminService);
  });

  it('após admin confirmar adoção pela Adopet, pet recebe adopetConfirmedAt', async () => {
    prisma.pet.findUnique.mockResolvedValue({
      id: petId,
      adopetConfirmedAt: null,
      adoption: { id: 'adopt-1' },
    });
    prisma.pet.update.mockResolvedValue({});

    await adminService.confirmAdoptionByAdopet(petId);

    expect(prisma.pet.update).toHaveBeenCalledWith({
      where: { id: petId },
      data: { adopetConfirmedAt: expect.any(Date) },
    });
  });

  it('quando há uma adoção confirmada (adopetConfirmedAt), pontuação do tutor inclui a adoção', async () => {
    const prismaForStats = {
      pet: { findMany: jest.fn().mockResolvedValue([{ id: petId, status: 'ADOPTED' }]) },
      adoption: {
        count: jest.fn()
          .mockResolvedValueOnce(1)  // adoptedCountAsTutor
          .mockResolvedValueOnce(0), // adoptedCountAsAdopter
      },
    };
    const mod = await Test.createTestingModule({
      providers: [
        TutorStatsService,
        { provide: PrismaService, useValue: prismaForStats },
        { provide: VerificationService, useValue: verification },
      ],
    }).compile();
    const stats = mod.get<TutorStatsService>(TutorStatsService);

    const res = await stats.getStats(tutorId);

    expect(res.adoptedCount).toBe(1);
    expect(res.points).toBeGreaterThanOrEqual(POINTS_PER_ADOPTED_PET + BONUS_FIRST_ADOPTION);
  });

  it('adotante também ganha pontos quando adoção está confirmada pela Adopet', async () => {
    const prismaForStats = {
      pet: { findMany: jest.fn().mockResolvedValue([]) },
      adoption: {
        count: jest.fn()
          .mockResolvedValueOnce(0)  // tutor
          .mockResolvedValueOnce(1), // adopter
      },
    };
    const mod = await Test.createTestingModule({
      providers: [
        TutorStatsService,
        { provide: PrismaService, useValue: prismaForStats },
        { provide: VerificationService, useValue: verification },
      ],
    }).compile();
    const stats = mod.get<TutorStatsService>(TutorStatsService);

    const res = await stats.getStats(adopterId);

    expect(res.adoptedCount).toBe(0); // adoptedCount = só doações como tutor
    expect(res.points).toBeGreaterThanOrEqual(POINTS_PER_ADOPTED_PET + BONUS_FIRST_ADOPTION);
  });

  it('confirmar adoção já confirmada (idempotente) nao atualiza nem lança erro', async () => {
    const alreadyConfirmed = new Date();
    prisma.pet.findUnique.mockResolvedValue({
      id: petId,
      adopetConfirmedAt: alreadyConfirmed,
      adoption: { id: 'adopt-1' },
    });

    await adminService.confirmAdoptionByAdopet(petId);

    expect(prisma.pet.update).not.toHaveBeenCalled();
  });
});
