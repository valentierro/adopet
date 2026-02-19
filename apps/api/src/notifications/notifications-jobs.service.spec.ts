import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsJobsService } from './notifications-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { FeedService } from '../feed/feed.service';

describe('NotificationsJobsService', () => {
  let service: NotificationsJobsService;
  let prisma: { pet: { findMany: jest.Mock; update: jest.Mock } };
  let push: { sendToUser: jest.Mock };

  beforeEach(async () => {
    prisma = {
      pet: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
    };
    push = { sendToUser: jest.fn().mockResolvedValue(undefined) };

    const fullPrisma = {
      ...prisma,
      user: { findMany: jest.fn().mockResolvedValue([]) },
      userPreferences: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      conversation: { findMany: jest.fn().mockResolvedValue([]) },
      savedSearch: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsJobsService,
        { provide: PrismaService, useValue: fullPrisma },
        { provide: PushService, useValue: push },
        { provide: FeedService, useValue: { countNewPetsInRadius: jest.fn(), countPetsForSavedSearchAlert: jest.fn(), countNewPetsInRadiusWithHighMatch: jest.fn() } },
      ],
    }).compile();
    service = module.get<NotificationsJobsService>(NotificationsJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runPostAdoptionFeedbackJob (pós-adoção)', () => {
    it('não lança quando não há pets na janela de 3–4 dias', async () => {
      prisma.pet.findMany.mockResolvedValue([]);
      await (service as any).runPostAdoptionFeedbackJob();
      expect(prisma.pet.findMany).toHaveBeenCalled();
      expect(push.sendToUser).not.toHaveBeenCalled();
      expect(prisma.pet.update).not.toHaveBeenCalled();
    });

    it('envia push para tutor e adotante e atualiza postAdoptionFeedbackPushSentAt quando há pet elegível', async () => {
      prisma.pet.findMany.mockResolvedValue([
        {
          id: 'pet-1',
          name: 'Rex',
          adoption: { tutorId: 'user-tutor', adopterId: 'user-adopter' },
        },
      ]);
      await (service as any).runPostAdoptionFeedbackJob();
      expect(push.sendToUser).toHaveBeenCalledTimes(2);
      expect(push.sendToUser).toHaveBeenCalledWith(
        'user-tutor',
        'Como foi a adoção? 🐾',
        expect.stringContaining('Rex'),
        { screen: 'my-adoptions' },
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        'user-adopter',
        'Como foi a adoção? 🐾',
        expect.stringContaining('Rex'),
        { screen: 'my-adoptions' },
      );
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 'pet-1' },
        data: { postAdoptionFeedbackPushSentAt: expect.any(Date) },
      });
    });

    it('envia push só uma vez quando tutor e adotante são a mesma pessoa', async () => {
      prisma.pet.findMany.mockResolvedValue([
        {
          id: 'pet-2',
          name: 'Luna',
          adoption: { tutorId: 'user-same', adopterId: 'user-same' },
        },
      ]);
      await (service as any).runPostAdoptionFeedbackJob();
      expect(push.sendToUser).toHaveBeenCalledTimes(1);
      expect(prisma.pet.update).toHaveBeenCalledWith({
        where: { id: 'pet-2' },
        data: { postAdoptionFeedbackPushSentAt: expect.any(Date) },
      });
    });
  });
});
