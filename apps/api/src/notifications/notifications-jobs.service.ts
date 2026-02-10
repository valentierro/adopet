import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { FeedService } from '../feed/feed.service';

const NEW_PETS_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const REMINDERS_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h
const NEW_PETS_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24h
const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000; // lembrar se última msg do outro > 24h
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // não enviar de novo por 7 dias

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
    setInterval(() => this.runNewPetsJob(), NEW_PETS_INTERVAL_MS);
    setInterval(() => this.runRemindersJob(), REMINDERS_INTERVAL_MS);
    setInterval(() => this.runSavedSearchAlertsJob(), NEW_PETS_INTERVAL_MS);
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
        if (!lastMsg) continue;
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

  /** Alertas de buscas salvas: "X pets novos combinam com sua busca". */
  private async runSavedSearchAlertsJob(): Promise<void> {
    try {
      const searches = await this.prisma.savedSearch.findMany({
        include: { user: { select: { pushToken: true } } },
      });
      for (const s of searches) {
        if (!s.user.pushToken) continue;
        const where: {
          status: string;
          createdAt: { gte: Date };
          ownerId: { not: string };
          species?: string;
          size?: string;
          breed?: { equals: string; mode: 'insensitive' };
        } = {
          status: 'AVAILABLE',
          createdAt: { gte: s.lastCheckedAt },
          ownerId: { not: s.userId },
        };
        if (s.species && s.species !== 'BOTH') where.species = s.species.toLowerCase();
        if (s.size) where.size = s.size;
        if (s.breed?.trim()) where.breed = { equals: s.breed.trim(), mode: 'insensitive' };
        const count = await this.prisma.pet.count({ where });
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
