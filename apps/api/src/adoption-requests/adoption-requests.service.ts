import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as PDFDocumentModule from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { isAtLeast18 } from '../common/age';
import { PetPartnershipService } from '../pet-partnership/pet-partnership.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { SendFormDto } from './dto/send-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { AdoptionFormsService } from '../adoption-forms/adoption-forms.service';
import { MatchScoreService } from '../adoption-forms/match-score.service';
import { PetsService } from '../pets/pets.service';

const FORM_EXPIRY_DAYS = 14;

const ADOPTION_REQUEST_STATUS = {
  INTERESTED: 'INTERESTED',
  FORM_SENT: 'FORM_SENT',
  FORM_SUBMITTED: 'FORM_SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ADOPTION_PROPOSED: 'ADOPTION_PROPOSED',
  ADOPTION_CONFIRMED: 'ADOPTION_CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

/** Fallback para exibir valores em português no PDF quando a pergunta não tem options. */
const ANSWER_DISPLAY_FALLBACK: Record<string, string> = {
  true: 'Sim',
  false: 'Não',
  DAILY: 'Diariamente',
  FEW_TIMES_WEEK: 'Algumas vezes por semana',
  RARELY: 'Raramente',
  INDIFERENTE: 'Indiferente / Depende do pet',
  LOW: 'Calmo',
  MEDIUM: 'Moderado',
  HIGH: 'Ativo',
  DOG: 'Cachorro',
  CAT: 'Gato',
  BOTH: 'Tanto faz / Indiferente',
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
  xlarge: 'Extra grande / Muito grande',
  male: 'Macho',
  female: 'Fêmea',
  puppy: 'Filhote (até 1 ano)',
  young: 'Jovem (1 a 3 anos)',
  adult: 'Adulto (3 a 7 anos)',
  senior: 'Idoso (7+ anos)',
  any: 'Indiferente',
  YES: 'Sim',
  NO: 'Não',
  UNKNOWN: 'Não sei',
  nao_tem: 'Não tenho outros pets',
  site: 'Site',
  redes: 'Redes sociais',
  indicacao: 'Indicação',
  evento: 'Evento',
  outro: 'Outro',
  casa: 'Casa',
  apartamento: 'Apartamento',
  propria: 'Própria',
  alugada: 'Alugada',
  parentes: 'Com parentes/amigos',
  sim_total: 'Sim, totalmente telado',
  providenciar: 'Ainda não, mas providenciarei em até 7 dias',
  nao: 'Não',
  nao_se_aplica: 'Não se aplica',
  dry: 'Ração seca',
  wet: 'Ração úmida',
  mixed: 'Mista',
  natural: 'Natural',
  other: 'Outra',
  nao_sei: 'Ainda não sei',
  filhote: 'Filhote (0–1 ano)',
  idoso: 'Idoso (7+ anos)',
  indiferente: 'Indiferente',
};

type SnapshotQuestionPdf = {
  id: string;
  label: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
};

function formatAnswerForPdf(question: SnapshotQuestionPdf, value: unknown): string {
  if (value == null || value === '') return '—';
  const str = (v: unknown) =>
    v === true || v === 'true' ? 'Sim' : v === false || v === 'false' ? 'Não' : String(v);
  if (question.type === 'CHECKBOX') return str(value);
  if (question.type === 'SELECT_SINGLE') {
    const key = String(value).trim();
    const label = question.options?.find((o) => o.value === key)?.label;
    if (label) return label;
    return ANSWER_DISPLAY_FALLBACK[key] ?? key;
  }
  if (question.type === 'SELECT_MULTIPLE' && Array.isArray(value)) {
    const labels = (value as string[]).map((v) => {
      const label = question.options?.find((o) => o.value === String(v))?.label;
      return label ?? ANSWER_DISPLAY_FALLBACK[String(v)] ?? String(v);
    });
    return labels.filter(Boolean).length > 0 ? labels.join(', ') : '—';
  }
  if (Array.isArray(value)) {
    return (value as string[])
      .map((v) => ANSWER_DISPLAY_FALLBACK[String(v)] ?? String(v))
      .join(', ');
  }
  const key = String(value).trim();
  return ANSWER_DISPLAY_FALLBACK[key] ?? key;
}

export type AdoptionRequestWithDetails = {
  id: string;
  petId: string;
  adopterId: string;
  conversationId: string;
  templateId: string | null;
  status: string;
  formSentAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  rejectionFeedback: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pet?: { id: string; name: string };
  adopter?: { id: string; name: string };
  submission?: {
    id: string;
    templateSnapshot: unknown;
    answers: unknown;
    consentAt: string;
    submittedAt: string;
    matchScore?: number | null;
    matchScoreBreakdown?: unknown;
    matchScoreCalculatedAt?: string | null;
  };
};

@Injectable()
export class AdoptionRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly petPartnershipService: PetPartnershipService,
    private readonly inAppNotifications: InAppNotificationsService,
    private readonly petsService: PetsService,
    private readonly adoptionFormsService: AdoptionFormsService,
    private readonly matchScoreService: MatchScoreService,
  ) {}

  private async ensurePartner(userId: string): Promise<string> {
    const partnerId = await this.petPartnershipService.getPartnerIdForUser(userId);
    if (!partnerId) throw new ForbiddenException('Acesso restrito a parceiros.');
    return partnerId;
  }

  private async ensurePartnerAccessToPet(partnerId: string, petId: string): Promise<void> {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { partnerId: true },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');
    if (pet.partnerId !== partnerId) {
      throw new ForbiddenException('Pet não pertence ao seu estabelecimento.');
    }
  }

  async sendForm(userId: string, dto: SendFormDto): Promise<AdoptionRequestWithDetails> {
    const partnerId = await this.ensurePartner(userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        pet: { select: { id: true, name: true, partnerId: true, ownerId: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    if (!conversation.adopterId) throw new BadRequestException('Conversa sem adotante definido.');

    await this.ensurePartnerAccessToPet(partnerId, conversation.petId);

    let templateId = dto.templateId;
    if (!templateId) {
      const templates = await this.adoptionFormsService.listTemplates(userId);
      const first = templates[0];
      if (!first) throw new BadRequestException('Crie um template de formulário antes de enviar.');
      templateId = first.id;
    }

    const template = await this.prisma.adoptionFormTemplate.findFirst({
      where: { id: templateId, partnerId, active: true },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template não encontrado');

    const templateSnapshot = {
      id: template.id,
      name: template.name,
      version: template.version,
      questions: template.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        required: q.required,
        placeholder: q.placeholder,
        options: q.options,
        sortOrder: q.sortOrder,
        useForScoring: (q as { useForScoring?: boolean }).useForScoring ?? false,
        weight: (q as { weight?: number | null }).weight ?? undefined,
        scoringConfig: (q as { scoringConfig?: unknown }).scoringConfig ?? undefined,
      })),
    };

    const existing = await this.prisma.adoptionRequest.findUnique({
      where: { petId_adopterId: { petId: conversation.petId, adopterId: conversation.adopterId } },
    });

    let request: Awaited<ReturnType<PrismaService['adoptionRequest']['create']>>;
    if (existing) {
      if (['FORM_SUBMITTED', 'ADOPTION_PROPOSED', 'ADOPTION_CONFIRMED', 'APPROVED', 'REJECTED'].includes(existing.status)) {
        throw new BadRequestException('Esta solicitação já foi processada.');
      }
      const formExpiresAt = new Date(Date.now() + FORM_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      request = await this.prisma.adoptionRequest.update({
        where: { id: existing.id },
        data: {
          templateId,
          status: ADOPTION_REQUEST_STATUS.FORM_SENT,
          formSentAt: new Date(),
          formSentById: userId,
          expiresAt: formExpiresAt,
        },
        include: {
          pet: { select: { id: true, name: true } },
          adopter: { select: { id: true, name: true } },
          submission: true,
        },
      });
    } else {
      const formExpiresAt = new Date(Date.now() + FORM_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      request = await this.prisma.adoptionRequest.create({
        data: {
          petId: conversation.petId,
          adopterId: conversation.adopterId,
          conversationId: dto.conversationId,
          templateId,
          status: ADOPTION_REQUEST_STATUS.FORM_SENT,
          formSentAt: new Date(),
          formSentById: userId,
          expiresAt: formExpiresAt,
        },
        include: {
          pet: { select: { id: true, name: true } },
          adopter: { select: { id: true, name: true } },
          submission: true,
        },
      });
    }

    await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        isSystem: true,
        messageType: 'FORM_SENT',
        content: 'Formulário de adoção enviado.',
        metadata: { adoptionRequestId: request.id } as object,
      },
    });
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    await this.inAppNotifications.create(
      conversation.adopterId,
      IN_APP_NOTIFICATION_TYPES.ADOPTION_FORM_SENT,
      'Formulário de adoção',
      `Você recebeu um formulário de adoção para ${conversation.pet?.name ?? 'o pet'}.`,
      { adoptionRequestId: request.id, conversationId: dto.conversationId },
      { adoptionRequestId: request.id, conversationId: dto.conversationId },
    );

    return this.toDto(request);
  }

  async submitForm(userId: string, requestId: string, dto: SubmitFormDto): Promise<AdoptionRequestWithDetails> {
    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        template: { include: { questions: true } },
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true, birthDate: true } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.adopterId !== userId) throw new ForbiddenException('Você não é o adotante desta solicitação.');
    const adopterBirthDate = (request.adopter as { birthDate?: Date | null }).birthDate ?? null;
    if (adopterBirthDate == null) {
      throw new BadRequestException(
        'Para adotar, informe sua data de nascimento em Perfil > Editar perfil.',
      );
    }
    if (!isAtLeast18(adopterBirthDate)) {
      throw new ForbiddenException(
        'Para adotar um pet é necessário ter 18 anos ou mais, de acordo com boas práticas de adoção.',
      );
    }
    if (request.status !== ADOPTION_REQUEST_STATUS.FORM_SENT) {
      throw new BadRequestException('Formulário já foi enviado ou solicitação não está aguardando preenchimento.');
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new BadRequestException('O prazo para preencher este formulário expirou.');
    }

    const consentAt = new Date(dto.consentAt);
    if (isNaN(consentAt.getTime())) throw new BadRequestException('consentAt inválido.');

    const templateSnapshot = request.template
      ? {
          id: request.template.id,
          name: request.template.name,
          version: request.template.version,
          questions: request.template.questions.map((q) => ({
            id: q.id,
            type: q.type,
            label: q.label,
            required: q.required,
            placeholder: q.placeholder,
            options: q.options,
            sortOrder: q.sortOrder,
            useForScoring: (q as { useForScoring?: boolean }).useForScoring ?? false,
            weight: (q as { weight?: number | null }).weight ?? undefined,
            scoringConfig: (q as { scoringConfig?: unknown }).scoringConfig ?? undefined,
          })),
        }
      : null;

    const snapshotForCalc = templateSnapshot ?? {};
    const matchResult = this.matchScoreService.calculate(snapshotForCalc, dto.answers as Record<string, unknown>);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.adoptionFormSubmission.create({
        data: {
          requestId,
          templateSnapshot: snapshotForCalc as object,
          answers: dto.answers as object,
          consentAt,
          ...(matchResult && {
            matchScore: matchResult.score,
            matchScoreBreakdown: matchResult.breakdown as object,
            matchScoreCalculatedAt: now,
          }),
        },
      }),
      this.prisma.adoptionRequest.update({
        where: { id: requestId },
        data: {
          status: ADOPTION_REQUEST_STATUS.FORM_SUBMITTED,
          submittedAt: new Date(),
        },
      }),
    ]);

    await this.prisma.message.create({
      data: {
        conversationId: request.conversationId,
        senderId: userId,
        isSystem: true,
        messageType: 'FORM_SUBMITTED',
        content: 'Formulário de adoção preenchido e enviado.',
        metadata: { adoptionRequestId: requestId } as object,
      },
    });
    await this.prisma.conversation.update({
      where: { id: request.conversationId },
      data: { updatedAt: new Date() },
    });

    const petOwner = await this.prisma.pet.findUnique({
      where: { id: request.petId },
      select: { ownerId: true },
    });
    if (petOwner) {
      await this.inAppNotifications.create(
        petOwner.ownerId,
        IN_APP_NOTIFICATION_TYPES.ADOPTION_FORM_SUBMITTED,
        'Formulário recebido',
        `${(request.adopter as { name: string }).name} preencheu o formulário de adoção de ${(request.pet as { name: string }).name}.`,
        { adoptionRequestId: requestId },
        {
          type: IN_APP_NOTIFICATION_TYPES.ADOPTION_FORM_SUBMITTED,
          screen: 'partnerAdoptionRequests',
          adoptionRequestId: requestId,
          conversationId: request.conversationId,
        } as Record<string, string>,
      );
    }

    const updated = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
    });
    return this.toDto(updated!);
  }

  async listForPartner(
    userId: string,
    options?: { petId?: string },
  ): Promise<AdoptionRequestWithDetails[]> {
    const partnerId = await this.ensurePartner(userId);

    const where: { pet: { partnerId: string }; petId?: string } = {
      pet: { partnerId },
    };
    if (options?.petId) where.petId = options.petId;

    const requests = await this.prisma.adoptionRequest.findMany({
      where,
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return requests.map((r) => this.toDto(r));
  }

  async getOne(userId: string, requestId: string): Promise<AdoptionRequestWithDetails> {
    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: { select: { id: true, name: true, partnerId: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');

    const partnerId = await this.petPartnershipService.getPartnerIdForUser(userId);
    const isAdopter = request.adopterId === userId;
    const isPartner = partnerId && request.pet?.partnerId === partnerId;

    if (!isAdopter && !isPartner) {
      throw new ForbiddenException('Acesso negado.');
    }

    if (isPartner && request.submission) {
      await this.prisma.adoptionFormViewLog.create({
        data: { requestId, viewedById: userId },
      });
    }

    return this.toDto(request);
  }

  async approve(userId: string, requestId: string): Promise<AdoptionRequestWithDetails> {
    const partnerId = await this.ensurePartner(userId);

    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: { select: { id: true, name: true, ownerId: true } },
        adopter: { select: { id: true, name: true } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    await this.ensurePartnerAccessToPet(partnerId, request.petId);
    if (request.status !== ADOPTION_REQUEST_STATUS.FORM_SUBMITTED) {
      throw new BadRequestException('Apenas solicitações com formulário preenchido podem ser aprovadas.');
    }

    await this.prisma.$transaction([
      this.prisma.adoptionRequest.updateMany({
        where: {
          petId: request.petId,
          id: { not: requestId },
          status: { in: [ADOPTION_REQUEST_STATUS.FORM_SENT, ADOPTION_REQUEST_STATUS.FORM_SUBMITTED] },
        },
        data: {
          status: ADOPTION_REQUEST_STATUS.REJECTED,
          decidedAt: new Date(),
          decidedById: userId,
          rejectionFeedback: 'Outro candidato foi selecionado.',
        },
      }),
      this.prisma.adoptionRequest.update({
        where: { id: requestId },
        data: {
          status: ADOPTION_REQUEST_STATUS.ADOPTION_PROPOSED,
          decidedAt: new Date(),
          decidedById: userId,
        },
      }),
    ]);

    await this.petsService.patchStatus(
      request.petId,
      request.pet.ownerId,
      'ADOPTED',
      request.adopterId,
    );

    const updated = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
    });
    return this.toDto(updated!);
  }

  async reject(userId: string, requestId: string, dto?: RejectRequestDto): Promise<AdoptionRequestWithDetails> {
    const partnerId = await this.ensurePartner(userId);

    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    await this.ensurePartnerAccessToPet(partnerId, request.petId);
    const status = request.status;
    if (status !== ADOPTION_REQUEST_STATUS.FORM_SENT && status !== ADOPTION_REQUEST_STATUS.FORM_SUBMITTED) {
      throw new BadRequestException('Esta solicitação não pode mais ser rejeitada.');
    }

    const updated = await this.prisma.adoptionRequest.update({
      where: { id: requestId },
      data: {
        status: ADOPTION_REQUEST_STATUS.REJECTED,
        decidedAt: new Date(),
        decidedById: userId,
        rejectionFeedback: dto?.feedback ?? null,
      },
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
    });

    await this.inAppNotifications.create(
      request.adopterId,
      IN_APP_NOTIFICATION_TYPES.ADOPTION_REQUEST_REJECTED,
      'Solicitação de adoção',
      dto?.feedback
        ? `Infelizmente sua solicitação para ${request.pet.name} não foi aprovada. Feedback: ${dto.feedback}`
        : `Infelizmente sua solicitação para ${request.pet.name} não foi aprovada.`,
      { adoptionRequestId: requestId },
      { adoptionRequestId: requestId },
    );

    return this.toDto(updated);
  }

  async listMyRequests(userId: string): Promise<AdoptionRequestWithDetails[]> {
    const requests = await this.prisma.adoptionRequest.findMany({
      where: { adopterId: userId },
      include: {
        pet: { select: { id: true, name: true } },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return requests.map((r) => this.toDto(r));
  }

  async getSubmissionPdf(userId: string, requestId: string): Promise<Buffer> {
    const partnerId = await this.ensurePartner(userId);

    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            partner: { select: { name: true, logoUrl: true } },
          },
        },
        adopter: { select: { id: true, name: true } },
        submission: true,
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    await this.ensurePartnerAccessToPet(partnerId, request.petId);
    if (!request.submission) {
      throw new BadRequestException('Formulário ainda não foi preenchido pelo adotante.');
    }

    const submission = request.submission;
    const pet = request.pet as { name: string; partner?: { name: string; logoUrl: string | null } | null };
    const adopter = request.adopter as { name: string };
    const partner = pet?.partner ?? null;
    let logoBuffer: Buffer | null = null;
    if (partner?.logoUrl) {
      try {
        const res = await fetch(partner.logoUrl);
        if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
      } catch {
        // ignora falha ao carregar logo
      }
    }

    const snapshot = submission.templateSnapshot as {
      name?: string;
      questions?: SnapshotQuestionPdf[];
    } | null;
    const answers = (submission.answers as Record<string, unknown>) ?? {};
    const formName = snapshot?.name ?? 'Formulário de adoção';
    const questions = snapshot?.questions ?? [];
    const PDFDocumentConstructor: new (opts?: object) => PDFKit.PDFDocument =
      (PDFDocumentModule as unknown as { default?: new (opts?: object) => PDFKit.PDFDocument }).default ?? (PDFDocumentModule as unknown as new (opts?: object) => PDFKit.PDFDocument);
    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const MARGIN = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const colors = {
      primary: '#7c3aed',
      primaryLight: '#ede9fe',
      headerBg: '#f8fafc',
      border: '#e2e8f0',
      text: '#1e293b',
      textMuted: '#64748b',
      success: '#059669',
      successBg: '#d1fae5',
      warning: '#d97706',
      rowAlt: '#f8fafc',
    };

    return new Promise<Buffer>((resolve, reject) => {
      const doc: PDFKit.PDFDocument = new PDFDocumentConstructor({ margin: MARGIN, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const moveDown = (n: number) => doc.moveDown(n);

      // —— Header com logo e nome da ONG ——
      doc.save();
      doc.fillColor(colors.headerBg).rect(0, 0, PAGE_WIDTH, 100).fill();
      doc.restore();
      doc.save();
      doc.fillColor(colors.primary).rect(0, 98, PAGE_WIDTH, 4).fill();
      doc.restore();
      doc.y = 22;
      doc.x = MARGIN;
      const logoSize = 44;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, MARGIN, 22, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
        } catch {
          // fallback sem imagem
        }
        doc.x = MARGIN + logoSize + 16;
        doc.y = 28;
      }
      doc.fontSize(10).fillColor(colors.textMuted);
      doc.text(partner?.name ?? 'Parceiro Adopet', { continued: false });
      doc.fontSize(18).fillColor(colors.text).text('Formulário de adoção preenchido', { continued: false });
      doc.y = 102;
      doc.x = MARGIN;
      moveDown(0.6);

      // —— Bloco Informações ——
      const infoY = doc.y;
      doc.save();
      doc.fillColor(colors.primaryLight).roundedRect(MARGIN, infoY, CONTENT_WIDTH, 72, 6).fill();
      doc.restore();
      doc.fillColor(colors.text).fontSize(11);
      doc.x = MARGIN + 14;
      doc.y = infoY + 12;
      doc.text(`Pet: ${pet.name}`, { continued: false });
      doc.text(`Adotante: ${adopter.name}`, { continued: false });
      doc.text(`Formulário: ${formName}`, { continued: false });
      doc.text(`Data do envio: ${new Date(submission.submittedAt).toLocaleString('pt-BR')}`, { continued: false });
      doc.y = infoY + 72 + 14;
      doc.x = MARGIN;
      moveDown(0.5);

      // —— Respostas do formulário ——
      doc.fontSize(12).fillColor(colors.primary).text('Respostas do formulário', { continued: false });
      moveDown(0.5);
      doc.fontSize(10).fillColor(colors.text);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const val = answers[q.id];
        const display = formatAnswerForPdf(q, val);
        const rowY = doc.y;
        if (i % 2 === 1) {
          doc.save();
          doc.fillColor(colors.rowAlt).rect(MARGIN, rowY - 2, CONTENT_WIDTH, 36).fill();
          doc.restore();
        }
        doc.fillColor(colors.textMuted).fontSize(9).x = MARGIN + 8;
        doc.text(q.label, { continued: false, width: CONTENT_WIDTH - 16 });
        doc.fillColor(colors.text).fontSize(10);
        doc.text(display, { continued: false, width: CONTENT_WIDTH - 16 });
        doc.x = MARGIN;
        moveDown(0.5);
      }

      // —— Rodapé ——
      doc.fontSize(8).fillColor(colors.textMuted);
      doc.y = PAGE_HEIGHT - 36;
      doc.x = MARGIN;
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · Adopet`, { align: 'center', width: CONTENT_WIDTH });

      doc.end();
    });
  }

  async getFormForRequest(userId: string, requestId: string): Promise<{
    requestId: string;
    expiresAt: string | null;
    template: { id: string; name: string; questions: Array<{ id: string; type: string; label: string; required: boolean; placeholder?: string; options?: unknown }> };
  }> {
    const request = await this.prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        template: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.adopterId !== userId) throw new ForbiddenException('Você não é o adotante desta solicitação.');
    if (request.status !== ADOPTION_REQUEST_STATUS.FORM_SENT) {
      throw new BadRequestException('Formulário não está disponível para preenchimento.');
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new BadRequestException('O prazo para preencher este formulário expirou.');
    }
    if (!request.template) throw new NotFoundException('Template não encontrado.');

    return {
      requestId,
      expiresAt: request.expiresAt?.toISOString() ?? null,
      template: {
        id: request.template.id,
        name: request.template.name,
        questions: request.template.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          required: q.required,
          placeholder: q.placeholder ?? undefined,
          options: q.options,
        })),
      },
    };
  }

  private toDto(
    r: {
      id: string;
      petId: string;
      adopterId: string;
      conversationId: string;
      templateId: string | null;
      status: string;
      formSentAt: Date | null;
      submittedAt: Date | null;
      decidedAt: Date | null;
      rejectionFeedback: string | null;
      expiresAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      pet?: { id: string; name: string };
      adopter?: { id: string; name: string };
      submission?: {
        id: string;
        templateSnapshot: unknown;
        answers: unknown;
        consentAt: Date;
        submittedAt: Date;
        matchScore?: number | null;
        matchScoreBreakdown?: unknown;
        matchScoreCalculatedAt?: Date | null;
      } | null;
    },
  ): AdoptionRequestWithDetails {
    return {
      id: r.id,
      petId: r.petId,
      adopterId: r.adopterId,
      conversationId: r.conversationId,
      templateId: r.templateId,
      status: r.status,
      formSentAt: r.formSentAt?.toISOString() ?? null,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      decidedAt: r.decidedAt?.toISOString() ?? null,
      rejectionFeedback: r.rejectionFeedback ?? null,
      expiresAt: (r as { expiresAt?: Date | null }).expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      pet: r.pet,
      adopter: r.adopter,
      submission: r.submission
        ? (() => {
            const snapshot = r.submission.templateSnapshot as { questions?: Array<{ id: string; type: string; label: string; useForScoring?: boolean; weight?: number; scoringConfig?: unknown; options?: Array<{ value: string; label: string }> }> } | null | undefined;
            const answers = r.submission.answers as Record<string, unknown> | null | undefined;
            const recalc = snapshot && answers && typeof answers === 'object'
              ? this.matchScoreService.calculate(snapshot as Parameters<MatchScoreService['calculate']>[0] & object, answers)
              : null;
            return {
              id: r.submission.id,
              templateSnapshot: r.submission.templateSnapshot,
              answers: r.submission.answers,
              consentAt: r.submission.consentAt.toISOString(),
              submittedAt: r.submission.submittedAt.toISOString(),
              matchScore: recalc?.score ?? r.submission.matchScore ?? undefined,
              matchScoreBreakdown: (recalc?.breakdown as object) ?? r.submission.matchScoreBreakdown ?? undefined,
              matchScoreCalculatedAt: recalc
                ? new Date().toISOString()
                : r.submission.matchScoreCalculatedAt?.toISOString() ?? undefined,
            };
          })()
        : undefined,
    };
  }
}
