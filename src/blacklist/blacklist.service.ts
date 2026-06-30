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
    if (!email) {
      return false;
    }
    const count = await this.blacklistRepository.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
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
