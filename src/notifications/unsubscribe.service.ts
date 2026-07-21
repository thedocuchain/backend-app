import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmailUnsubscribe } from '../database/entities/email-unsubscribe.entity';

@Injectable()
export class UnsubscribeService {
  private readonly logger = new Logger(UnsubscribeService.name);

  constructor(
    @InjectRepository(EmailUnsubscribe)
    private readonly unsubscribeRepository: Repository<EmailUnsubscribe>,
  ) {}

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  async isUnsubscribed(email: string): Promise<boolean> {
    const count = await this.unsubscribeRepository.count({
      where: { email: this.normalize(email) },
    });
    return count > 0;
  }

  async unsubscribe(email: string): Promise<void> {
    const normalized = this.normalize(email);
    const existing = await this.unsubscribeRepository.findOne({
      where: { email: normalized },
    });
    if (existing) return;

    await this.unsubscribeRepository.save(
      this.unsubscribeRepository.create({ email: normalized }),
    );
    this.logger.log(`Unsubscribed ${normalized} from reminder emails`);
  }

  async resubscribe(email: string): Promise<void> {
    await this.unsubscribeRepository.delete({ email: this.normalize(email) });
  }
}
