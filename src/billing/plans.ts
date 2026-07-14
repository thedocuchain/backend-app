import { AccountPlan } from '../common/enums/entities.enum';
import { StripeConfig } from '../configs/stripe.config';

export interface PlanLimits {
  // Number.POSITIVE_INFINITY means unlimited.
  docsPerMonth: number;
  signersPerDoc: number;
  reminders: boolean;
}

export const PLAN_LIMITS: Record<AccountPlan, PlanLimits> = {
  [AccountPlan.FREE]: {
    docsPerMonth: 1,
    signersPerDoc: 2,
    reminders: false,
  },
  [AccountPlan.PRO]: {
    docsPerMonth: 20,
    signersPerDoc: 4,
    reminders: true,
  },
  [AccountPlan.PRO_MAX]: {
    docsPerMonth: Number.POSITIVE_INFINITY,
    signersPerDoc: Number.POSITIVE_INFINITY,
    reminders: true,
  },
};

// Only free is a non-paid plan; the rest map to a Stripe price.
export const PAID_PLANS: AccountPlan[] = [AccountPlan.PRO, AccountPlan.PRO_MAX];

export function priceIdForPlan(
  plan: AccountPlan,
  config: StripeConfig,
): string | null {
  if (plan === AccountPlan.PRO) return config.pricePro || null;
  if (plan === AccountPlan.PRO_MAX) return config.priceProMax || null;
  return null;
}

export function planForPriceId(
  priceId: string,
  config: StripeConfig,
): AccountPlan | null {
  if (priceId && priceId === config.pricePro) return AccountPlan.PRO;
  if (priceId && priceId === config.priceProMax) return AccountPlan.PRO_MAX;
  return null;
}
