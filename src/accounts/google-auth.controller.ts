import { Controller, Get, Ip, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AccountAuthService } from './account-auth.service';
import { GoogleAuthService } from './google-auth.service';

const ACCOUNT_TOKEN_COOKIE = 'account-token';
const ACCOUNT_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function safeInternalPath(value?: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/account';
  }
  return value;
}

@ApiTags('auth')
@Controller('auth')
export class GoogleAuthController {
  private readonly clientUrl: string;

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly accountAuthService: AccountAuthService,
    configService: ConfigService,
  ) {
    this.clientUrl = configService.get<string>('CLIENT_APP_REDIRECT_URL') ?? '';
  }

  @Get('google')
  google(@Query('redirect') redirect: string, @Res() res: Response) {
    const state = Buffer.from(safeInternalPath(redirect)).toString('base64url');
    res.redirect(this.googleAuthService.getAuthUrl(state));
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const redirectPath = safeInternalPath(
      state ? Buffer.from(state, 'base64url').toString('utf8') : undefined,
    );

    if (error || !code) {
      res.redirect(`${this.clientUrl}/login?error=google`);
      return;
    }

    try {
      const profile = await this.googleAuthService.getProfile(code);
      const { accessToken } = await this.accountAuthService.loginWithGoogle(
        profile,
        {
          userAgent: req.headers['user-agent'],
          ip,
          country: req.headers['cf-ipcountry'] as string,
        },
      );

      res.cookie(ACCOUNT_TOKEN_COOKIE, accessToken, {
        maxAge: ACCOUNT_TOKEN_MAX_AGE_MS,
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
      res.redirect(`${this.clientUrl}${redirectPath}`);
    } catch {
      res.redirect(`${this.clientUrl}/login?error=google`);
    }
  }
}
