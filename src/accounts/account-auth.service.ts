import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Account } from '../database/entities/account.entity';
import { AccountSession } from '../database/entities/account-session.entity';
import { VerificationService } from '../verification/verification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { toPublicAccount, PublicAccount } from './account.mapper';
import { AccountJwtPayload } from './interfaces/account-token.interface';
import { RegisterAccountDto } from './dto/register-account.dto';
import { LoginAccountDto } from './dto/login-account.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const TOKEN_TTL = '30d';
const LAST_ACTIVE_UPDATE_INTERVAL_MS = 10 * 60 * 1000;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
  country?: string;
}

export interface AuthResult {
  accessToken: string;
  account: PublicAccount;
}

@Injectable()
export class AccountAuthService {
  private readonly secret: string | undefined;

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(AccountSession)
    private readonly sessionRepository: Repository<AccountSession>,
    private readonly jwtService: JwtService,
    private readonly verificationService: VerificationService,
    private readonly notificationsService: NotificationsService,
    private readonly recaptchaService: RecaptchaService,
    configService: ConfigService,
  ) {
    this.secret = configService.get<string>('JWT_SECRET');
  }

  async register(registerAccountDto: RegisterAccountDto): Promise<void> {
    await this.checkRecaptcha(registerAccountDto.recaptchaToken);

    const email = registerAccountDto.email.toLowerCase();
    const existing = await this.accountRepository.findOneBy({ email });
    if (existing?.emailVerifiedAt) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const passwordHash = await hashPassword(registerAccountDto.password);
    const account = await this.accountRepository.save(
      existing
        ? { ...existing, name: registerAccountDto.name, passwordHash }
        : this.accountRepository.create({
            email,
            name: registerAccountDto.name,
            passwordHash,
          }),
    );

    await this.sendCode(account);
  }

  async resendCode(email: string): Promise<void> {
    const account = await this.accountRepository.findOneBy({
      email: email.toLowerCase(),
    });
    if (!account || account.emailVerifiedAt) {
      throw new BadRequestException('Nothing to verify for this email.');
    }

    await this.sendCode(account);
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    const account = await this.accountRepository.findOneBy({
      email: verifyEmailDto.email.toLowerCase(),
    });
    if (!account) {
      throw new BadRequestException('Invalid or expired code.');
    }

    const isValid = await this.verificationService.validate(
      account.id,
      verifyEmailDto.code,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid or expired code.');
    }

    if (!account.emailVerifiedAt) {
      account.emailVerifiedAt = new Date();
      await this.accountRepository.save(account);
    }

    return this.createSession(account, meta);
  }

  async login(
    loginAccountDto: LoginAccountDto,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    await this.checkRecaptcha(loginAccountDto.recaptchaToken);

    const account = await this.accountRepository.findOneBy({
      email: loginAccountDto.email.toLowerCase(),
    });
    const isValidPassword =
      account &&
      (await verifyPassword(loginAccountDto.password, account.passwordHash));
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!account.emailVerifiedAt) {
      try {
        await this.sendCode(account);
      } catch {
        // Rate limited — the user still has a valid code in their inbox.
      }
      throw new HttpException('Email is not verified.', HttpStatus.FORBIDDEN);
    }

    return this.createSession(account, meta);
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, { revokedAt: new Date() });
  }

  async validateSession(
    payload: AccountJwtPayload,
  ): Promise<{ account: Account; sessionId: string }> {
    if (!payload?.accountId || !payload?.sessionId) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findOne({
      where: { id: payload.sessionId },
      relations: { account: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.account?.id !== payload.accountId
    ) {
      throw new UnauthorizedException();
    }

    const now = Date.now();
    if (
      now - session.lastActiveAt.getTime() >
      LAST_ACTIVE_UPDATE_INTERVAL_MS
    ) {
      await this.sessionRepository.update(session.id, {
        lastActiveAt: new Date(now),
      });
    }

    return { account: session.account, sessionId: session.id };
  }

  async listSessions(accountId: string, currentSessionId: string) {
    const sessions = await this.sessionRepository.find({
      where: { account: { id: accountId }, revokedAt: IsNull() },
      order: { lastActiveAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ip: session.ip,
      country: session.country,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session.id === currentSessionId,
    }));
  }

  async revokeSession(accountId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, account: { id: accountId }, revokedAt: IsNull() },
    });
    if (!session) {
      throw new NotFoundException('Session is not found.');
    }

    await this.sessionRepository.update(session.id, {
      revokedAt: new Date(),
    });
  }

  async sendPasswordResetCode(account: Account): Promise<void> {
    const code = await this.verificationService.issueCode(
      `reset:${account.id}`,
      account.email,
    );
    await this.notificationsService.sendVerificationCode(account.email, code);
  }

  async resetPassword(
    account: Account,
    sessionId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    const isValid = await this.verificationService.validate(
      `reset:${account.id}`,
      resetPasswordDto.code,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid or expired code.');
    }

    account.passwordHash = await hashPassword(resetPasswordDto.password);
    await this.accountRepository.save(account);
    await this.revokeOtherSessions(account.id, sessionId);
  }

  async revokeOtherSessions(
    accountId: string,
    currentSessionId: string,
  ): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(AccountSession)
      .set({ revokedAt: new Date() })
      .where(
        '"accountId" = :accountId AND id != :currentSessionId AND "revokedAt" IS NULL',
        { accountId, currentSessionId },
      )
      .execute();
  }

  private async createSession(
    account: Account,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        account,
        userAgent: meta.userAgent ?? null,
        ip: meta.ip ?? null,
        country: meta.country ?? null,
        lastActiveAt: new Date(),
      }),
    );

    const accessToken = await this.jwtService.signAsync(
      { accountId: account.id, sessionId: session.id },
      { secret: this.secret, expiresIn: TOKEN_TTL },
    );

    return { accessToken, account: toPublicAccount(account) };
  }

  private async sendCode(account: Account): Promise<void> {
    const code = await this.verificationService.issueCode(
      account.id,
      account.email,
    );
    await this.notificationsService.sendVerificationCode(account.email, code);
  }

  private async checkRecaptcha(recaptchaToken: string): Promise<void> {
    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }
  }
}
