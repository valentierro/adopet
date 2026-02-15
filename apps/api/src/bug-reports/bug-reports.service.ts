import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  getBugReportEmailText,
  getBugReportEmailHtml,
  type BugReportEmailData,
} from '../email/templates/bug-report.email';
import {
  getSuggestionEmailText,
  getSuggestionEmailHtml,
  type SuggestionEmailData,
} from '../email/templates/suggestion.email';
import type { CreateBugReportDto } from './dto/create-bug-report.dto';
import type { BugReportResponseDto } from './dto/bug-report-response.dto';

const BUG_REPORT_EMAIL_TO = 'contato@appadopet.com.br';

@Injectable()
export class BugReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateBugReportDto, userId?: string): Promise<{ id: string }> {
    const type = dto.type ?? 'BUG';
    const report = await this.prisma.bugReport.create({
      data: {
        userId: userId ?? null,
        type,
        message: dto.message,
        stack: dto.stack ?? null,
        screen: dto.screen ?? null,
        userComment: dto.userComment ?? null,
      },
    });

    let userName: string | null = null;
    let userEmail: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (user) {
        userName = user.name;
        userEmail = user.email;
      }
    }

    const now = new Date();
    const logoUrl = this.config.get<string>('LOGO_URL') ?? undefined;

    if (type === 'SUGGESTION') {
      const emailData: SuggestionEmailData = {
        reportId: report.id,
        message: dto.message,
        userComment: dto.userComment ?? null,
        userName,
        userEmail,
        reportedAt: report.createdAt.toISOString(),
        serverTime: now.toISOString(),
      };
      const text = getSuggestionEmailText(emailData);
      const html = getSuggestionEmailHtml(emailData, logoUrl);
      if (this.emailService.isConfigured()) {
        await this.emailService
          .sendMail({
            to: BUG_REPORT_EMAIL_TO,
            subject: `[Adopet] Sugestão #${report.id.slice(0, 8)} – ${dto.message.slice(0, 50)}${dto.message.length > 50 ? '…' : ''}`,
            text,
            html,
            attachments: [
              { filename: `suggestion-${report.id.slice(0, 8)}.txt`, content: text },
            ],
          })
          .catch((err) => {
            console.warn('[BugReportsService] Falha ao enviar e-mail de sugestão:', err);
          });
      }
    } else {
      const emailData: BugReportEmailData = {
        reportId: report.id,
        message: dto.message,
        stack: dto.stack ?? null,
        screen: dto.screen ?? null,
        userComment: dto.userComment ?? null,
        userName,
        userEmail,
        reportedAt: report.createdAt.toISOString(),
        serverTime: now.toISOString(),
        serverEnv: this.config.get<string>('NODE_ENV'),
      };
      const text = getBugReportEmailText(emailData);
      const html = getBugReportEmailHtml(emailData, logoUrl);
      if (this.emailService.isConfigured()) {
        await this.emailService
          .sendMail({
            to: BUG_REPORT_EMAIL_TO,
            subject: `[Adopet] Reporte de bug #${report.id.slice(0, 8)} – ${dto.message.slice(0, 50)}${dto.message.length > 50 ? '…' : ''}`,
            text,
            html,
            attachments: [
              { filename: `bug-report-${report.id.slice(0, 8)}.txt`, content: text },
            ],
          })
          .catch((err) => {
            console.warn('[BugReportsService] Falha ao enviar e-mail de bug report:', err);
          });
      }
    }

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
      type: r.type,
      message: r.message,
      stack: r.stack,
      screen: r.screen,
      userComment: r.userComment,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
