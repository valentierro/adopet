import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  getPartnershipEndedPaidTodayEmailHtml,
  getPartnershipEndedPaidTodayEmailText,
} from '../email/templates/partnership-ended-paid-today.email';
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
   * Retorna datas de cobrança da assinatura do parceiro (último pagamento e próximo vencimento).
   * Usado na tela de gerenciar assinatura do portal do parceiro.
   */
  async getSubscriptionBillingInfo(userId: string): Promise<{ lastPaymentAt: string | null; nextBillingAt: string | null }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!partner || !this.stripe) {
      return { lastPaymentAt: null, nextBillingAt: null };
    }
    await this.ensureSubscriptionSynced(partner);
    const updated = await this.prisma.partner.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true },
    });
    if (!updated?.stripeSubscriptionId) {
      return { lastPaymentAt: null, nextBillingAt: null };
    }
    try {
      const raw = await this.stripe.subscriptions.retrieve(updated.stripeSubscriptionId, {
        expand: ['latest_invoice'],
      });
      // API 2026 types may not expose current_period_end on Subscription; it exists at runtime (or on items[0])
      const periodEnd =
        (raw as { current_period_end?: number }).current_period_end ??
        (raw.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end;
      const nextBillingAt =
        periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null;
      let lastPaymentAt: string | null = null;
      const latestInvoice = raw.latest_invoice;
      if (latestInvoice && typeof latestInvoice === 'object' && latestInvoice.status === 'paid') {
        const inv = latestInvoice as Stripe.Invoice;
        const paidAt = inv.status_transitions?.paid_at ?? inv.created;
        if (paidAt != null) lastPaymentAt = new Date(paidAt * 1000).toISOString();
      }
      return { lastPaymentAt, nextBillingAt };
    } catch {
      return { lastPaymentAt: null, nextBillingAt: null };
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
        await this.prisma.partner.update({
          where: { id: partnerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: 'active',
            planId: planId || null,
            isPaidPartner: true,
            approvedAt: new Date(),
          },
        });
      }
      return;
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;
      const isActive = status === 'active' || status === 'trialing';
      const planId = (subscription.metadata?.planId as string) || undefined;
      const isEnded = event.type === 'customer.subscription.deleted' || status === 'canceled';

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
        await this.prisma.partner.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: status,
            isPaidPartner: isActive,
            ...(planId && { planId }),
          },
        });
      }
    }
  }
}
