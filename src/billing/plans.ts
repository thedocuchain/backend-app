import { AccountPlan, BillingInterval } from '../common/enums/entities.enum';
import { StripeConfig } from '../configs/stripe.config';

export interface PlanLimits {
  signersPerDoc: number;
  reminders: boolean;
  aiReview: boolean;
}

export const PLAN_LIMITS: Record<AccountPlan, PlanLimits> = {
  [AccountPlan.FREE]: {
    signersPerDoc: 2,
    reminders: false,
    aiReview: false,
  },
  [AccountPlan.PRO]: {
    signersPerDoc: 4,
    reminders: true,
    aiReview: true,
  },
  [AccountPlan.PRO_MAX]: {
    signersPerDoc: Number.POSITIVE_INFINITY,
    reminders: true,
    aiReview: true,
  },
};

export interface DocQuota {
  // Number.POSITIVE_INFINITY means unlimited.
  limit: number;
  // 'month' counts within the calendar month, 'period' within the current
  // subscription period (used for yearly plans that grant a full-year budget).
  window: 'month' | 'period';
}

// Yearly Pro grants a full-year document budget with no monthly sub-cap; every
// other paid tier is either monthly-metered or unlimited.
export function docQuotaFor(
  plan: AccountPlan,
  interval: BillingInterval | null,
): DocQuota {
  if (plan === AccountPlan.PRO_MAX) {
    return { limit: Number.POSITIVE_INFINITY, window: 'month' };
  }
  if (plan === AccountPlan.PRO) {
    return interval === BillingInterval.YEAR
      ? { limit: 240, window: 'period' }
      : { limit: 20, window: 'month' };
  }
  return { limit: 1, window: 'month' };
}

// Start of the window the quota is counted over.
export function periodWindowStart(
  quota: DocQuota,
  currentPeriodStart: Date | null,
): Date {
  if (quota.window === 'period') {
    return currentPeriodStart ?? new Date(0);
  }
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

// Given the documents that count toward the quota (already filtered to the
// period window and to non-reported), returns the ids that fall beyond the
// limit — i.e. the ones that appeared after the limit was reached, oldest kept.
export function lockedDocIds(
  docs: { id: string; createdAt: Date }[],
  limit: number,
): Set<string> {
  if (!Number.isFinite(limit)) return new Set();
  const locked = new Set<string>();
  [...docs]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .forEach((doc, index) => {
      if (index >= limit) locked.add(doc.id);
    });
  return locked;
}

// Only free is a non-paid plan; the rest map to a Stripe price.
export const PAID_PLANS: AccountPlan[] = [AccountPlan.PRO, AccountPlan.PRO_MAX];

export function priceIdForPlan(
  plan: AccountPlan,
  interval: BillingInterval,
  config: StripeConfig,
): string | null {
  if (plan === AccountPlan.PRO) {
    return (
      (interval === BillingInterval.YEAR
        ? config.priceProYearly
        : config.pricePro) || null
    );
  }
  if (plan === AccountPlan.PRO_MAX) {
    return (
      (interval === BillingInterval.YEAR
        ? config.priceProMaxYearly
        : config.priceProMax) || null
    );
  }
  return null;
}

export function planForPriceId(
  priceId: string,
  config: StripeConfig,
): AccountPlan | null {
  if (!priceId) return null;
  if (priceId === config.pricePro || priceId === config.priceProYearly) {
    return AccountPlan.PRO;
  }
  if (priceId === config.priceProMax || priceId === config.priceProMaxYearly) {
    return AccountPlan.PRO_MAX;
  }
  return null;
}

export function intervalForPriceId(
  priceId: string,
  config: StripeConfig,
): BillingInterval | null {
  if (!priceId) return null;
  if (
    priceId === config.priceProYearly ||
    priceId === config.priceProMaxYearly
  ) {
    return BillingInterval.YEAR;
  }
  if (priceId === config.pricePro || priceId === config.priceProMax) {
    return BillingInterval.MONTH;
  }
  return null;
}
