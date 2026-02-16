import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  getPartnershipRequestEmailText,
  getPartnershipRequestEmailHtml,
  type PartnershipRequestEmailData,
} from '../email/templates/partnership-request.email';
import type { PublicStatsDto } from './dto/public-stats.dto';
import type { PartnershipRequestDto } from './dto/partnership-request.dto';

const PARTNERSHIP_EMAIL_TO = 'parcerias@appadopet.com.br';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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
  }
}
