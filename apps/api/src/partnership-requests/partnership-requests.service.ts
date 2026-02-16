import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { getSetPasswordEmailHtml, getSetPasswordEmailText } from '../email/templates/set-password.email';

export type PartnershipRequestAdminDto = {
  id: string;
  tipo: string;
  nome: string;
  email: string;
  instituicao: string;
  telefone: string;
  mensagem?: string | null;
  cnpj?: string | null;
  anoFundacao?: string | null;
  cep?: string | null;
  endereco?: string | null;
  personType?: string | null;
  documentoComercial?: string | null;
  planoDesejado?: string | null;
  status: string;
  rejectionReason?: string | null;
  processedAt?: string | null;
  partnerId?: string | null;
  createdAt: string;
};

@Injectable()
export class PartnershipRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly partnersService: PartnersService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async findAllForAdmin(): Promise<PartnershipRequestAdminDto[]> {
    const list = await this.prisma.partnershipRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return list.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      nome: r.nome,
      email: r.email,
      instituicao: r.instituicao,
      telefone: r.telefone,
      mensagem: r.mensagem,
      cnpj: r.cnpj,
      anoFundacao: r.anoFundacao,
      cep: r.cep,
      endereco: r.endereco,
      personType: r.personType,
      documentoComercial: r.documentoComercial,
      planoDesejado: r.planoDesejado,
      status: r.status,
      rejectionReason: r.rejectionReason,
      processedAt: r.processedAt?.toISOString() ?? null,
      partnerId: r.partnerId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Aprova a solicitação criando um parceiro (ONG ou STORE) e vinculando. Para ONG, cria também usuário admin e envia e-mail para definir senha. */
  async approve(id: string): Promise<{ partnerId: string }> {
    const req = await this.prisma.partnershipRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Solicitação já foi ${req.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.`);
    }
    const type = req.tipo === 'ong' ? 'ONG' : 'STORE';
    let userId: string | undefined;
    let setPasswordToken: string | undefined;

    if (type === 'ONG') {
      const created = await this.authService.createUserForOngAdmin(req.email, req.nome, req.telefone);
      userId = created.userId;
      setPasswordToken = created.setPasswordToken;
    }

    const createDto = {
      type,
      name: req.instituicao,
      email: req.email,
      phone: req.telefone,
      approve: true,
      active: true,
      isPaidPartner: false,
      ...(userId && { userId }),
      ...(req.endereco && { description: `Solicitação aprovada. Contato: ${req.nome}. ${req.endereco}` }),
    };
    const partner = await this.partnersService.create(createDto);
    await this.prisma.partnershipRequest.update({
      where: { id },
      data: { status: 'APPROVED', processedAt: new Date(), partnerId: partner.id },
    });

    if (type === 'ONG' && setPasswordToken && this.emailService.isConfigured()) {
      const apiUrl = this.config.get<string>('API_PUBLIC_URL')?.replace(/\/$/, '') ?? '';
      const setPasswordLink = apiUrl ? `${apiUrl}/v1/auth/set-password?token=${encodeURIComponent(setPasswordToken)}` : '';
      const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '') ?? 'https://appadopet.com.br';
      const logoUrl = (this.config.get<string>('LOGO_URL') || appUrl + '/logo.png').trim();
      const emailData = {
        setPasswordLink,
        title: 'Sua parceria foi aprovada',
        bodyHtml: `<p>Sua solicitação de parceria da <strong>${req.instituicao}</strong> foi aprovada. Você é o administrador da ONG no Adopet e pode acessar o portal do parceiro para cadastrar cupons, serviços e membros da equipe.</p>`,
        bodyText: `Sua solicitação de parceria da ${req.instituicao} foi aprovada. Você é o administrador da ONG no Adopet. Defina sua senha no link abaixo para acessar o app e o portal do parceiro.`,
      };
      await this.emailService.sendMail({
        to: req.email,
        subject: 'Parceria aprovada - Defina sua senha - Adopet',
        text: getSetPasswordEmailText(emailData),
        html: getSetPasswordEmailHtml(emailData, logoUrl),
      }).catch(() => { /* não falhar aprovação se e-mail falhar */ });
    }

    return { partnerId: partner.id };
  }

  /** Rejeita a solicitação com motivo opcional. */
  async reject(id: string, rejectionReason?: string): Promise<void> {
    const req = await this.prisma.partnershipRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Solicitação já foi ${req.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.`);
    }
    await this.prisma.partnershipRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        processedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });
  }
}
