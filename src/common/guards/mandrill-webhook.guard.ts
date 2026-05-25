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

    // Mandrill's dashboard probes the URL with an empty POST when saving a
    // new webhook entry. The signing key is generated on save, so the probe
    // is unsigned. Allow any request that carries no event payload through.
    if (!body.mandrill_events) {
      return true;
    }

    const signature = request.header('x-mandrill-signature');
    if (!signature || !this.webhookKey || !this.webhookUrl) {
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
      console.error('Invalid Mandrill webhook signature');
      throw new UnauthorizedException('Invalid Mandrill webhook signature');
    }
    return true;
  }
}
