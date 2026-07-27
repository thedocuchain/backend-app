import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { Account } from '../database/entities/account.entity';
import { AccountPlan, BillingInterval } from '../common/enums/entities.enum';
import {
  getStripeConfig,
  isBillingEnabled,
  StripeConfig,
} from '../configs/stripe.config';
import {
  planForPriceId,
  priceIdForPlan,
  intervalForPriceId,
  PAID_PLANS,
  PLAN_LIMITS,
} from './plans';

// Stripe statuses that grant plan access. past_due keeps access during the
// dunning grace period; everything else falls back to the free plan.
const GRANTING_STATUSES = ['active', 'trialing', 'past_due'];

export interface BillingStatus {
  billingEnabled: boolean;
  plan: AccountPlan;
  interval: BillingInterval;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  aiReview: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly config: StripeConfig;
  private stripeClient: Stripe | null = null;

  constructor(
    configService: ConfigService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {
    this.config = getStripeConfig(configService);
  }

  get enabled(): boolean {
    return isBillingEnabled(this.config);
  }

  private stripe(): Stripe {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(this.config.secretKey);
    }
    return this.stripeClient;
  }

  getStatus(account: Account): BillingStatus {
    const plan = account.plan ?? AccountPlan.FREE;

    return {
      billingEnabled: this.enabled,
      plan,
      interval: account.billingInterval ?? BillingInterval.MONTH,
      subscriptionStatus: account.subscriptionStatus ?? null,
      currentPeriodEnd: account.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: account.cancelAtPeriodEnd ?? false,
      // Dormant until Stripe is configured.
      aiReview: !this.enabled || PLAN_LIMITS[plan].aiReview,
    };
  }

  private async ensureCustomer(account: Account): Promise<string> {
    if (account.stripeCustomerId) return account.stripeCustomerId;

    const customer = await this.stripe().customers.create({
      email: account.email,
      name: account.name,
      metadata: { accountId: account.id },
    });

    account.stripeCustomerId = customer.id;
    await this.accountRepository.update(account.id, {
      stripeCustomerId: customer.id,
    });
    return customer.id;
  }

  private hasActiveSubscription(account: Account): boolean {
    return (
      !!account.stripeSubscriptionId &&
      GRANTING_STATUSES.includes(account.subscriptionStatus ?? '')
    );
  }

  async createCheckoutSession(
    account: Account,
    plan: AccountPlan,
    interval: BillingInterval = BillingInterval.MONTH,
  ): Promise<string> {
    if (!PAID_PLANS.includes(plan)) {
      throw new BadRequestException('Not a purchasable plan');
    }
    // Changing an existing subscription (upgrade/downgrade/cancel) must go
    // through the portal so Stripe prorates, instead of stacking a second
    // subscription onto the same customer.
    if (this.hasActiveSubscription(account)) {
      throw new ConflictException(
        'You already have an active subscription. Manage it from the billing portal.',
      );
    }

    const priceId = priceIdForPlan(plan, interval, this.config);
    if (!priceId) {
      throw new ServiceUnavailableException('Plan price is not configured');
    }

    const customerId = await this.ensureCustomer(account);

    const session = await this.stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: account.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: this.config.checkoutSuccessUrl,
      cancel_url: this.config.checkoutCancelUrl,
      subscription_data: { metadata: { accountId: account.id } },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Could not start checkout');
    }
    return session.url;
  }

  async createPortalSession(account: Account): Promise<string> {
    if (!account.stripeCustomerId) {
      throw new BadRequestException('No billing account yet');
    }
    const session = await this.stripe().billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: this.config.portalReturnUrl,
    });
    return session.url;
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(`Webhook signature error: ${error.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.linkCustomerFromSession(session);
        if (typeof session.subscription === 'string') {
          await this.syncSubscriptionById(session.subscription);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Re-fetch live so out-of-order webhook delivery can't apply stale state.
        const sub = event.data.object as Stripe.Subscription;
        await this.syncSubscriptionById(sub.id);
        break;
      }
      case 'customer.subscription.deleted': {
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  }

  private async linkCustomerFromSession(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const accountId = session.client_reference_id;
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    if (!accountId || !customerId) return;

    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });
    if (account && !account.stripeCustomerId) {
      await this.accountRepository.update(account.id, {
        stripeCustomerId: customerId,
      });
    }
  }

  private async syncSubscriptionById(subscriptionId: string): Promise<void> {
    const subscription =
      await this.stripe().subscriptions.retrieve(subscriptionId);
    await this.syncSubscription(subscription);
  }

  private async resolveAccount(
    subscription: Stripe.Subscription,
  ): Promise<Account | null> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (customerId) {
      const byCustomer = await this.accountRepository.findOne({
        where: { stripeCustomerId: customerId },
      });
      if (byCustomer) return byCustomer;
    }

    const accountId = subscription.metadata?.accountId;
    if (accountId) {
      const byId = await this.accountRepository.findOne({
        where: { id: accountId },
      });
      if (byId && customerId && !byId.stripeCustomerId) {
        byId.stripeCustomerId = customerId;
        await this.accountRepository.update(byId.id, {
          stripeCustomerId: customerId,
        });
      }
      return byId;
    }

    return null;
  }

  private subscriptionPriceId(sub: Stripe.Subscription): string | null {
    return sub.items?.data?.[0]?.price?.id ?? null;
  }

  private subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
    const item = sub.items?.data?.[0] as { current_period_end?: number };
    const timestamp =
      item?.current_period_end ??
      (sub as unknown as { current_period_end?: number }).current_period_end;
    return timestamp ? new Date(timestamp * 1000) : null;
  }

  private subscriptionPeriodStart(sub: Stripe.Subscription): Date | null {
    const item = sub.items?.data?.[0] as { current_period_start?: number };
    const timestamp =
      item?.current_period_start ??
      (sub as unknown as { current_period_start?: number }).current_period_start;
    return timestamp ? new Date(timestamp * 1000) : null;
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const account = await this.resolveAccount(subscription);
    if (!account) {
      this.logger.warn(
        `No account for subscription ${subscription.id} (customer ${String(
          subscription.customer,
        )})`,
      );
      return;
    }

    const priceId = this.subscriptionPriceId(subscription) ?? '';
    const plan = planForPriceId(priceId, this.config);
    const interval = intervalForPriceId(priceId, this.config);
    const granting =
      GRANTING_STATUSES.includes(subscription.status) && plan !== null;

    if (granting) {
      await this.accountRepository.update(account.id, {
        plan,
        billingInterval: interval ?? BillingInterval.MONTH,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        currentPeriodStart: this.subscriptionPeriodStart(subscription),
        currentPeriodEnd: this.subscriptionPeriodEnd(subscription),
      });
    } else {
      await this.accountRepository.update(account.id, {
        plan: AccountPlan.FREE,
        billingInterval: null,
        stripeSubscriptionId: null,
        subscriptionStatus: subscription.status,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      });
    }
  }
}
