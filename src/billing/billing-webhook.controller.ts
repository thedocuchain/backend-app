import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';

import { BillingService } from './billing.service';

// Public endpoint. Authenticity comes from the Stripe signature, verified in
// the service against the raw request body (raw-body parsing is wired for this
// exact path in main.ts, before the global JSON body parser).
@ApiExcludeController()
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billingService.handleWebhook(req.body as Buffer, signature);
    return { received: true };
  }
}
