import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  getPartnershipEndedPaidTodayEmailHtml,
  getPartnershipEndedPaidTodayEmailText,
} from '../email/templates/partnership-ended-paid-today.email';
import {
  getPartnerWelcomePaidEmailHtml,
  getPartnerWelcomePaidEmailText,
} from '../email/templates/partner-welcome-paid.email';
import {
  getPartnerSubscriptionRenewalEmailHtml,
  getPartnerSubscriptionRenewalEmailText,
} from '../email/templates/partner-subscription-renewal.email';
import {
  getPartnerCancellationScheduledEmailHtml,
  getPartnerCancellationScheduledEmailText,
} from '../email/templates/partner-cancellation-scheduled.email';
import {
  getPartnerCancellationReminderEmailHtml,
  getPartnerCancellationReminderEmailText,
} from '../email/templates/partner-cancellation-reminder.email';
import {
  InAppNotificationsService,
  IN_APP_NOTIFICATION_TYPES,
} from '../notifications/in-app-notifications.service';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly webhookSecret: string | undefined;
  private readonly priceIds: Record<string, string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly inAppNotificationsService: InAppNotificationsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' });
    }
    // Sandbox (sk_test_*) usa STRIPE_WEBHOOK_SECRET_SANDBOX (ou fallback em STRIPE_WEBHOOK_SECRET); produção usa STRIPE_WEBHOOK_SECRET
    const isTestMode = key?.startsWith('sk_test_');
    const secretSandbox = this.config.get<string>('STRIPE_WEBHOOK_SECRET_SANDBOX');
    const secretProd = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    this.webhookSecret = isTestMode ? (secretSandbox || secretProd) : secretProd;
    this.priceIds = {
      BASIC: this.config.get<string>('STRIPE_PRICE_BASIC') ?? '',
      DESTAQUE: this.config.get<string>('STRIPE_PRICE_DESTAQUE') ?? '',
      PREMIUM: this.config.get<string>('STRIPE_PRICE_PREMIUM') ?? '',
    };
  }

  isConfigured(): boolean {
    return !!this.stripe && !!this.webhookSecret;
  }

  /** Cria sessão de checkout Stripe para assinatura do plano. Retorna URL para redirecionar o usuário. */
  async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Pagamentos não configurados. Entre em contato com o suporte.');
    }
    const priceId = this.priceIds[planId] || this.priceIds.BASIC;
    if (!priceId) {
      throw new BadRequestException('Plano não disponível para pagamento.');
    }
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });
    if (!partner) {
      throw new BadRequestException('Parceiro não encontrado.');
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true },
    });
    let customerId = partner.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { partnerId: partner.id, userId },
      });
      customerId = customer.id;
      await this.prisma.partner.update({
        where: { id: partner.id },
        data: { stripeCustomerId: customerId },
      });
    }
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { partnerId: partner.id, userId, planId },
      subscription_data: {
        metadata: { partnerId: partner.id, userId, planId },
      },
    });
    const url = session.url;
    if (!url) {
      throw new BadRequestException('Não foi possível gerar o link de pagamento.');
    }
    return { url };
  }

  /** Cria sessão do portal de assinante Stripe (gerenciar pagamento, cancelar). Retorna URL para redirecionar. */
  async createBillingPortalSession(userId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Pagamentos não configurados. Entre em contato com o suporte.');
    }
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });
    if (!partner) {
      throw new BadRequestException('Parceiro não encontrado.');
    }
    let customerId = partner.stripeCustomerId;
    if (!customerId && partner.stripeSubscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(partner.stripeSubscriptionId);
        customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (customerId) {
          await this.prisma.partner.update({
            where: { id: partner.id },
            data: { stripeCustomerId: customerId },
          });
        }
      } catch (err: unknown) {
        const isNotFound =
          err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'resource_missing_invalid';
        if (isNotFound) {
          throw new BadRequestException(
            'Assinatura não encontrada no Stripe. Verifique no .env se STRIPE_SECRET_KEY está no mesmo modo (teste ou produção) em que o pagamento foi feito.',
          );
        }
        throw new BadRequestException('Nenhuma assinatura encontrada. Conclua o pagamento primeiro.');
      }
    }
    if (!customerId) {
      const hasActiveFlag = partner.isPaidPartner || partner.subscriptionStatus === 'active';
      throw new BadRequestException(
        hasActiveFlag
          ? 'ASSINATURA_NAO_VINCULADA_STRIPE'
          : 'Nenhuma assinatura encontrada. Conclua o pagamento primeiro.',
      );
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    const url = session.url;
    if (!url) {
      throw new BadRequestException('Não foi possível abrir o portal de assinatura.');
    }
    return { url };
  }

  /**
   * Se o parceiro tem stripeCustomerId mas não stripeSubscriptionId, busca assinatura ativa no Stripe
   * e atualiza o parceiro (útil quando o webhook atrasa ou não foi recebido).
   */
  private async ensureSubscriptionSynced(partner: {
    id: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }): Promise<void> {
    if (!this.stripe || !partner.stripeCustomerId || partner.stripeSubscriptionId) return;
    try {
      const { data: subs } = await this.stripe.subscriptions.list({
        customer: partner.stripeCustomerId,
        status: 'all',
        limit: 5,
      });
      const sub = subs.find((s) => s.status === 'active' || s.status === 'trialing');
      if (sub) {
        const planId = (sub.metadata?.planId as string) || undefined;
        await this.prisma.partner.update({
          where: { id: partner.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            isPaidPartner: true,
            ...(planId && { planId }),
          },
        });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Retorna datas de cobrança da assinatura do parceiro (último pagamento, próximo vencimento, cancelamento agendado).
   * Usado na tela de gerenciar assinatura do portal do parceiro.
   */
  async getSubscriptionBillingInfo(userId: string): Promise<{
    lastPaymentAt: string | null;
    nextBillingAt: string | null;
    cancelAtPeriodEnd: boolean;
    cancellationDate: string | null;
  }> {
    const empty = {
      lastPaymentAt: null,
      nextBillingAt: null,
      cancelAtPeriodEnd: false,
      cancellationDate: null,
    };
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!partner || !this.stripe) {
      return empty;
    }
    await this.ensureSubscriptionSynced(partner);
    const updated = await this.prisma.partner.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true },
    });
    if (!updated?.stripeSubscriptionId) {
      return empty;
    }
    try {
      const raw = await this.stripe.subscriptions.retrieve(updated.stripeSubscriptionId, {
        expand: ['latest_invoice'],
      });
      const sub = raw as { current_period_end?: number; cancel_at_period_end?: boolean };
      const periodEnd =
        sub.current_period_end ??
        (raw.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end;
      const nextBillingAt = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null;
      const cancelAtPeriodEnd = sub.cancel_at_period_end === true;
      const cancellationDate =
        cancelAtPeriodEnd && periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null;
      let lastPaymentAt: string | null = null;
      const latestInvoice = raw.latest_invoice;
      if (latestInvoice && typeof latestInvoice === 'object' && latestInvoice.status === 'paid') {
        const inv = latestInvoice as Stripe.Invoice;
        const paidAt = inv.status_transitions?.paid_at ?? inv.created;
        if (paidAt != null) lastPaymentAt = new Date(paidAt * 1000).toISOString();
      }
      return {
        lastPaymentAt,
        nextBillingAt,
        cancelAtPeriodEnd,
        cancellationDate,
      };
    } catch {
      return empty;
    }
  }

  /**
   * Lista o histórico de faturas/pagamentos da assinatura do parceiro (para exibir na tela de gerenciar assinatura).
   */
  async getSubscriptionPaymentHistory(
    userId: string,
  ): Promise<{ items: Array<{ paidAt: string; amountFormatted: string; status: string }> }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!partner || !this.stripe) {
      return { items: [] };
    }
    await this.ensureSubscriptionSynced(partner);
    const refreshed = await this.prisma.partner.findUnique({
      where: { userId },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!refreshed) return { items: [] };
    let customerId = refreshed.stripeCustomerId;
    if (!customerId && refreshed.stripeSubscriptionId) {
      try {
        const sub = await this.stripe.subscriptions.retrieve(refreshed.stripeSubscriptionId);
        customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
      } catch {
        return { items: [] };
      }
    }
    if (!customerId) return { items: [] };
    try {
      const { data: invoices } = await this.stripe.invoices.list({
        customer: customerId,
        limit: 12,
      });
      const items = invoices.map((inv) => {
        const paidAt =
          inv.status === 'paid' && (inv.status_transitions?.paid_at ?? inv.created)
            ? new Date((inv.status_transitions?.paid_at ?? inv.created) * 1000).toISOString()
            : new Date(inv.created * 1000).toISOString();
        const amountCents = inv.amount_paid ?? inv.amount_due ?? 0;
        const amountFormatted = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;
        return { paidAt, amountFormatted, status: inv.status ?? 'unknown' };
      });
      return { items };
    } catch {
      return { items: [] };
    }
  }

  /** Agenda cancelamento da assinatura no Stripe ao final do período já pago (parceiro mantém acesso até lá; não haverá nova cobrança). Retorna a data fim do período. */
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<{ periodEnd: Date }> {
    if (!this.stripe) return { periodEnd: new Date() };
    const sub = await this.stripe.subscriptions.retrieve(subscriptionId) as { current_period_end?: number };
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date();
    await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return { periodEnd };
  }

  /** Processa evento do webhook Stripe e atualiza Partner (assinatura ativa/cancelada). */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException('Webhook não configurado.');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid signature';
      throw new BadRequestException(msg);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string | null;
      const partnerId = session.metadata?.partnerId as string | undefined;
      const planId = session.metadata?.planId as string | undefined;
      if (partnerId && subscriptionId) {
        const partner = await this.prisma.partner.update({
          where: { id: partnerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
            planId: planId || null,
            isPaidPartner: true,
            approvedAt: new Date(),
          },
          select: { userId: true },
        });
        // Parceiros pagos ganham selo verificado ao confirmar pagamento — não fazem KYC
        if (partner.userId) {
          await this.grantVerifiedBadgeIfMissing(partner.userId);
        }
        if (this.emailService.isConfigured()) {
          const partner = await this.prisma.partner.findUnique({
            where: { id: partnerId },
            select: { name: true, email: true, user: { select: { email: true } } },
          });
          const to = partner?.user?.email ?? partner?.email ?? null;
          if (to && partner?.name) {
            const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
            const assetsDir = path.join(__dirname, '..', '..', 'assets', 'email');
            const portalMenuPath = path.join(assetsDir, 'portal-menu.jpeg');
            const portalDashboardPath = path.join(assetsDir, 'portal-dashboard.jpeg');
            let attachments: Array<{ filename: string; content: Buffer; cid: string }> | undefined;
            let includePortalImages = false;
            try {
              if (fs.existsSync(portalMenuPath) && fs.existsSync(portalDashboardPath)) {
                attachments = [
                  { filename: 'portal-menu.jpeg', content: fs.readFileSync(portalMenuPath), cid: 'portal-menu' },
                  { filename: 'portal-dashboard.jpeg', content: fs.readFileSync(portalDashboardPath), cid: 'portal-dashboard' },
                ];
                includePortalImages = true;
              }
            } catch {
              // Sem imagens: e-mail segue sem anexos
            }
            this.emailService
              .sendMail({
                to,
                subject: 'Bem-vindo(a) à parceria Adopet',
                text: getPartnerWelcomePaidEmailText({ partnerName: partner.name }),
                html: getPartnerWelcomePaidEmailHtml(
                  { partnerName: partner.name },
                  logoUrl || undefined,
                  { includePortalImages },
                ),
                attachments,
              })
              .catch((e) => console.warn('[StripeService] partner welcome email failed', e));
          }
        }
      }
      return;
    }
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      const billingReason = invoice.billing_reason;
      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : (invoice.subscription as { id?: string } | undefined)?.id;
      if (billingReason === 'subscription_cycle' && subscriptionId && this.emailService.isConfigured()) {
        const partner = await this.prisma.partner.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { name: true, email: true, user: { select: { email: true } } },
        });
        const to = partner?.user?.email ?? partner?.email ?? null;
        if (to && partner?.name) {
          const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
          this.emailService
            .sendMail({
              to,
              subject: 'Assinatura renovada - Adopet',
              text: getPartnerSubscriptionRenewalEmailText({ partnerName: partner.name }),
              html: getPartnerSubscriptionRenewalEmailHtml({ partnerName: partner.name }, logoUrl || undefined),
            })
            .catch((e) => console.warn('[StripeService] partner renewal email failed', e));
        }
      }
      return;
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription & { cancel_at_period_end?: boolean; current_period_end?: number };
      const status = subscription.status;
      const isActive = status === 'active' || status === 'trialing';
      const planId = (subscription.metadata?.planId as string) || undefined;
      const isEnded = event.type === 'customer.subscription.deleted' || status === 'canceled';
      const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
      const periodEnd = subscription.current_period_end;

      if (isEnded) {
        const partner = await this.prisma.partner.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          select: { id: true, name: true, email: true, userId: true, user: { select: { email: true } } },
        });
        await this.prisma.partner.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: status,
            isPaidPartner: isActive,
            active: false,
            subscriptionCancellationAt: null,
            subscriptionCancellationReminderPeriodEnd: null,
            ...(planId && { planId }),
          },
        });
        if (partner?.userId) {
          this.inAppNotificationsService
            .create(
              partner.userId,
              IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_ENDED_PAID_TODAY,
              'Parceria paga encerrada hoje 📋',
              `O período da parceria da ${partner.name} encerrou hoje. Sua página não aparece mais no app. Quer voltar? É só entrar em contato ou solicitar de novo pelo app.`,
              { partnerName: partner.name },
            )
            .catch(() => {});
        }
        if (partner && this.emailService.isConfigured()) {
          const to = partner.user?.email ?? partner.email ?? null;
          if (to) {
            const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
            await this.emailService.sendMail({
              to,
              subject: 'Parceria encerrada - Adopet',
              text: getPartnershipEndedPaidTodayEmailText({ partnerName: partner.name }),
              html: getPartnershipEndedPaidTodayEmailHtml({ partnerName: partner.name }, logoUrl || undefined),
            });
          }
        }
      } else {
        const pastDueOrUnpaid = status === 'past_due' || status === 'unpaid' || status === 'incomplete_expired';
        const cancellationAt = cancelAtPeriodEnd && periodEnd != null ? new Date(periodEnd * 1000) : null;
        await this.prisma.partner.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: status,
            isPaidPartner: isActive,
            active: pastDueOrUnpaid ? false : isActive,
            subscriptionCancellationAt: cancelAtPeriodEnd ? cancellationAt : null,
            subscriptionCancellationReminderPeriodEnd: cancelAtPeriodEnd ? undefined : null,
            ...(planId && { planId }),
          },
        });
        if (pastDueOrUnpaid) {
          const partner = await this.prisma.partner.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { userId: true, name: true },
          });
          if (partner?.userId) {
            this.inAppNotificationsService
              .create(
                partner.userId,
                IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_PAYMENT_PAST_DUE,
                'Pagamento pendente',
                `O pagamento da assinatura da ${partner.name} está pendente. Regularize para manter sua página e benefícios no app.`,
                { partnerName: partner.name },
                { screen: 'partnerSubscription' },
              )
              .catch(() => {});
          }
        }
        if (cancelAtPeriodEnd && periodEnd != null && this.emailService.isConfigured()) {
          const partner = await this.prisma.partner.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { name: true, email: true, user: { select: { email: true } } },
          });
          const to = partner?.user?.email ?? partner?.email ?? null;
          if (to && partner?.name) {
            const periodEndFormatted = new Date(periodEnd * 1000).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
            this.emailService
              .sendMail({
                to,
                subject: 'Cancelamento agendado - Adopet',
                text: getPartnerCancellationScheduledEmailText({ partnerName: partner.name, periodEndFormatted }),
                html: getPartnerCancellationScheduledEmailHtml(
                  { partnerName: partner.name, periodEndFormatted },
                  logoUrl || undefined,
                ),
              })
              .catch((e) => console.warn('[StripeService] partner cancellation scheduled email failed', e));
          }
        }
      }
    }
  }

  /**
   * [Job] Desativa parceiros cuja assinatura Stripe expirou (cancel_at_period_end + período passou ou status canceled).
   * Fallback para quando o webhook subscription.deleted não for recebido. Executado 1x/dia.
   */
  async runExpiredSubscriptionCleanup(): Promise<number> {
    if (!this.stripe) return 0;
    const partners = await this.prisma.partner.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        OR: [{ active: true }, { isPaidPartner: true }],
      },
      select: { id: true, stripeSubscriptionId: true, name: true, email: true, userId: true, user: { select: { email: true } } },
    });
    let count = 0;
    for (const p of partners) {
      const subId = p.stripeSubscriptionId;
      if (!subId) continue;
      try {
        const sub = await this.stripe.subscriptions.retrieve(subId) as { status?: string; cancel_at_period_end?: boolean; current_period_end?: number };
        const isEnded = sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired' ||
          (sub.cancel_at_period_end === true && sub.current_period_end != null && sub.current_period_end * 1000 < Date.now());
        if (!isEnded) continue;
        await this.prisma.partner.updateMany({
          where: { stripeSubscriptionId: subId },
          data: {
            subscriptionStatus: sub.status ?? 'canceled',
            isPaidPartner: false,
            active: false,
            subscriptionCancellationAt: null,
            subscriptionCancellationReminderPeriodEnd: null,
          },
        });
        if (p.userId) {
          this.inAppNotificationsService
            .create(p.userId, IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_ENDED_PAID_TODAY, 'Parceria paga encerrada hoje 📋',
              `O período da parceria da ${p.name} encerrou. Sua página não aparece mais no app. Quer voltar? É só entrar em contato ou solicitar de novo pelo app.`,
              { partnerName: p.name })
            .catch(() => {});
        }
        if (this.emailService.isConfigured()) {
          const to = p.user?.email ?? p.email ?? null;
          if (to) {
            const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
            await this.emailService.sendMail({
              to,
              subject: 'Parceria encerrada - Adopet',
              text: getPartnershipEndedPaidTodayEmailText({ partnerName: p.name }),
              html: getPartnershipEndedPaidTodayEmailHtml({ partnerName: p.name }, logoUrl || undefined),
            });
          }
        }
        count++;
      } catch {
        // subscription pode ter sido removida no Stripe; ignorar
      }
    }
    return count;
  }

  /**
   * [Job] Envia lembrete 3 dias antes do fim da assinatura cancelada.
   * Envia e-mail e notificação in-app para parceiros com cancel_at_period_end cujo período termina em ~3 dias.
   */
  async runCancellationReminderJob(): Promise<number> {
    if (!this.emailService.isConfigured()) return 0;
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const windowStart = now + 2.5 * 24 * 60 * 60 * 1000; // 2.5 dias à frente
    const windowEnd = now + 3.5 * 24 * 60 * 60 * 1000;   // 3.5 dias à frente
    const partners = await this.prisma.partner.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        subscriptionCancellationAt: { not: null },
        active: true,
        isPaidPartner: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        subscriptionCancellationAt: true,
        subscriptionCancellationReminderPeriodEnd: true,
        user: { select: { email: true } },
      },
    });
    let count = 0;
    for (const p of partners) {
      const periodEnd = p.subscriptionCancellationAt?.getTime();
      if (!periodEnd || periodEnd < windowStart || periodEnd > windowEnd) continue;
      if (p.subscriptionCancellationReminderPeriodEnd?.getTime() === periodEnd) continue;
      const to = p.user?.email ?? p.email ?? null;
      if (!to) continue;
      const periodEndFormatted = new Date(periodEnd).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const logoUrl = (this.config.get<string>('LOGO_URL') || '').trim();
      await this.emailService.sendMail({
        to,
        subject: 'Lembrete: sua parceria termina em 3 dias - Adopet',
        text: getPartnerCancellationReminderEmailText({ partnerName: p.name, periodEndFormatted }),
        html: getPartnerCancellationReminderEmailHtml(
          { partnerName: p.name, periodEndFormatted },
          logoUrl || undefined,
        ),
      });
      if (p.userId) {
        this.inAppNotificationsService
          .create(
            p.userId,
            IN_APP_NOTIFICATION_TYPES.PARTNERSHIP_CANCELLATION_REMINDER,
            'Parceria termina em 3 dias',
            `Sua parceria termina em ${periodEndFormatted}. Quer continuar? Reative pelo app em Perfil → Assinatura → Gerenciar assinatura.`,
            { partnerName: p.name, periodEndFormatted },
            { screen: 'partnerSubscription' },
          )
          .catch(() => {});
      }
      await this.prisma.partner.update({
        where: { id: p.id },
        data: { subscriptionCancellationReminderPeriodEnd: p.subscriptionCancellationAt },
      });
      count++;
    }
    return count;
  }

  /** Concede selo verificado (USER_VERIFIED) ao usuário se ainda não tiver. Parceiros não fazem KYC. */
  private async grantVerifiedBadgeIfMissing(userId: string): Promise<void> {
    const existing = await this.prisma.verification.findFirst({
      where: { userId, type: 'USER_VERIFIED', status: 'APPROVED' },
    });
    if (!existing) {
      await this.prisma.verification.create({
        data: { userId, type: 'USER_VERIFIED', status: 'APPROVED' },
      });
    }
  }
}
