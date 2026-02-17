import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { FeedService } from '../feed/feed.service';

const NEW_PETS_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const REMINDERS_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h
const LISTING_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // job 1x/dia
const LISTING_REMINDER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // não enviar de novo por 30 dias
const LISTING_EXPIRY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1x/dia: lembretes de expiração + expirar anúncios
const POST_ADOPTION_FEEDBACK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1x/dia
const POST_ADOPTION_FEEDBACK_DAYS_MIN = 3;
const POST_ADOPTION_FEEDBACK_DAYS_MAX = 4; // janela de 1 dia para enviar uma vez
const NEW_PETS_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24h
const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000; // lembrar se última msg do outro > 24h
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // não enviar de novo por 7 dias
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LISTING_EXPIRY_SYSTEM_MESSAGE =
  'Este anúncio foi removido por falta de confirmação do anunciante. O pet não está mais disponível no feed.';

@Injectable()
export class NotificationsJobsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly feedService: FeedService,
  ) {}

  onModuleInit() {
    this.runNewPetsJob();
    this.runRemindersJob();
    this.runSavedSearchAlertsJob();
    this.runTutorListingReminderJob();
    this.runExpiryRemindersJob();
    this.runExpireListingsJob();
    this.runPostAdoptionFeedbackJob();
    setInterval(() => this.runNewPetsJob(), NEW_PETS_INTERVAL_MS);
    setInterval(() => this.runRemindersJob(), REMINDERS_INTERVAL_MS);
    setInterval(() => this.runSavedSearchAlertsJob(), NEW_PETS_INTERVAL_MS);
    setInterval(() => this.runTutorListingReminderJob(), LISTING_REMINDER_INTERVAL_MS);
    setInterval(() => this.runExpiryRemindersJob(), LISTING_EXPIRY_INTERVAL_MS);
    setInterval(() => this.runExpireListingsJob(), LISTING_EXPIRY_INTERVAL_MS);
    setInterval(() => this.runPostAdoptionFeedbackJob(), POST_ADOPTION_FEEDBACK_INTERVAL_MS);
  }

  /** Push "Como foi a adoção?" alguns dias após a confirmação (tutor e adotante), uma vez por pet. */
  private async runPostAdoptionFeedbackJob(): Promise<void> {
    try {
      const now = new Date();
      const minDate = new Date(now.getTime() - POST_ADOPTION_FEEDBACK_DAYS_MAX * MS_PER_DAY); // 4 dias atrás
      const maxDate = new Date(now.getTime() - POST_ADOPTION_FEEDBACK_DAYS_MIN * MS_PER_DAY); // 3 dias atrás
      const pets = await this.prisma.pet.findMany({
        where: {
          adopetConfirmedAt: { not: null, gte: minDate, lte: maxDate },
          postAdoptionFeedbackPushSentAt: null,
          adoption: { isNot: null },
        },
        select: { id: true, name: true, adoption: { select: { tutorId: true, adopterId: true } } },
      });
      for (const pet of pets) {
        const adoption = pet.adoption as { tutorId: string; adopterId: string } | null;
        if (!adoption) continue;
        const title = 'Como foi a adoção?';
        const body = `Conte sua experiência com a adoção de ${pet.name}. Sua opinião nos ajuda a melhorar.`;
        const data = { screen: 'my-adoptions' };
        await this.push.sendToUser(adoption.tutorId, title, body, data);
        if (adoption.adopterId !== adoption.tutorId) {
          await this.push.sendToUser(adoption.adopterId, title, body, data);
        }
        await this.prisma.pet.update({
          where: { id: pet.id },
          data: { postAdoptionFeedbackPushSentAt: new Date() },
        });
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runPostAdoptionFeedbackJob failed', e);
    }
  }

  /** Push "X novos pets na sua região" para usuários com notifyNewPets, pushToken e localização. */
  private async runNewPetsJob(): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: { pushToken: { not: null } },
        select: { id: true },
      });
      const prefsList = await this.prisma.userPreferences.findMany({
        where: {
          userId: { in: users.map((u) => u.id) },
          notifyNewPets: true,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { userId: true, species: true, latitude: true, longitude: true, radiusKm: true },
      });
      const since = new Date(Date.now() - NEW_PETS_LOOKBACK_MS);
      for (const prefs of prefsList) {
        if (prefs.latitude == null || prefs.longitude == null) continue;
        const count = await this.feedService.countNewPetsInRadius(
          prefs.userId,
          prefs.latitude,
          prefs.longitude,
          prefs.radiusKm ?? 50,
          since,
          prefs.species ?? undefined,
        );
        if (count > 0) {
          const msg =
            count === 1
              ? '1 novo pet na sua região'
              : `${count} novos pets na sua região`;
          await this.push.sendToUser(prefs.userId, 'Novos pets', msg);
        }
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runNewPetsJob failed', e);
    }
  }

  /** Push "Você tem uma conversa pendente sobre [pet]" após 24h sem resposta. */
  private async runRemindersJob(): Promise<void> {
    try {
      const convs = await this.prisma.conversation.findMany({
        where: {
          messages: { some: {} },
        },
        include: {
          participants: true,
          pet: { select: { name: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      const now = Date.now();
      for (const c of convs) {
        const lastMsg = c.messages[0];
        if (!lastMsg || lastMsg.senderId == null) continue; // ignora se última msg for de sistema
        const lastFromOther = lastMsg.senderId;
        const otherParticipant = c.participants.find((p) => p.userId !== lastFromOther);
        if (!otherParticipant) continue;
        const toNotify = otherParticipant.userId;
        if (lastMsg.createdAt.getTime() < now - REMINDER_AFTER_MS) {
          const cooldownOk =
            !c.lastReminderAt || c.lastReminderAt.getTime() < now - REMINDER_COOLDOWN_MS;
          if (!cooldownOk) continue;
          const prefs = await this.prisma.userPreferences.findUnique({
            where: { userId: toNotify },
            select: { notifyReminders: true },
          });
          if (prefs?.notifyReminders === false) continue;
          await this.push.sendToUser(
            toNotify,
            'Conversa pendente',
            `Você tem uma conversa pendente sobre ${c.pet.name}`,
            { conversationId: c.id },
          );
          await this.prisma.conversation.update({
            where: { id: c.id },
            data: { lastReminderAt: new Date() },
          });
        }
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runRemindersJob failed', e);
    }
  }

  /** Push "Seus anúncios estão em dia?" para tutores com pet AVAILABLE ou IN_PROCESS, a cada 30 dias. */
  private async runTutorListingReminderJob(): Promise<void> {
    try {
      const cooldownBefore = new Date(Date.now() - LISTING_REMINDER_COOLDOWN_MS);
      const users = await this.prisma.user.findMany({
        where: {
          pushToken: { not: null },
          deactivatedAt: null,
          pets: {
            some: { status: { in: ['AVAILABLE', 'IN_PROCESS'] } },
          },
          OR: [
            { lastListingReminderAt: null },
            { lastListingReminderAt: { lt: cooldownBefore } },
          ],
        },
        select: { id: true },
      });
      for (const u of users) {
        const prefs = await this.prisma.userPreferences.findUnique({
          where: { userId: u.id },
          select: { notifyListingReminders: true },
        });
        if (prefs?.notifyListingReminders === false) continue;
        await this.push.sendToUser(
          u.id,
          'Seus anúncios estão em dia?',
          'Se algum pet já foi adotado, atualize no app. Adoções confirmadas entram na sua pontuação e no seu nível de tutor.',
          { screen: 'my-pets' },
        );
        await this.prisma.user.update({
          where: { id: u.id },
          data: { lastListingReminderAt: new Date() },
        });
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runTutorListingReminderJob failed', e);
    }
  }

  /** Lembretes de expiração: push ao tutor em 10, 5 e 1 dia antes de expiresAt. */
  private async runExpiryRemindersJob(): Promise<void> {
    try {
      const now = new Date();
      const pets = await this.prisma.pet.findMany({
        where: {
          status: { in: ['AVAILABLE', 'IN_PROCESS'] },
          expiresAt: { not: null, gt: now },
        },
        include: { owner: { select: { id: true, pushToken: true } } },
      });
      const prefsByUserId = new Map<string, { notifyListingReminders: boolean }>();
      for (const pet of pets) {
        if (!pet.expiresAt || !pet.owner?.pushToken) continue;
        const prefs =
          prefsByUserId.get(pet.ownerId) ??
          (await this.prisma.userPreferences.findUnique({
            where: { userId: pet.ownerId },
            select: { notifyListingReminders: true },
          }));
        if (prefs) prefsByUserId.set(pet.ownerId, prefs);
        if (prefs?.notifyListingReminders === false) continue;
        const msLeft = pet.expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / MS_PER_DAY);
        if (daysLeft <= 1 && pet.expiryReminder1SentAt == null) {
          await this.push.sendToUser(
            pet.ownerId,
            'Anúncio expirando',
            `Oi! O seu anúncio de adoção do pet ${pet.name} expira em 1 dia. Toque para prorrogar e manter ativo.`,
            { screen: 'pet-detail', petId: pet.id },
          );
          await this.prisma.pet.update({
            where: { id: pet.id },
            data: { expiryReminder1SentAt: now },
          });
        } else if (daysLeft <= 5 && pet.expiryReminder5SentAt == null) {
          await this.push.sendToUser(
            pet.ownerId,
            'Anúncio expirando',
            `Oi! O seu anúncio de adoção do pet ${pet.name} expira em 5 dias. Toque para prorrogar e manter ativo.`,
            { screen: 'pet-detail', petId: pet.id },
          );
          await this.prisma.pet.update({
            where: { id: pet.id },
            data: { expiryReminder5SentAt: now },
          });
        } else if (daysLeft <= 10 && pet.expiryReminder10SentAt == null) {
          await this.push.sendToUser(
            pet.ownerId,
            'Anúncio expirando',
            `Oi! O seu anúncio de adoção do pet ${pet.name} expira em 10 dias. Toque para prorrogar e manter ativo.`,
            { screen: 'pet-detail', petId: pet.id },
          );
          await this.prisma.pet.update({
            where: { id: pet.id },
            data: { expiryReminder10SentAt: now },
          });
        }
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runExpiryRemindersJob failed', e);
    }
  }

  /** Expira anúncios (expiresAt <= now): marca conversas, envia mensagem de sistema, não remove pet. */
  private async runExpireListingsJob(): Promise<void> {
    try {
      const now = new Date();
      const expired = await this.prisma.pet.findMany({
        where: {
          status: { in: ['AVAILABLE', 'IN_PROCESS'] },
          expiresAt: { not: null, lte: now },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { pushToken: true } },
        },
      });
      for (const pet of expired) {
        const convs = await this.prisma.conversation.findMany({
          where: { petId: pet.id, listingRemovedAt: null },
          select: { id: true },
        });
        for (const c of convs) {
          await this.prisma.conversation.update({
            where: { id: c.id },
            data: { listingRemovedAt: now },
          });
          await this.prisma.message.create({
            data: {
              conversationId: c.id,
              senderId: null,
              isSystem: true,
              content: LISTING_EXPIRY_SYSTEM_MESSAGE,
            },
          });
        }
        if (pet.owner?.pushToken) {
          const prefs = await this.prisma.userPreferences.findUnique({
            where: { userId: pet.ownerId },
            select: { notifyListingReminders: true },
          });
          if (prefs?.notifyListingReminders !== false) {
            await this.push.sendToUser(
              pet.ownerId,
              'Anúncio expirado',
              `Oi! O seu anúncio de adoção do pet ${pet.name} expirou e foi removido do feed.`,
              { screen: 'my-pets' },
            );
          }
        }
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runExpireListingsJob failed', e);
    }
  }

  /** Alertas de buscas salvas: "X pets novos combinam com sua busca" (respeita raio quando há lat/lng). */
  private async runSavedSearchAlertsJob(): Promise<void> {
    try {
      const searches = await this.prisma.savedSearch.findMany({
        include: {
          user: { select: { pushToken: true } },
        },
      });
      for (const s of searches) {
        if (!s.user.pushToken) continue;
        const prefs = await this.prisma.userPreferences.findUnique({
          where: { userId: s.userId },
          select: { notifyNewPets: true },
        });
        if (prefs?.notifyNewPets === false) continue;
        const count = await this.feedService.countPetsForSavedSearchAlert({
          userId: s.userId,
          lastCheckedAt: s.lastCheckedAt,
          species: s.species,
          size: s.size,
          breed: s.breed,
          latitude: s.latitude,
          longitude: s.longitude,
          radiusKm: s.radiusKm ?? 50,
        });
        if (count > 0) {
          const msg =
            count === 1
              ? '1 pet novo combina com sua busca salva'
              : `${count} pets novos combinam com sua busca salva`;
          await this.push.sendToUser(s.userId, 'Busca salva', msg);
        }
        await this.prisma.savedSearch.update({
          where: { id: s.id },
          data: { lastCheckedAt: new Date() },
        });
      }
    } catch (e) {
      console.warn('[NotificationsJobs] runSavedSearchAlertsJob failed', e);
    }
  }
}
