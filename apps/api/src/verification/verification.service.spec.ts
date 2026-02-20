import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { TutorStatsService } from '../me/tutor-stats.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: {
    pet: { findFirst: jest.Mock };
    verification: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const userId = 'user-1';
  const petId = 'pet-1';

  beforeEach(async () => {
    prisma = {
      pet: { findFirst: jest.fn() },
      verification: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: InAppNotificationsService, useValue: { create: jest.fn().mockResolvedValue(undefined) } },
        { provide: TutorStatsService, useValue: { getStats: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();
    service = module.get<VerificationService>(VerificationService);
  });

  describe('request', () => {
    beforeEach(() => {
      prisma.verification.findFirst.mockResolvedValue(null);
    });

    describe('USER_VERIFIED', () => {
      it('deve aceitar solicitação com pelo menos 1 evidenceUrl', async () => {
        const created = {
          id: 'v1',
          userId,
          type: 'USER_VERIFIED',
          status: 'PENDING',
          metadata: { evidenceUrls: ['https://cdn.example.com/face.jpg'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prisma.verification.create.mockResolvedValue(created);

        const result = await service.request(userId, 'USER_VERIFIED', undefined, [
          'https://cdn.example.com/face.jpg',
        ]);

        expect(result).toMatchObject({
          id: 'v1',
          type: 'USER_VERIFIED',
          status: 'PENDING',
          evidenceUrls: ['https://cdn.example.com/face.jpg'],
        });
        expect(result.skipEvidenceReason).toBeUndefined();
        expect(prisma.verification.create).toHaveBeenCalledWith({
          data: {
            userId,
            type: 'USER_VERIFIED',
            status: 'PENDING',
            metadata: { evidenceUrls: ['https://cdn.example.com/face.jpg'] },
          },
        });
      });

      it('deve rejeitar USER_VERIFIED sem fotos e sem skipEvidenceReason', async () => {
        await expect(
          service.request(userId, 'USER_VERIFIED', undefined, []),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.request(userId, 'USER_VERIFIED', undefined, undefined),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });

      it('deve aceitar USER_VERIFIED com skipEvidenceReason e sem fotos', async () => {
        const created = {
          id: 'v1',
          userId,
          type: 'USER_VERIFIED',
          status: 'PENDING',
          metadata: { skipEvidenceReason: 'Deficiência visual' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prisma.verification.create.mockResolvedValue(created);

        const result = await service.request(
          userId,
          'USER_VERIFIED',
          undefined,
          undefined,
          'Deficiência visual',
        );

        expect(result).toMatchObject({
          id: 'v1',
          type: 'USER_VERIFIED',
          status: 'PENDING',
          skipEvidenceReason: 'Deficiência visual',
        });
        expect(prisma.verification.create).toHaveBeenCalledWith({
          data: {
            userId,
            type: 'USER_VERIFIED',
            status: 'PENDING',
            metadata: { skipEvidenceReason: 'Deficiência visual' },
          },
        });
      });

      it('deve filtrar evidenceUrls vazios e trim skipReason', async () => {
        const created = {
          id: 'v1',
          userId,
          type: 'USER_VERIFIED',
          status: 'PENDING',
          metadata: { evidenceUrls: ['https://a.com/1.jpg'] },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prisma.verification.create.mockResolvedValue(created);

        await service.request(userId, 'USER_VERIFIED', undefined, [
          '  ',
          'https://a.com/1.jpg',
          '',
        ]);
        expect(prisma.verification.create).toHaveBeenCalledWith({
          data: {
            userId,
            type: 'USER_VERIFIED',
            status: 'PENDING',
            metadata: { evidenceUrls: ['https://a.com/1.jpg'] },
          },
        });
      });
    });

    describe('PET_VERIFIED', () => {
      beforeEach(() => {
        prisma.pet.findFirst.mockResolvedValue({ id: petId, ownerId: userId });
      });

      it('deve rejeitar PET_VERIFIED sem petId', async () => {
        await expect(
          service.request(userId, 'PET_VERIFIED', undefined, ['u1', 'u2']),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });

      it('deve rejeitar PET_VERIFIED quando usuário não é dono do pet', async () => {
        prisma.pet.findFirst.mockResolvedValue(null);
        await expect(
          service.request(userId, 'PET_VERIFIED', petId, ['u1', 'u2']),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });

      it('deve aceitar PET_VERIFIED com 2 evidenceUrls', async () => {
        const created = {
          id: 'v1',
          userId,
          type: 'PET_VERIFIED',
          status: 'PENDING',
          metadata: {
            petId,
            evidenceUrls: ['https://cdn.example.com/face.jpg', 'https://cdn.example.com/with-pet.jpg'],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prisma.verification.create.mockResolvedValue(created);

        const result = await service.request(userId, 'PET_VERIFIED', petId, [
          'https://cdn.example.com/face.jpg',
          'https://cdn.example.com/with-pet.jpg',
        ]);

        expect(result).toMatchObject({
          id: 'v1',
          type: 'PET_VERIFIED',
          status: 'PENDING',
          petId,
          evidenceUrls: [
            'https://cdn.example.com/face.jpg',
            'https://cdn.example.com/with-pet.jpg',
          ],
        });
        expect(prisma.verification.create).toHaveBeenCalledWith({
          data: {
            userId,
            type: 'PET_VERIFIED',
            status: 'PENDING',
            metadata: {
              petId,
              evidenceUrls: [
                'https://cdn.example.com/face.jpg',
                'https://cdn.example.com/with-pet.jpg',
              ],
            },
          },
        });
      });

      it('deve rejeitar PET_VERIFIED com menos de 2 fotos e sem skipReason', async () => {
        await expect(
          service.request(userId, 'PET_VERIFIED', petId, ['u1']),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.request(userId, 'PET_VERIFIED', petId, []),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });

      it('deve aceitar PET_VERIFIED com skipEvidenceReason e sem fotos', async () => {
        const created = {
          id: 'v1',
          userId,
          type: 'PET_VERIFIED',
          status: 'PENDING',
          metadata: { petId, skipEvidenceReason: 'Dificuldade para selfie' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        prisma.verification.create.mockResolvedValue(created);

        const result = await service.request(
          userId,
          'PET_VERIFIED',
          petId,
          undefined,
          'Dificuldade para selfie',
        );

        expect(result).toMatchObject({
          id: 'v1',
          type: 'PET_VERIFIED',
          status: 'PENDING',
          petId,
          skipEvidenceReason: 'Dificuldade para selfie',
        });
      });
    });

    describe('solicitação já pendente', () => {
      it('deve rejeitar se já existe USER_VERIFIED PENDING', async () => {
        prisma.verification.findFirst.mockResolvedValue({ id: 'existing' });
        await expect(
          service.request(userId, 'USER_VERIFIED', undefined, ['https://a.com/1.jpg']),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });

      it('deve rejeitar se já existe PET_VERIFIED PENDING para o mesmo pet', async () => {
        prisma.pet.findFirst.mockResolvedValue({ id: petId, ownerId: userId });
        prisma.verification.findFirst.mockResolvedValue({ id: 'existing' });
        await expect(
          service.request(userId, 'PET_VERIFIED', petId, ['u1', 'u2']),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.verification.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('getStatus', () => {
    it('deve expor evidenceUrls e skipEvidenceReason nos itens retornados', async () => {
      prisma.verification.findMany.mockResolvedValue([
        {
          id: 'v1',
          type: 'USER_VERIFIED',
          status: 'PENDING',
          rejectionReason: null,
          metadata: {
            evidenceUrls: ['https://a.com/1.jpg'],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'v2',
          type: 'PET_VERIFIED',
          status: 'PENDING',
          rejectionReason: null,
          metadata: { petId: 'p1', skipEvidenceReason: 'Deficiência visual' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.verification.findFirst.mockResolvedValue(null);

      const status = await service.getStatus(userId);
      expect(status.requests).toHaveLength(2);
      expect(status.requests[0].evidenceUrls).toEqual(['https://a.com/1.jpg']);
      expect(status.requests[0].skipEvidenceReason).toBeUndefined();
      expect(status.requests[1].skipEvidenceReason).toBe('Deficiência visual');
      expect(status.requests[1].petId).toBe('p1');
    });
  });
});
