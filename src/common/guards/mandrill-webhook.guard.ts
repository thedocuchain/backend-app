import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class MandrillWebhookGuard implements CanActivate {
  private readonly webhookKey: string = process.env.MANDRILL_WEBHOOK_KEY;
  private readonly webhookUrl: string = process.env.MANDRILL_WEBHOOK_URL;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const body = request.body || {};

    if (!body.mandrill_events) {
      return true;
    }

    // Mandrill probes the URL during webhook creation with an empty events
    // array. The signing key is generated on save, so probes can't be
    // verified. Empty arrays carry no work for us, so accepting them is safe.
    try {
      const parsed = JSON.parse(body.mandrill_events);
      if (Array.isArray(parsed) && parsed.length === 0) {
        return true;
      }
    } catch {
      // fall through to signature check
    }

    const signature = request.header('x-mandrill-signature');
    if (!signature || !this.webhookKey || !this.webhookUrl) {
      console.warn(
        `Mandrill webhook missing signature/config. ua=${request.header('user-agent')} body[0..200]=${String(body.mandrill_events).slice(0, 200)}`,
      );
      throw new UnauthorizedException(
        'Missing Mandrill webhook signature or config',
      );
    }

    const keys = Object.keys(body).sort();
    let signedData = this.webhookUrl;
    for (const key of keys) {
      const value = body[key];
      signedData += key + (typeof value === 'string' ? value : JSON.stringify(value));
    }

    const computed = crypto
      .createHmac('sha1', this.webhookKey)
      .update(signedData, 'utf8')
      .digest('base64');

    const expected = Buffer.from(computed);
    const provided = Buffer.from(signature);
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      console.error(
        `Invalid Mandrill webhook signature. ua=${request.header('user-agent')} body[0..200]=${String(body.mandrill_events).slice(0, 200)}`,
      );
      throw new UnauthorizedException('Invalid Mandrill webhook signature');
    }
    return true;
  }
}
