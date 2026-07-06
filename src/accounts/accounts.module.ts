import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from '../database/entities/account.entity';
import { AccountSession } from '../database/entities/account-session.entity';
import { Document } from '../database/entities/document.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { VerificationModule } from '../verification/verification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecaptchaModule } from '../recaptcha/recaptcha.module';
import { BlacklistModule } from '../blacklist/blacklist.module';
import { AccountsService } from './accounts.service';
import { AccountAuthService } from './account-auth.service';
import { AccountJwtStrategy } from './strategies/account-jwt.strategy';
import { AuthController } from './auth.controller';
import { AccountsController } from './accounts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AccountSession, Document, User]),
    JwtModule,
    AuthModule,
    VerificationModule,
    NotificationsModule,
    RecaptchaModule,
    BlacklistModule,
  ],
  controllers: [AuthController, AccountsController],
  providers: [AccountsService, AccountAuthService, AccountJwtStrategy],
})
export class AccountsModule {}
