import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly callbackUrl?: string;
  private readonly client?: OAuth2Client;

  constructor(configService: ConfigService) {
    this.clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.callbackUrl = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (this.clientId && this.clientSecret && this.callbackUrl) {
      this.client = new OAuth2Client(
        this.clientId,
        this.clientSecret,
        this.callbackUrl,
      );
    }
  }

  get enabled(): boolean {
    return !!this.client;
  }

  getAuthUrl(state: string): string {
    if (!this.client) {
      throw new BadRequestException('Google sign-in is not configured.');
    }

    return this.client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });
  }

  async getProfile(code: string): Promise<GoogleProfile> {
    if (!this.client) {
      throw new BadRequestException('Google sign-in is not configured.');
    }

    const { tokens } = await this.client.getToken(code);
    if (!tokens.id_token) {
      throw new BadRequestException('Google did not return an identity token.');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new BadRequestException('Google account email is not verified.');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      picture: payload.picture,
    };
  }
}
