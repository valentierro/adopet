import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBugReportDto } from './dto/create-bug-report.dto';
import type { BugReportResponseDto } from './dto/bug-report-response.dto';

@Injectable()
export class BugReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBugReportDto, userId?: string): Promise<{ id: string }> {
    const report = await this.prisma.bugReport.create({
      data: {
        userId: userId ?? null,
        message: dto.message,
        stack: dto.stack ?? null,
        screen: dto.screen ?? null,
        userComment: dto.userComment ?? null,
      },
    });
    return { id: report.id };
  }

  async findAllForAdmin(): Promise<BugReportResponseDto[]> {
    const list = await this.prisma.bugReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return list.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user?.name ?? null,
      userEmail: r.user?.email ?? null,
      message: r.message,
      stack: r.stack,
      screen: r.screen,
      userComment: r.userComment,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
