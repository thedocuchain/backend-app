import { ConfigService } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  pricePro: string;
  priceProMax: string;
  portalReturnUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
}

export const getStripeConfig = (configService: ConfigService): StripeConfig => {
  const appUrl = (
    configService.get<string>('CLIENT_APP_REDIRECT_URL') || ''
  ).replace(/\/$/, '');

  return {
    secretKey: configService.get<string>('STRIPE_SECRET_KEY') || '',
    webhookSecret: configService.get<string>('STRIPE_WEBHOOK_SECRET') || '',
    pricePro: configService.get<string>('STRIPE_PRICE_PRO') || '',
    priceProMax: configService.get<string>('STRIPE_PRICE_PRO_MAX') || '',
    portalReturnUrl:
      configService.get<string>('STRIPE_PORTAL_RETURN_URL') ||
      `${appUrl}/account/billing`,
    checkoutSuccessUrl: `${appUrl}/account/billing?checkout=success`,
    checkoutCancelUrl: `${appUrl}/account/billing?checkout=cancel`,
  };
};

// Billing features stay fully dormant until Stripe is configured. This gates
// both the API endpoints and plan-limit enforcement, so shipping the code
// without keys is a safe no-op.
export const isBillingEnabled = (config: StripeConfig): boolean =>
  Boolean(
    config.secretKey &&
      config.webhookSecret &&
      config.pricePro &&
      config.priceProMax,
  );
