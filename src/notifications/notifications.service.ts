import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mailchimpTransactional from '@mailchimp/mailchimp_transactional';

import { getMandrillConfig } from '../configs/mandrill.config';
import { User } from '../database/entities/user.entity';
import { Document } from '../database/entities/document.entity';
import {
  DocumentStatuses,
  NotifyStatuses,
  UserRoles,
} from '../common/enums/entities.enum';
import {
  generateEmailTemplate,
  generateSignReminderEmail,
  generateVerificationCodeEmail,
} from '../common/utils/email.util';
import { MandrillEvent } from './interfaces/webhook.interface';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { UnsubscribeService } from './unsubscribe.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadDocumentDto } from '../documents/dto/read-document.dto';

type MandrillClient = ReturnType<typeof mailchimpTransactional>;

interface MandrillAttachment {
  type: string;
  name: string;
  content: string;
}

const FAILURE_EVENTS: ReadonlyArray<MandrillEvent['event']> = [
  'hard_bounce',
  'soft_bounce',
  'reject',
  'spam',
  'deferred',
];

@Injectable()
export class NotificationsService {
  private readonly mailchimp: MandrillClient;
  private readonly emailFrom: string;
  private readonly emailFromName: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly unsubscribeService: UnsubscribeService,
  ) {
    const cfg = getMandrillConfig(configService);
    this.mailchimp = mailchimpTransactional(cfg.apiKey);
    this.emailFrom = cfg.fromEmail;
    this.emailFromName = cfg.fromName;
  }

  async sendEmail(
    document: ReadDocumentDto,
    user?: User,
    signerName?: string,
    hash?: string,
    file?: Buffer | undefined,
    downloadLink?: string,
    auditLogFile?: Buffer | undefined,
  ): Promise<void> {
    let users = document.users.filter(
      (user) =>
        user.role === UserRoles.SIGNER || user.role === UserRoles.WATCHER,
    );
    if (user) {
      users = [user];
    }

    const sendEmailPromises = users.map(async (user) => {
      try {
        const token = await this.authService.sign(user.id, document.id);
        const { template, subject } = generateEmailTemplate(
          document,
          user,
          token,
          signerName,
          hash,
          downloadLink,
        );

        const attachments = this.buildAttachments(
          document,
          file,
          downloadLink,
          auditLogFile,
        );

        await this.mailchimp.messages.send({
          message: {
            from_email: this.emailFrom,
            from_name: this.emailFromName || undefined,
            to: [{ email: user.email, type: 'to' }],
            subject,
            html: template,
            tags: [user.id, document.id],
            metadata: {
              user_id: user.id,
              document_id: document.id,
            } as any,
            track_opens: false,
            track_clicks: false,
            ...(attachments ? { attachments } : {}),
          },
        });
      } catch (error) {
        console.error(`Failed to send email:`, error);
        await this.usersService.update(user.id, {
          notifyStatus: NotifyStatuses.ERROR,
        });
      }
    });

    await Promise.all(sendEmailPromises);
  }

  async sendSignReminder(
    document: Document,
    initiator: User,
    pendingSigners: User[],
  ): Promise<void> {
    if (await this.unsubscribeService.isUnsubscribed(initiator.email)) return;

    const token = await this.authService.sign(initiator.id, document.id);
    const { subject, template } = generateSignReminderEmail(
      document,
      token,
      pendingSigners,
    );

    await this.mailchimp.messages.send({
      message: {
        from_email: this.emailFrom,
        from_name: this.emailFromName || undefined,
        to: [{ email: initiator.email, type: 'to' }],
        subject,
        html: template,
        tags: [initiator.id, document.id],
        metadata: {
          user_id: initiator.id,
          document_id: document.id,
        } as any,
        track_opens: false,
        track_clicks: false,
      },
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const { subject, template } = generateVerificationCodeEmail(code);

    await this.mailchimp.messages.send({
      message: {
        from_email: this.emailFrom,
        from_name: this.emailFromName || undefined,
        to: [{ email, type: 'to' }],
        subject,
        html: template,
        track_opens: false,
        track_clicks: false,
      },
    });
  }

  private buildAttachments(
    document: ReadDocumentDto,
    file?: Buffer,
    downloadLink?: string,
    auditLogFile?: Buffer,
  ): MandrillAttachment[] | undefined {
    const docName = `${document.name}`.endsWith('.pdf')
      ? `${document.name}`
      : `${document.name}.pdf`;

    if (file) {
      const out: MandrillAttachment[] = [
        {
          type: 'application/pdf',
          name: docName,
          content: file.toString('base64'),
        },
      ];
      if (auditLogFile) {
        out.push({
          type: 'application/pdf',
          name: 'Certificate of Completion.pdf',
          content: auditLogFile.toString('base64'),
        });
      }
      return out;
    }

    if (downloadLink && auditLogFile) {
      return [
        {
          type: 'application/pdf',
          name: 'Certificate of Completion.pdf',
          content: auditLogFile.toString('base64'),
        },
      ];
    }

    return undefined;
  }

  async handleWebhook(events: MandrillEvent[]): Promise<void> {
    if (!Array.isArray(events)) return;
    for (const event of events) {
      await this.handleSingleEvent(event);
    }
  }

  private async handleSingleEvent(event: MandrillEvent): Promise<void> {
    const timestamp = event?.ts;
    if (!timestamp) return;

    const isFailure = FAILURE_EVENTS.includes(event.event);
    const isDelivered = event.event === 'send' || event.event === 'deliver';
    if (!isFailure && !isDelivered) return;

    const userId = event.msg?.metadata?.user_id ?? event.msg?.tags?.[0];
    const documentId = event.msg?.metadata?.document_id ?? event.msg?.tags?.[1];
    if (!userId) return;

    const notifyStatus = isFailure
      ? NotifyStatuses.ERROR
      : NotifyStatuses.DELIVERED;
    const lastNotifyDate = new Date(timestamp * 1000);

    await this.usersService.update(userId, { notifyStatus, lastNotifyDate });

    if (documentId && notifyStatus === NotifyStatuses.DELIVERED) {
      const document = await this.documentRepository.findOneBy({
        id: documentId,
      });
      if (document?.status === DocumentStatuses.SENT) {
        await this.documentRepository.update(
          { id: documentId },
          { status: DocumentStatuses.DELIVERED },
        );
      }
    }
  }
}
