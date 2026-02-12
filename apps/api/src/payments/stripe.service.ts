import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly webhookSecret: string | undefined;
  private readonly priceIds: Record<string, string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' });
    }
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
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
