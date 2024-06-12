import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

interface VerifyParams {
  signingKey: string;
  timestamp: string;
  token: string;
  signature: string;
}

const verify = ({
  signingKey,
  timestamp,
  token,
  signature,
}: VerifyParams): boolean => {
  const encodedToken = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp.concat(token))
    .digest('hex');

  return encodedToken === signature;
};

@Injectable()
export class MailgunWebhookGuard implements CanActivate {
  private readonly signingKey: string = process.env.MAILGUN_SIGNING_KEY;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const { timestamp, token, signature } = request.body?.signature;

    if (!timestamp || !token || !signature) {
      throw new UnauthorizedException('Missing Mailgun webhook signature');
    }

    const isValid = verify({
      signingKey: this.signingKey,
      timestamp: timestamp as string,
      token: token as string,
      signature: signature as string,
    });

    if (!isValid) {
      console.error('Invalid Mailgun webhook signature');
      throw new UnauthorizedException('Invalid Mailgun webhook signature');
    }

    return true;
  }
}
