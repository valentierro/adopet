import { Injectable, OnModuleInit } from '@nestjs/common';
import { StripeService } from './stripe.service';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 1x/dia

@Injectable()
export class PartnerSubscriptionCleanupScheduler implements OnModuleInit {
  constructor(private readonly stripeService: StripeService) {}

  onModuleInit() {
    this.run();
    setInterval(() => this.run(), INTERVAL_MS);
  }

  private async run(): Promise<void> {
    if (!this.stripeService.isConfigured()) return;
    try {
      const cleanupCount = await this.stripeService.runExpiredSubscriptionCleanup();
      if (cleanupCount > 0) {
        console.log(`[PartnerSubscriptionCleanup] ${cleanupCount} parceiro(s) desativado(s) (assinatura expirada).`);
      }
      const reminderCount = await this.stripeService.runCancellationReminderJob();
      if (reminderCount > 0) {
        console.log(`[PartnerSubscriptionCleanup] ${reminderCount} lembrete(s) de cancelamento enviado(s).`);
      }
    } catch (e) {
      console.warn('[PartnerSubscriptionCleanup] run failed', e);
    }
  }
}
