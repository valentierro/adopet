import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { FeedService } from '../feed/feed.service';
import { TutorStatsService } from '../me/tutor-stats.service';
import { VerificationService } from '../verification/verification.service';
import { StripeService } from '../payments/stripe.service';
import {
  InAppNotificationsService,
  IN_APP_NOTIFICATION_TYPES,
} from '../notifications/in-app-notifications.service';
import { PartnersService } from './partners.service';

describe('PartnersService', () => {
  let service: PartnersService;
  let prisma: {
    partner: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock; findUniqueOrThrow: jest.Mock };
    partnerMember: { findMany: jest.Mock };
  };
  let inAppNotificationsService: { create: jest.Mock };
  let stripeService: { isConfigured: jest.Mock; cancelSubscriptionAtPeriodEnd: jest.Mock };

  const partnerId = 'partner-ong-1';
  const adminUserId = 'user-admin-1';
  const memberUserId1 = 'user-member-1';
  const memberUserId2 = 'user-member-2';
  const partnerName = 'ONG Amigos dos Bichos';

  const basePartnerRow = {
    id: partnerId,
    name: partnerName,
    userId: adminUserId,
    type: 'ONG' as const,
    slug: 'ong-amigos-dos-bichos',
    city: null,
    description: null,
    website: null,
    logoUrl: null,
    phone: null,
    email: null,
    address: null,
    documentType: null,
    document: null,
    legalName: null,
    tradeName: null,
    planId: null,
    active: false,
    approvedAt: new Date(),
    activatedAt: new Date(),
    rejectionReason: null,
    isPaidPartner: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const partnerFindUnique = jest.fn();
    const partnerUpdate = jest.fn();
    const partnerCreate = jest.fn();
    const partnerMemberFindMany = jest.fn();

    partnerFindUnique.mockImplementation((args: { where: { id?: string; slug?: string } }) => {
      if (args.where.slug !== undefined) return Promise.resolve(null);
      if (args.where.id === partnerId) {
        return Promise.resolve({
          id: partnerId,
          stripeSubscriptionId: null,
          active: true,
          isPaidPartner: false,
        });
      }
      return Promise.resolve(null);
    });

    partnerUpdate.mockResolvedValue(basePartnerRow);
    partnerMemberFindMany.mockResolvedValue([
      { userId: memberUserId1 },
      { userId: memberUserId2 },
    ]);

    prisma = {
      partner: {
        findUnique: partnerFindUnique,
        update: partnerUpdate,
        create: partnerCreate,
        findUniqueOrThrow: jest.fn(),
      },
      partnerMember: {
        findMany: partnerMemberFindMany,
      },
    };

    inAppNotificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    stripeService = {
      isConfigured: jest.fn().mockReturnValue(false),
      cancelSubscriptionAtPeriodEnd: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: {} },
        { provide: EmailService, useValue: { isConfigured: () => false } },
        { provide: ConfigService, useValue: { get: () => '' } },
        { provide: FeedService, useValue: {} },
        { provide: TutorStatsService, useValue: {} },
        { provide: VerificationService, useValue: {} },
        { provide: StripeService, useValue: stripeService },
        { provide: InAppNotificationsService, useValue: inAppNotificationsService },
      ],
    }).compile();

    service = module.get(PartnersService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('endPartnership (ONG)', () => {
    it('desativa o parceiro e notifica admin + todos os membros com texto correto', async () => {
      const result = await service.endPartnership(partnerId);

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: partnerId },
        data: { active: false },
        select: expect.any(Object),
      });
      expect(prisma.partnerMember.findMany).toHaveBeenCalledWith({
        where: { partnerId },
        select: { userId: true },
      });

      expect(result.active).toBe(false);
      expect(result.name).toBe(partnerName);

      expect(inAppNotificationsService.create).toHaveBeenCalledTimes(3);

      const createCalls = inAppNotificationsService.create.mock.calls;
      const notifiedUserIds = createCalls.map((c: unknown[]) => (c as [string])[0]);
      expect(notifiedUserIds).toContain(adminUserId);
      expect(notifiedUserIds).toContain(memberUserId1);
      expect(notifiedUserIds).toContain(memberUserId2);

      for (const call of createCalls) {
        const [userId, type, title, body, metadata] = call as [string, string, string, string, Record<string, unknown>];
        expect(type).toBe(IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_ENDED_ONG);
        expect(title).toBe('Parceria da ONG encerrada');
        expect(body).toContain(partnerName);
        expect(body).toContain('encerrada pela nossa equipe');
        expect(body).toContain('Sua conta continua ativa');
        expect(metadata).toEqual({ partnerName });
      }
    });

    it('não duplica notificação quando o admin também é membro', async () => {
      prisma.partnerMember.findMany.mockResolvedValue([
        { userId: adminUserId },
        { userId: memberUserId1 },
      ]);

      await service.endPartnership(partnerId);

      expect(inAppNotificationsService.create).toHaveBeenCalledTimes(2);
      const notifiedUserIds = inAppNotificationsService.create.mock.calls.map(
        (c: unknown[]) => (c as [string])[0],
      );
      expect(notifiedUserIds).toContain(adminUserId);
      expect(notifiedUserIds).toContain(memberUserId1);
    });

    it('notifica só o admin quando não há membros', async () => {
      prisma.partnerMember.findMany.mockResolvedValue([]);

      await service.endPartnership(partnerId);

      expect(inAppNotificationsService.create).toHaveBeenCalledTimes(1);
      expect(inAppNotificationsService.create).toHaveBeenCalledWith(
        adminUserId,
        IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_ENDED_ONG,
        'Parceria da ONG encerrada',
        expect.stringContaining(partnerName),
        { partnerName },
      );
    });

    it('lança NotFoundException quando parceiro não existe', async () => {
      prisma.partner.findUnique.mockImplementation(() => Promise.resolve(null));

      await expect(service.endPartnership(partnerId)).rejects.toThrow(NotFoundException);
      expect(prisma.partner.update).not.toHaveBeenCalled();
      expect(inAppNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('endPartnership (parceria paga)', () => {
    const paidPartnerId = 'partner-paid-1';
    const subscriptionId = 'sub_123';
    const periodEnd = new Date('2025-12-31T23:59:59Z');
    const paidPartnerName = 'Pet Shop Premium';

    beforeEach(() => {
      prisma.partner.findUnique.mockImplementation((args: { where: { id?: string; slug?: string }; select?: Record<string, unknown> }) => {
        if (args.where.slug !== undefined) return Promise.resolve(null);
        if (args.where.id === paidPartnerId) {
          const sel = args.select ?? {};
          if ('stripeSubscriptionId' in sel) {
            return Promise.resolve({
              id: paidPartnerId,
              stripeSubscriptionId: subscriptionId,
              active: true,
              isPaidPartner: true,
            });
          }
          if ('user' in sel) {
            return Promise.resolve({
              name: paidPartnerName,
              email: 'contato@pet.com',
              userId: adminUserId,
              user: { email: 'admin@pet.com' },
            });
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      (prisma.partner.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...basePartnerRow,
        id: paidPartnerId,
        name: paidPartnerName,
        slug: 'pet-shop-premium',
        userId: adminUserId,
        active: true,
      });
      stripeService.isConfigured.mockReturnValue(true);
      stripeService.cancelSubscriptionAtPeriodEnd.mockResolvedValue({ periodEnd });
    });

    it('agenda cancelamento no Stripe e notifica o dono (não desativa na hora)', async () => {
      const result = await service.endPartnership(paidPartnerId);

      expect(stripeService.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith(subscriptionId);
      expect(prisma.partner.update).not.toHaveBeenCalled();
      expect(result.active).toBe(true);

      expect(inAppNotificationsService.create).toHaveBeenCalledTimes(1);
      expect(inAppNotificationsService.create).toHaveBeenCalledWith(
        adminUserId,
        IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_ENDED_PAID_SCHEDULED,
        'Parceria paga encerrada',
        expect.stringContaining(paidPartnerName),
        expect.objectContaining({ partnerName: paidPartnerName, periodEndFormatted: expect.any(String) }),
      );
    });

    it('lança BadRequestException quando Stripe falha ao cancelar', async () => {
      stripeService.cancelSubscriptionAtPeriodEnd.mockRejectedValue(new Error('Stripe API error'));

      await expect(service.endPartnership(paidPartnerId)).rejects.toThrow(BadRequestException);
      expect(prisma.partner.update).not.toHaveBeenCalled();
      expect(inAppNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('create (admin)', () => {
    it('cria parceiro com tipo e nome e gera slug a partir do nome', async () => {
      const created = {
        ...basePartnerRow,
        id: 'partner-new-1',
        name: 'Instituto Amor de Patas',
        type: 'ONG',
        slug: 'instituto-amor-de-patas',
        active: true,
        approvedAt: null,
      };
      prisma.partner.create.mockResolvedValue(created);

      const result = await service.create({
        type: 'ONG',
        name: 'Instituto Amor de Patas',
      });

      expect(prisma.partner.findUnique).toHaveBeenCalledWith({ where: { slug: 'instituto-amor-de-patas' } });
      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ONG',
          name: 'Instituto Amor de Patas',
          slug: 'instituto-amor-de-patas',
          active: true,
          approvedAt: null,
        }),
      });
      expect(result).toMatchObject({
        name: 'Instituto Amor de Patas',
        type: 'ONG',
        slug: 'instituto-amor-de-patas',
        active: true,
      });
    });

    it('cria parceiro com approve e userId opcionais', async () => {
      const created = {
        ...basePartnerRow,
        id: 'partner-new-2',
        name: 'Clínica Vet',
        type: 'CLINIC',
        slug: 'clinica-vet',
        approvedAt: new Date(),
        userId: adminUserId,
      };
      prisma.partner.create.mockResolvedValue(created);

      await service.create({
        type: 'CLINIC',
        name: 'Clínica Vet',
        approve: true,
        userId: adminUserId,
      });

      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CLINIC',
          name: 'Clínica Vet',
          userId: adminUserId,
          approvedAt: expect.any(Date),
        }),
      });
    });

    it('lança BadRequestException quando nome inválido (slug vazio)', async () => {
      await expect(service.create({ type: 'ONG', name: '   ' })).rejects.toThrow(BadRequestException);
      expect(prisma.partner.create).not.toHaveBeenCalled();
    });
  });

  describe('createForUser', () => {
    const userId = 'user-store-1';

    it('cria parceiro STORE vinculado ao usuário e retorna id e slug', async () => {
      prisma.partner.create.mockResolvedValue({
        id: 'partner-store-1',
        slug: 'minha-loja',
      });

      const result = await service.createForUser(userId, 'Minha Loja');

      expect(prisma.partner.findUnique).toHaveBeenCalledWith({ where: { slug: 'minha-loja' } });
      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          type: 'STORE',
          name: 'Minha Loja',
          slug: 'minha-loja',
          active: true,
          approvedAt: null,
          isPaidPartner: false,
        }),
      });
      expect(result).toEqual({ id: 'partner-store-1', slug: 'minha-loja' });
    });

    it('aceita planId e endereço opcionais', async () => {
      prisma.partner.create.mockResolvedValue({ id: 'p2', slug: 'loja-completa' });

      await service.createForUser(userId, 'Loja Completa', 'BASIC', 'Rua X, 100');

      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          planId: 'BASIC',
          address: 'Rua X, 100',
        }),
      });
    });

    it('lança BadRequestException quando nome do estabelecimento inválido', async () => {
      await expect(service.createForUser(userId, '  ')).rejects.toThrow(BadRequestException);
      expect(prisma.partner.create).not.toHaveBeenCalled();
    });
  });
});
