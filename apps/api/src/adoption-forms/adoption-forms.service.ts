import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../../api/prisma-generated';
import { PrismaService } from '../prisma/prisma.service';
import { PetPartnershipService } from '../pet-partnership/pet-partnership.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { IN_APP_NOTIFICATION_TYPES } from '../notifications/in-app-notifications.service';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';

const PENDING_STATUSES = ['FORM_SENT', 'FORM_SUBMITTED'] as const;

export type AdoptionFormTemplateWithQuestions = {
  id: string;
  name: string;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  questions: Array<{
    id: string;
    sortOrder: number;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    useForScoring?: boolean;
    weight?: number;
    scoringConfig?: Record<string, unknown>;
  }>;
};

@Injectable()
export class AdoptionFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly petPartnershipService: PetPartnershipService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  private async ensurePartner(userId: string): Promise<string> {
    const partnerId = await this.petPartnershipService.getPartnerIdForUser(userId);
    if (!partnerId) {
      throw new ForbiddenException('Acesso restrito a parceiros.');
    }
    return partnerId;
  }

  /** Parceiro comercial sem assinatura ativa não pode gerenciar formulários de adoção. */
  private async ensureCommercialPartnerPaid(partnerId: string): Promise<void> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { type: true, isPaidPartner: true },
    });
    if (!partner) return;
    const typeNorm = (partner.type ?? 'ONG').toUpperCase();
    if (typeNorm !== 'ONG' && !partner.isPaidPartner) {
      throw new ForbiddenException(
        'Assinatura inativa. Renove para acessar o portal do parceiro e gerenciar formulários.',
      );
    }
  }

  async listTemplates(userId: string): Promise<AdoptionFormTemplateWithQuestions[]> {
    const partnerId = await this.ensurePartner(userId);
    await this.ensureCommercialPartnerPaid(partnerId);
    const templates = await this.prisma.adoptionFormTemplate.findMany({
      where: { partnerId, active: true },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return templates.map((t) => this.toDto(t));
  }

  async getOne(userId: string, id: string): Promise<AdoptionFormTemplateWithQuestions> {
    const partnerId = await this.ensurePartner(userId);
    await this.ensureCommercialPartnerPaid(partnerId);
    const template = await this.prisma.adoptionFormTemplate.findFirst({
      where: { id, partnerId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return this.toDto(template);
  }

  async create(userId: string, dto: CreateFormTemplateDto): Promise<AdoptionFormTemplateWithQuestions> {
    const partnerId = await this.ensurePartner(userId);
    await this.ensureCommercialPartnerPaid(partnerId);
    const maxVersion = await this.prisma.adoptionFormTemplate.aggregate({
      where: { partnerId },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? 0) + 1;

    const template = await this.prisma.adoptionFormTemplate.create({
      data: {
        partnerId,
        name: dto.name,
        version: nextVersion,
        active: true,
        questions: {
          create: dto.questions.map((q, i) => ({
            sortOrder: q.sortOrder ?? i,
            type: q.type,
            label: q.label,
            required: q.required ?? true,
            placeholder: q.placeholder ?? null,
            options: (q.options ?? undefined) as Prisma.InputJsonValue | undefined,
            useForScoring: (q as { useForScoring?: boolean }).useForScoring ?? false,
            weight: (q as { weight?: number }).weight ?? null,
            scoringConfig: ((q as { scoringConfig?: unknown }).scoringConfig ?? null) as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.toDto(template as unknown as Parameters<typeof this.toDto>[0]);
  }

  async update(userId: string, id: string, dto: UpdateFormTemplateDto): Promise<AdoptionFormTemplateWithQuestions> {
    const partnerId = await this.ensurePartner(userId);
    await this.ensureCommercialPartnerPaid(partnerId);
    const existing = await this.prisma.adoptionFormTemplate.findFirst({
      where: { id, partnerId },
      include: { questions: true },
    });
    if (!existing) throw new NotFoundException('Template não encontrado');

    const maxVersion = await this.prisma.adoptionFormTemplate.aggregate({
      where: { partnerId },
      _max: { version: true },
    });
    const nextVersion = (maxVersion._max.version ?? 0) + 1;

    await this.prisma.adoptionFormTemplate.update({
      where: { id },
      data: { active: false },
    });

    const baseQuestions = existing.questions as Array<{
      sortOrder: number;
      type: string;
      label: string;
      required: boolean;
      placeholder: string | null;
      options: unknown;
      useForScoring?: boolean;
      weight?: number | null;
      scoringConfig?: unknown;
    }>;
    const updateQuestions = dto.questions ?? baseQuestions;
    const questionsData = updateQuestions.map((q, i) => {
      const base = baseQuestions[i];
      const sortOrder = typeof (q as { sortOrder?: number }).sortOrder === 'number' ? (q as { sortOrder: number }).sortOrder : (base?.sortOrder ?? i);
      const type = (q as { type?: string }).type ?? base?.type ?? 'TEXT';
      const label = (q as { label?: string }).label ?? base?.label ?? '';
      const required = typeof (q as { required?: boolean }).required === 'boolean' ? (q as { required: boolean }).required : (base?.required ?? true);
      const placeholder = (q as { placeholder?: string }).placeholder !== undefined ? ((q as { placeholder?: string }).placeholder ?? null) : (base?.placeholder ?? null);
      const opts = (q as { options?: Array<{ value: string; label: string }> }).options;
      const options =
        opts !== undefined
          ? opts ?? undefined
          : (base?.options ? (typeof base.options === 'object' ? base.options : JSON.parse(String(base.options || '[]'))) : undefined);
      const useForScoring = (q as { useForScoring?: boolean }).useForScoring ?? base?.useForScoring ?? false;
      const weight = (q as { weight?: number }).weight !== undefined ? ((q as { weight?: number }).weight ?? null) : (base?.weight ?? null);
      const scoringConfig = (q as { scoringConfig?: unknown }).scoringConfig !== undefined
        ? ((q as { scoringConfig?: unknown }).scoringConfig ?? null)
        : (base?.scoringConfig ?? null);
      return { sortOrder, type, label, required, placeholder, options, useForScoring, weight, scoringConfig };
    });

    const template = await this.prisma.adoptionFormTemplate.create({
      data: {
        partnerId,
        name: dto.name ?? existing.name,
        version: nextVersion,
        active: true,
        questions: {
          create: questionsData.map((q) => ({
            sortOrder: q.sortOrder,
            type: q.type,
            label: q.label,
            required: q.required,
            placeholder: q.placeholder,
            options: q.options as Prisma.InputJsonValue | undefined,
            useForScoring: q.useForScoring,
            weight: q.weight,
            scoringConfig: q.scoringConfig as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.toDto(template as unknown as Parameters<typeof this.toDto>[0]);
  }

  async deactivate(userId: string, id: string): Promise<{ message: string }> {
    const partnerId = await this.ensurePartner(userId);
    await this.ensureCommercialPartnerPaid(partnerId);
    const existing = await this.prisma.adoptionFormTemplate.findFirst({
      where: { id, partnerId },
    });
    if (!existing) throw new NotFoundException('Template não encontrado');

    const pendingRequests = await this.prisma.adoptionRequest.findMany({
      where: { templateId: id, status: { in: [...PENDING_STATUSES] } },
      include: {
        pet: { select: { name: true } },
        adopter: { select: { id: true, name: true } },
      },
    });

    for (const req of pendingRequests) {
      await this.prisma.adoptionRequest.update({
        where: { id: req.id },
        data: { status: 'CANCELLED', decidedAt: new Date() },
      });
      await this.prisma.message.create({
        data: {
          conversationId: req.conversationId,
          senderId: null,
          isSystem: true,
          messageType: 'TEXT',
          content: 'O formulário de adoção foi cancelado pela ONG. Caso queira continuar o processo, entre em contato pelo chat.',
        },
      });
      await this.prisma.conversation.update({
        where: { id: req.conversationId },
        data: { updatedAt: new Date() },
      });
      await this.inAppNotifications.create(
        req.adopterId,
        IN_APP_NOTIFICATION_TYPES.ADOPTION_FORM_CANCELLED_BY_PARTNER,
        'Formulário cancelado',
        `A solicitação de adoção de ${(req.pet as { name: string }).name} foi cancelada pela ONG.`,
        { adoptionRequestId: req.id, conversationId: req.conversationId },
        { adoptionRequestId: req.id, conversationId: req.conversationId },
      );
    }

    await this.prisma.adoptionFormTemplate.update({
      where: { id },
      data: { active: false },
    });
    return {
      message:
        pendingRequests.length > 0
          ? `Template desativado. ${pendingRequests.length} solicitação(ões) cancelada(s) e interessados notificados.`
          : 'Template desativado.',
    };
  }

  private toDto(
    t: {
      id: string;
      name: string;
      version: number;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
      questions?: Array<{
        id: string;
        sortOrder: number;
        type: string;
        label: string;
        required: boolean;
        placeholder: string | null;
        options: unknown;
        useForScoring?: boolean;
        weight?: number | null;
        scoringConfig?: unknown;
      }>;
    },
  ): AdoptionFormTemplateWithQuestions {
    return {
      id: t.id,
      name: t.name,
      version: t.version,
      active: t.active,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      questions: (t.questions ?? []).map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        type: q.type,
        label: q.label,
        required: q.required,
        placeholder: q.placeholder ?? undefined,
        options: typeof q.options === 'string' ? (JSON.parse(q.options || '[]') as Array<{ value: string; label: string }>) : (q.options as Array<{ value: string; label: string }>) ?? undefined,
        useForScoring: q.useForScoring ?? false,
        weight: q.weight ?? undefined,
        scoringConfig: q.scoringConfig as Record<string, unknown> | undefined,
      })),
    };
  }
}
