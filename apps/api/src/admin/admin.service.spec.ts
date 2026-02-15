import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    adoption: { findMany: jest.Mock };
    pet: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      adoption: { findMany: jest.fn() },
      pet: { findUnique: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: { send: jest.fn() } },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdoptions', () => {
    it('retorna confirmedByAdopet true quando pet tem adopetConfirmedAt', async () => {
      const now = new Date();
      prisma.adoption.findMany.mockResolvedValue([
        {
          id: 'adopt-1',
          petId: 'pet-1',
          adoptedAt: now,
          pet: { name: 'Rex', adopetConfirmedAt: now },
          tutor: { id: 't1', name: 'Maria' },
          adopter: { id: 'a1', name: 'João' },
        },
      ]);
      const res = await service.getAdoptions();
      expect(res).toHaveLength(1);
      expect(res[0].confirmedByAdopet).toBe(true);
      expect(res[0].petName).toBe('Rex');
    });

    it('retorna confirmedByAdopet false quando pet nao tem adopetConfirmedAt', async () => {
      const now = new Date();
      prisma.adoption.findMany.mockResolvedValue([
        {
          id: 'adopt-2',
          petId: 'pet-2',
          adoptedAt: now,
          pet: { name: 'Luna', adopetConfirmedAt: null },
          tutor: { id: 't2', name: 'Ana' },
          adopter: { id: 'a2', name: 'Pedro' },
        },
      ]);
      const res = await service.getAdoptions();
      expect(res).toHaveLength(1);
      expect(res[0].confirmedByAdopet).toBe(false);
    });
  });

  describe('confirmAdoptionByAdopet', () => {
    it('lanca quando pet nao existe', async () => {
      prisma.pet.findUnique.mockResolvedValue(null);
      await expect(service.confirmAdoptionByAdopet('pet-invalid')).rejects.toThrow(BadRequestException);
      await expect(service.confirmAdoptionByAdopet('pet-invalid')).rejects.toThrow('Pet não encontrado');
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('lanca quando pet nao tem registro de adocao', async () => {
      prisma.pet.findUnique.mockResolvedValue({
        id: 'pet-1',
        adopetConfirmedAt: null,
        adoption: null,
      });
      await expect(service.confirmAdoptionByAdopet('pet-1')).rejects.toThrow('Este pet não possui adoção registrada');
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('e idempotente: nao atualiza quando ja confirmada', async () => {
      const alreadyConfirmed = new Date('2025-01-01');
      prisma.pet.findUnique.mockResolvedValue({
        id: 'pet-1',
        adopetConfirmedAt: alreadyConfirmed,
        adoption: { id: 'adopt-1' },
      });
      await service.confirmAdoptionByAdopet('pet-1');
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('atualiza adopetConfirmedAt quando ainda nao confirmada', async () => {
      prisma.pet.findUnique.mockResolvedValue({
        id: 'pet-1',
        adopetConfirmedAt: null,
        adoption: { id: 'adopt-1' },
      });
      prisma.pet.update.mockResolvedValue({});
      await service.confirmAdoptionByAdopet('pet-1');
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 'pet-1' },
        data: { adopetConfirmedAt: expect.any(Date) },
      });
    });
  });
});
