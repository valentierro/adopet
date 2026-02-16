import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from '../partners/partners.service';

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

  /** Aprova a solicitação criando um parceiro (ONG ou STORE) e vinculando. */
  async approve(id: string): Promise<{ partnerId: string }> {
    const req = await this.prisma.partnershipRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Solicitação já foi ${req.status === 'APPROVED' ? 'aprovada' : 'rejeitada'}.`);
    }
    const type = req.tipo === 'ong' ? 'ONG' : 'STORE';
    const createDto = {
      type,
      name: req.instituicao,
      email: req.email,
      phone: req.telefone,
      approve: true,
      active: true,
      isPaidPartner: false,
      ...(req.endereco && { description: `Solicitação aprovada. Contato: ${req.nome}. ${req.endereco}` }),
    };
    const partner = await this.partnersService.create(createDto);
    await this.prisma.partnershipRequest.update({
      where: { id },
      data: { status: 'APPROVED', processedAt: new Date(), partnerId: partner.id },
    });
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
