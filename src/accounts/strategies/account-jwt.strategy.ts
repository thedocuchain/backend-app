import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountAuthService } from '../account-auth.service';
import { AccountJwtPayload } from '../interfaces/account-token.interface';

@Injectable()
export class AccountJwtStrategy extends PassportStrategy(
  Strategy,
  'account-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly accountAuthService: AccountAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccountJwtPayload) {
    return this.accountAuthService.validateSession(payload);
  }
}
