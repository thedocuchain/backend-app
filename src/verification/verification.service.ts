import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { VerificationCode } from '../database/entities/verification-code.entity';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 90 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 4;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
  ) {}

  async issueCode(subjectId: string, email: string): Promise<string> {
    const lowerCasedEmail = email.toLowerCase();
    const now = Date.now();

    const windowStart = new Date(now - RATE_LIMIT_WINDOW_MS);
    const sentInWindow = await this.verificationCodeRepository.count({
      where: { email: lowerCasedEmail, createdAt: MoreThan(windowStart) },
    });
    if (sentInWindow >= MAX_CODES_PER_WINDOW) {
      throw new HttpException('Too many codes', HttpStatus.TOO_MANY_REQUESTS);
    }

    const lastCode = await this.verificationCodeRepository.findOne({
      where: { subjectId },
      order: { createdAt: 'DESC' },
    });
    if (lastCode && now - lastCode.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('Please wait before requesting a new code');
    }

    await this.verificationCodeRepository.update(
      { subjectId, consumedAt: IsNull() },
      { consumedAt: new Date(now) },
    );

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const entry = this.verificationCodeRepository.create({
      subjectId,
      email: lowerCasedEmail,
      code,
      expiresAt: new Date(now + CODE_TTL_MS),
    });
    await this.verificationCodeRepository.save(entry);

    return code;
  }

  async validate(subjectId: string, code: string): Promise<boolean> {
    const now = new Date();
    const entry = await this.verificationCodeRepository.findOne({
      where: {
        subjectId,
        consumedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });

    if (!entry || entry.attempts >= MAX_VERIFY_ATTEMPTS) {
      return false;
    }

    if (entry.code !== code) {
      entry.attempts += 1;
      if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
        entry.consumedAt = now;
      }
      await this.verificationCodeRepository.save(entry);
      return false;
    }

    // Do NOT consume on success: the response can be lost (mobile networks) or
    // the user may double-submit. Keeping the code valid until it expires makes
    // verification idempotent so a retry with the same code still succeeds
    // instead of failing with "Invalid or expired code". It is superseded when a
    // new code is issued (issueCode consumes prior ones) or by its TTL/attempts.
    return true;
  }
}
