import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { InAppNotificationsService, IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import {
  getPartnershipRequestEmailText,
  getPartnershipRequestEmailHtml,
  type PartnershipRequestEmailData,
} from '../email/templates/partnership-request.email';
import type { PublicStatsDto } from './dto/public-stats.dto';
import type { PartnershipRequestDto } from './dto/partnership-request.dto';
import type { RecentAdoptionItemDto } from './dto/recent-adoptions.dto';

const PARTNERSHIP_EMAIL_TO = 'parcerias@appadopet.com.br';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  async getStats(): Promise<PublicStatsDto> {
    const [totalAdoptions, totalUsers, totalPets] = await Promise.all([
      this.prisma.adoption.count(),
      this.prisma.user.count(),
      this.prisma.pet.count({
        where: { publicationStatus: 'APPROVED' },
      }),
    ]);
    return { totalAdoptions, totalUsers, totalPets };
  }

  /** Últimas adoções realizadas no app (para tela de prova social). Sem dados de tutor/adotante. */
  async getRecentAdoptions(limit = 30): Promise<RecentAdoptionItemDto[]> {
    const take = Math.min(Math.max(1, limit), 100);
    const adoptions = await this.prisma.adoption.findMany({
      take,
      orderBy: { adoptedAt: 'desc' },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            city: true,
            media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
          },
        },
      },
    });
    return adoptions.map((a) => ({
      petId: a.pet.id,
      petName: a.pet.name,
      species: a.pet.species,
      adoptedAt: a.adoptedAt.toISOString(),
      city: a.pet.city ?? undefined,
      photoUrl: a.pet.media[0]?.url ?? undefined,
    }));
  }

  /** Persiste a solicitação e envia e-mail para parcerias@appadopet.com.br */
  async sendPartnershipRequest(dto: PartnershipRequestDto): Promise<void> {
    const now = new Date().toISOString();
    await this.prisma.partnershipRequest.create({
      data: {
        tipo: dto.tipo,
        nome: dto.nome.trim(),
        email: dto.email.trim().toLowerCase(),
        instituicao: dto.instituicao.trim(),
        telefone: dto.telefone.trim(),
        mensagem: dto.mensagem?.trim() || null,
        cnpj: dto.cnpj?.trim() || null,
        anoFundacao: dto.anoFundacao?.trim() || null,
        cep: dto.cep?.trim() || null,
        endereco: dto.endereco?.trim() || null,
        personType: dto.personType || null,
        documentoComercial: dto.documentoComercial?.trim() || null,
        planoDesejado: dto.planoDesejado?.trim() || null,
        status: 'PENDING',
      },
    });
    const emailData: PartnershipRequestEmailData = {
      tipo: dto.tipo,
      nome: dto.nome.trim(),
      email: dto.email.trim().toLowerCase(),
      instituicao: dto.instituicao.trim(),
      telefone: dto.telefone.trim(),
      mensagem: dto.mensagem?.trim() ?? null,
      cnpj: dto.cnpj?.trim() ?? null,
      anoFundacao: dto.anoFundacao?.trim() ?? null,
      cep: dto.cep?.trim() ?? null,
      endereco: dto.endereco?.trim() ?? null,
      personType: dto.personType ?? null,
      documentoComercial: dto.documentoComercial?.trim() ?? null,
      planoDesejado: dto.planoDesejado?.trim() ?? null,
      sentAt: now,
    };
    const text = getPartnershipRequestEmailText(emailData);
    const logoUrl = this.config.get<string>('LOGO_URL') ?? undefined;
    const html = getPartnershipRequestEmailHtml(emailData, logoUrl);
    const tipoLabel = dto.tipo === 'ong' ? 'ONG' : 'comercial';
    const subject = `Solicitação de parceria ${tipoLabel} - ${dto.instituicao.trim()}`;
    if (this.emailService.isConfigured()) {
      await this.emailService.sendMail({
        to: PARTNERSHIP_EMAIL_TO,
        subject,
        text,
        html,
        attachments: [{ filename: `partnership-request-${Date.now()}.txt`, content: text }],
      });
    }

    if (dto.tipo === 'ong') {
      const adminIds = this.config.get<string>('ADMIN_USER_IDS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const title = 'Nova solicitação de parceria ONG';
      const body = `${dto.instituicao.trim()} solicitou parceria. Toque para aprovar ou rejeitar.`;
      const pushData = { screen: 'adminPartners' };
      for (const adminId of adminIds) {
        this.inAppNotifications
          .create(adminId, IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_REQUEST_ONG, title, body, undefined, pushData)
          .catch(() => {});
      }
    }
  }
}
