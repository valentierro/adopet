import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReportDto } from './dto/create-report.dto';
import type { ReportResponseDto } from './dto/report-response.dto';

const REPORTED_PET_IDS_CACHE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private reportedPetIdsCache: { ids: string[]; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private invalidateReportedPetIdsCache(): void {
    this.reportedPetIdsCache = null;
  }

  async create(reporterId: string, dto: CreateReportDto): Promise<ReportResponseDto> {
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description ?? undefined,
      },
    });
    this.invalidateReportedPetIdsCache();
    this.logger.log({
      event: 'report_created',
      reportId: report.id,
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });
    return this.toDto(report);
  }

  async findAll(): Promise<ReportResponseDto[]> {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => this.toDto(r));
  }

  /** [Admin] Marcar denúncia como resolvida (com feedback opcional para o denunciador). */
  async resolve(reportId: string, adminId: string, resolutionFeedback?: string): Promise<ReportResponseDto> {
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        resolvedAt: new Date(),
        resolvedById: adminId,
        ...(resolutionFeedback != null && resolutionFeedback.trim() !== '' && { resolutionFeedback: resolutionFeedback.trim() }),
      },
    });
    this.invalidateReportedPetIdsCache();
    return this.toDto(report);
  }

  /** Retorna IDs de pets que têm pelo menos uma denúncia não resolvida (para filtrar do feed). Cache 2 min. */
  async getReportedPetIds(): Promise<string[]> {
    const now = Date.now();
    if (this.reportedPetIdsCache && this.reportedPetIdsCache.expiresAt > now) {
      return this.reportedPetIdsCache.ids;
    }
    const rows = await this.prisma.report.findMany({
      where: { targetType: 'PET', resolvedAt: null },
      select: { targetId: true },
      distinct: ['targetId'],
    });
    const ids = rows.map((r) => r.targetId);
    this.reportedPetIdsCache = { ids, expiresAt: now + REPORTED_PET_IDS_CACHE_TTL_MS };
    return ids;
  }

  private toDto(r: {
    id: string;
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
    description: string | null;
    createdAt: Date;
    resolvedAt?: Date | null;
    resolvedById?: string | null;
    resolutionFeedback?: string | null;
  }): ReportResponseDto {
    return {
      id: r.id,
      reporterId: r.reporterId,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      description: r.description ?? undefined,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString(),
      resolvedById: r.resolvedById ?? undefined,
      resolutionFeedback: r.resolutionFeedback ?? undefined,
    };
  }
}
