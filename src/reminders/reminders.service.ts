import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Not, Repository } from 'typeorm';

import { Document } from '../database/entities/document.entity';
import { Account } from '../database/entities/account.entity';
import { User } from '../database/entities/user.entity';
import {
  AccountPlan,
  DocumentStatuses,
  UserRoles,
} from '../common/enums/entities.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { UnsubscribeService } from '../notifications/unsubscribe.service';
import { BillingService } from '../billing/billing.service';
import { PLAN_LIMITS, docQuotaFor, periodWindowStart } from '../billing/plans';

// Days after sending at which the initiator is reminded about unsigned documents.
const REMINDER_SCHEDULE_DAYS = [3, 7, 14, 30];
const DAY_MS = 24 * 3600 * 1000;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    private readonly billingService: BillingService,
    private readonly notificationsService: NotificationsService,
    private readonly unsubscribeService: UnsubscribeService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async remindInitiators(): Promise<void> {
    const documents = await this.documentRepository.find({
      where: {
        status: In([
          DocumentStatuses.SENT,
          DocumentStatuses.DELIVERED,
          DocumentStatuses.PARTIALLY_SIGNED,
        ]),
        sentAt: Not(IsNull()),
        remindersSent: LessThan(REMINDER_SCHEDULE_DAYS.length),
      },
      relations: { users: { signatures: true } },
    });

    for (const document of documents) {
      // Reminders are a paid perk for account-owned documents. Anonymous and
      // legacy documents (no accountId) keep the original behaviour.
      if (this.billingService.enabled && document.accountId) {
        const account = await this.accountRepository.findOne({
          where: { id: document.accountId },
        });
        if (
          account &&
          !PLAN_LIMITS[account.plan ?? AccountPlan.FREE].reminders
        ) {
          continue;
        }
      }

      const daysSinceSent = (Date.now() - document.sentAt.getTime()) / DAY_MS;
      const dueStage = REMINDER_SCHEDULE_DAYS.filter(
        (days) => daysSinceSent >= days,
      ).length;

      if (dueStage <= document.remindersSent) continue;

      const initiator = document.users.find((user) => user.isInitiator);
      const pendingSigners = document.users.filter(
        (user) =>
          user.role === UserRoles.SIGNER &&
          !user.signatures?.some((signature) => signature.signed),
      );

      if (!initiator || pendingSigners.length === 0) continue;
      if (await this.unsubscribeService.isUnsubscribed(initiator.email)) {
        continue;
      }

      // If every pending signer is locked out of the document by their own plan
      // limit, it just sits in their cabinet until they upgrade — no point
      // reminding the initiator about signatures that can't happen yet.
      if (this.billingService.enabled) {
        const signerLocks = await Promise.all(
          pendingSigners.map((signer) => this.isLockedForSigner(signer, document)),
        );
        if (signerLocks.every(Boolean)) continue;
      }

      // Mark the stage first so a failing document is retried at the next
      // stage instead of on every run.
      await this.documentRepository.update(
        { id: document.id },
        { remindersSent: dueStage },
      );

      try {
        await this.notificationsService.sendSignReminder(
          document,
          initiator,
          pendingSigners,
        );
        this.logger.log(
          `Reminded ${initiator.email} about document ${document.id} (day ${REMINDER_SCHEDULE_DAYS[dueStage - 1]})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to remind about document ${document.id}: ${error.message}`,
        );
      }
    }
  }

  // A signer with no account has no plan limit, so is never locked; otherwise
  // defer to the account-level check.
  private async isLockedForSigner(
    signer: User,
    document: Document,
  ): Promise<boolean> {
    const account = await this.accountRepository
      .createQueryBuilder('account')
      .where('LOWER(account.email) = :email', {
        email: signer.email.toLowerCase(),
      })
      .getOne();
    if (!account) return false;
    return this.isLockedForAccount(account, document);
  }

  // A document is locked when it falls beyond the account's per-period quota —
  // i.e. more non-reported cabinet documents in the period are at least as old.
  private async isLockedForAccount(
    account: Account,
    document: Document,
  ): Promise<boolean> {
    const quota = docQuotaFor(account.plan ?? AccountPlan.FREE, account.billingInterval);
    if (!Number.isFinite(quota.limit)) return false;

    const windowStart = periodWindowStart(quota, account.currentPeriodStart);
    if (document.createdAt < windowStart) return false;

    const rank = await this.documentRepository
      .createQueryBuilder('document')
      .innerJoin(
        'document.users',
        'me',
        'LOWER(me.email) = :email AND me.reportedAt IS NULL',
        { email: account.email.toLowerCase() },
      )
      .where('document.createdAt >= :windowStart', { windowStart })
      .andWhere('document.createdAt <= :until', { until: document.createdAt })
      .getCount();

    return rank > quota.limit;
  }
}
