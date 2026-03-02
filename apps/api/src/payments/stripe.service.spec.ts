import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  InAppNotificationsService,
  IN_APP_NOTIFICATION_TYPES,
} from '../notifications/in-app-notifications.service';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  let service: StripeService;
  let prisma: {
    partner: {
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let emailService: { isConfigured: jest.Mock; sendMail: jest.Mock };
  let inAppNotificationsService: { create: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      partner: {
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    emailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    inAppNotificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: { get: jest.fn(() => '') } },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: InAppNotificationsService, useValue: inAppNotificationsService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  describe('runExpiredSubscriptionCleanup', () => {
    it('retorna 0 quando Stripe não está configurado', async () => {
      const count = await service.runExpiredSubscriptionCleanup();
      expect(count).toBe(0);
      expect(prisma.partner.findMany).not.toHaveBeenCalled();
    });
  });

  describe('runCancellationReminderJob', () => {
    it('retorna 0 quando email não configurado', async () => {
      emailService.isConfigured.mockReturnValue(false);
      const count = await service.runCancellationReminderJob();
      expect(count).toBe(0);
    });

    it('envia lembrete quando parceiro está a 3 dias do fim', async () => {
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      prisma.partner.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Pet Shop',
          email: 'pet@example.com',
          userId: 'u1',
          subscriptionCancellationAt: inThreeDays,
          subscriptionCancellationReminderPeriodEnd: null,
          user: { email: 'pet@example.com' },
        },
      ]);

      const count = await service.runCancellationReminderJob();

      expect(count).toBe(1);
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'pet@example.com',
          subject: expect.stringContaining('3 dias'),
        }),
      );
      expect(inAppNotificationsService.create).toHaveBeenCalledWith(
        'u1',
        IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_CANCELLATION_REMINDER,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ screen: 'partnerSubscription' }),
      );
      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { subscriptionCancellationReminderPeriodEnd: inThreeDays },
      });
    });
  });
});
