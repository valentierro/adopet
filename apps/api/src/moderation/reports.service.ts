import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReportDto } from './dto/create-report.dto';
import type { ReportResponseDto } from './dto/report-response.dto';

const REPORTED_PET_IDS_CACHE_TTL_MS = 2 * 60 * 1000;
const RESOLUTION_ACTION_BAN_USER = 'BAN_USER';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private reportedPetIdsCache: { ids: string[]; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  /** [Admin] Marcar denúncia como resolvida (feedback opcional). Se banReportedUser=true, desativa a conta do usuário alvo (USER=targetId, PET=dono do pet, MESSAGE=autor da mensagem). Admins não podem ser banidos. */
  async resolve(
    reportId: string,
    adminId: string,
    resolutionFeedback?: string,
    banReportedUser?: boolean,
  ): Promise<ReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, targetType: true, targetId: true },
    });
    if (!report) throw new NotFoundException('Denúncia não encontrada');

    let resolutionAction: string | null = null;
    if (banReportedUser) {
      const userIdToBan = await this.getUserIdToBanFromReport(report.targetType, report.targetId);
      if (userIdToBan) {
        const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
        if (adminIds.includes(userIdToBan)) {
          throw new BadRequestException('Não é permitido banir um administrador.');
        }
        await this.prisma.user.update({
          where: { id: userIdToBan },
          data: { deactivatedAt: new Date() },
        });
        resolutionAction = RESOLUTION_ACTION_BAN_USER;
        this.logger.log({
          event: 'user_banned_via_report',
          reportId,
          adminId,
          bannedUserId: userIdToBan,
          targetType: report.targetType,
          targetId: report.targetId,
        });
      }
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        resolvedAt: new Date(),
        resolvedById: adminId,
        ...(resolutionFeedback != null && resolutionFeedback.trim() !== '' && { resolutionFeedback: resolutionFeedback.trim() }),
        ...(resolutionAction && { resolutionAction }),
      },
    });
    this.invalidateReportedPetIdsCache();
    return this.toDto(updated);
  }

  /** Retorna o userId a ser banido a partir do tipo e id do alvo da denúncia. USER=targetId, PET=ownerId do pet, MESSAGE=senderId da mensagem. Retorna null se não houver usuário a banir (ex.: mensagem de sistema). */
  private async getUserIdToBanFromReport(targetType: string, targetId: string): Promise<string | null> {
    if (targetType === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      return user?.id ?? null;
    }
    if (targetType === 'PET') {
      const pet = await this.prisma.pet.findUnique({
        where: { id: targetId },
        select: { ownerId: true },
      });
      return pet?.ownerId ?? null;
    }
    if (targetType === 'MESSAGE') {
      const message = await this.prisma.message.findUnique({
        where: { id: targetId },
        select: { senderId: true },
      });
      return message?.senderId ?? null;
    }
    return null;
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
    resolutionAction?: string | null;
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
      resolutionAction: r.resolutionAction ?? undefined,
    };
  }
}
