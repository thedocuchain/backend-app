import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlacklistedEmail } from '../database/entities/blacklisted-email.entity';

@Injectable()
export class BlacklistService {
  constructor(
    @InjectRepository(BlacklistedEmail)
    private readonly blacklistRepository: Repository<BlacklistedEmail>,
  ) {}

  async isBlacklisted(email: string): Promise<boolean> {
    return Boolean(await this.getBlockedAt(email));
  }

  // Returns the moment the email was blacklisted, or null if it is not.
  // Documents created before this moment stay available to the blocked
  // account; everything created after it is hidden from signing/viewing.
  async getBlockedAt(email: string): Promise<Date | null> {
    if (!email) {
      return null;
    }
    const entry = await this.blacklistRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    return entry?.createdAt ?? null;
  }

  async add(
    email: string,
    reason?: string,
    meta?: { reportedByUserId?: string; documentId?: string },
  ): Promise<void> {
    if (!email) {
      return;
    }
    const lowerCasedEmail = email.toLowerCase();
    if (await this.isBlacklisted(lowerCasedEmail)) {
      return;
    }
    const entry = this.blacklistRepository.create({
      email: lowerCasedEmail,
      reason,
      reportedByUserId: meta?.reportedByUserId ?? null,
      documentId: meta?.documentId ?? null,
    });
    await this.blacklistRepository.save(entry);
  }
}
