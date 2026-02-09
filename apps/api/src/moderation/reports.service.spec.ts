import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: { report: { create: jest.Mock; findMany: jest.Mock } };

  const reporterId = 'user-1';

  beforeEach(async () => {
    prisma = {
      report: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
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
});
