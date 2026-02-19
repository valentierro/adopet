import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    report: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
    pet: { findUnique: jest.Mock };
    message: { findUnique: jest.Mock };
  };
  let configGet: jest.Mock;

  const reporterId = 'user-1';
  const adminId = 'admin-1';

  beforeEach(async () => {
    configGet = jest.fn().mockReturnValue('');
    prisma = {
      report: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn(), update: jest.fn() },
      pet: { findUnique: jest.fn() },
      message: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create report and return dto', async () => {
      const dto = {
        targetType: 'PET' as const,
        targetId: 'pet-1',
        reason: 'SPAM',
        description: 'Optional',
      };
      prisma.report.create.mockResolvedValue({
        id: 'report-1',
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
        createdAt: new Date(),
      });
      const result = await service.create(reporterId, dto);
      expect(result.id).toBe('report-1');
      expect(result.targetType).toBe('PET');
      expect(result.reason).toBe('SPAM');
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
          description: dto.description,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      prisma.report.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
      expect(prisma.report.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getReportedPetIds', () => {
    it('should return distinct pet ids that were reported', async () => {
      prisma.report.findMany.mockResolvedValue([
        { targetId: 'pet-1' },
        { targetId: 'pet-2' },
      ]);
      const result = await service.getReportedPetIds();
      expect(result).toEqual(['pet-1', 'pet-2']);
    });
  });

  describe('resolve', () => {
    const reportId = 'report-1';

    it('throws NotFoundException when report does not exist', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expect(service.resolve(reportId, adminId)).rejects.toThrow(NotFoundException);
      expect(prisma.report.update).not.toHaveBeenCalled();
    });

    it('marks report as resolved without ban when banReportedUser is false', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'USER',
        targetId: 'target-user-1',
      });
      prisma.report.update.mockResolvedValue({
        id: reportId,
        reporterId,
        targetType: 'USER',
        targetId: 'target-user-1',
        reason: 'SPAM',
        description: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionFeedback: null,
        resolutionAction: null,
      });
      const result = await service.resolve(reportId, adminId, undefined, false);
      expect(result.resolvedAt).toBeDefined();
      expect(result.resolvedById).toBe(adminId);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: reportId },
        data: expect.objectContaining({
          resolvedAt: expect.any(Date),
          resolvedById: adminId,
        }),
      });
    });

    it('when banReportedUser=true and targetType=USER, bans user and sets resolutionAction', async () => {
      const targetUserId = 'bad-user-1';
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'USER',
        targetId: targetUserId,
      });
      prisma.user.findUnique.mockResolvedValue({ id: targetUserId });
      configGet.mockImplementation((key: string) => (key === 'ADMIN_USER_IDS' ? 'admin-1,admin-2' : ''));
      prisma.user.update.mockResolvedValue({ id: targetUserId, deactivatedAt: new Date() });
      prisma.report.update.mockResolvedValue({
        id: reportId,
        reporterId,
        targetType: 'USER',
        targetId: targetUserId,
        reason: 'SPAM',
        description: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionFeedback: null,
        resolutionAction: 'BAN_USER',
      });
      const result = await service.resolve(reportId, adminId, undefined, true);
      expect(result.resolutionAction).toBe('BAN_USER');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: targetUserId },
        data: { deactivatedAt: expect.any(Date) },
      });
    });

    it('when banReportedUser=true and targetType=PET, bans pet owner', async () => {
      const petId = 'pet-1';
      const ownerId = 'owner-1';
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'PET',
        targetId: petId,
      });
      prisma.pet.findUnique.mockResolvedValue({ ownerId });
      configGet.mockReturnValue('');
      prisma.user.update.mockResolvedValue({});
      prisma.report.update.mockResolvedValue({
        id: reportId,
        reporterId,
        targetType: 'PET',
        targetId: petId,
        reason: 'SPAM',
        description: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionFeedback: null,
        resolutionAction: 'BAN_USER',
      });
      await service.resolve(reportId, adminId, undefined, true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ownerId },
        data: { deactivatedAt: expect.any(Date) },
      });
    });

    it('when banReportedUser=true and targetType=MESSAGE, bans message sender', async () => {
      const messageId = 'msg-1';
      const senderId = 'sender-1';
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'MESSAGE',
        targetId: messageId,
      });
      prisma.message.findUnique.mockResolvedValue({ senderId });
      configGet.mockReturnValue('');
      prisma.user.update.mockResolvedValue({});
      prisma.report.update.mockResolvedValue({
        id: reportId,
        reporterId,
        targetType: 'MESSAGE',
        targetId: messageId,
        reason: 'SPAM',
        description: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionFeedback: null,
        resolutionAction: 'BAN_USER',
      });
      await service.resolve(reportId, adminId, undefined, true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: senderId },
        data: { deactivatedAt: expect.any(Date) },
      });
    });

    it('throws BadRequestException when banReportedUser=true and target user is admin', async () => {
      const targetUserId = 'admin-1';
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'USER',
        targetId: targetUserId,
      });
      prisma.user.findUnique.mockResolvedValue({ id: targetUserId });
      configGet.mockImplementation((key: string) => (key === 'ADMIN_USER_IDS' ? 'admin-1,admin-2' : ''));
      await expect(service.resolve(reportId, adminId, undefined, true)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('when banReportedUser=true and MESSAGE has no sender (system message), resolves without banning', async () => {
      const messageId = 'msg-system-1';
      prisma.report.findUnique.mockResolvedValue({
        id: reportId,
        targetType: 'MESSAGE',
        targetId: messageId,
      });
      prisma.message.findUnique.mockResolvedValue({ senderId: null });
      prisma.report.update.mockResolvedValue({
        id: reportId,
        reporterId,
        targetType: 'MESSAGE',
        targetId: messageId,
        reason: 'SPAM',
        description: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
        resolvedById: adminId,
        resolutionFeedback: null,
        resolutionAction: null,
      });
      const result = await service.resolve(reportId, adminId, undefined, true);
      expect(result.resolvedAt).toBeDefined();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: reportId },
        data: expect.not.objectContaining({ resolutionAction: 'BAN_USER' }),
      });
    });
  });
});
