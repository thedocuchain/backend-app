import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Not, Repository } from 'typeorm';

import { Document } from '../database/entities/document.entity';
import { DocumentStatuses, UserRoles } from '../common/enums/entities.enum';
import { NotificationsService } from '../notifications/notifications.service';

// Days after sending at which the initiator is reminded about unsigned documents.
const REMINDER_SCHEDULE_DAYS = [3, 7, 14, 30];
const DAY_MS = 24 * 3600 * 1000;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly notificationsService: NotificationsService,
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
      const daysSinceSent = (Date.now() - document.sentAt.getTime()) / DAY_MS;
      const dueStage = REMINDER_SCHEDULE_DAYS.filter(
        (days) => daysSinceSent >= days,
      ).length;

      if (dueStage <= document.remindersSent) continue;

      // Mark the stage first so a failing document is retried at the next
      // stage instead of on every run.
      await this.documentRepository.update(
        { id: document.id },
        { remindersSent: dueStage },
      );

      const initiator = document.users.find((user) => user.isInitiator);
      const pendingSigners = document.users.filter(
        (user) =>
          user.role === UserRoles.SIGNER &&
          !user.signatures?.some((signature) => signature.signed),
      );

      if (!initiator || pendingSigners.length === 0) continue;

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
}
