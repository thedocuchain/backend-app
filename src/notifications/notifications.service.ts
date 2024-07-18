import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import { IMailgunClient } from 'mailgun.js/Interfaces';
import { getMailgunConfig } from '../configs/mailgun.config';
import { User } from '../database/entities/user.entity';
import { Document } from '../database/entities/document.entity';
import {
  DocumentStatuses,
  NotifyStatuses,
  UserRoles,
} from '../common/enums/entities.enum';
import { generateEmailTemplate } from '../common/utils/email.util';
import { MailgunEvent } from './interfaces/webhook.interface';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadDocumentDto } from '../documents/dto/read-document.dto';

@Injectable()
export class NotificationsService {
  private readonly mg: IMailgunClient;
  private readonly domain: string;
  private readonly emailFrom: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    this.mg = new Mailgun(FormData).client(getMailgunConfig(configService));
    this.domain = configService.get<string>('MAILGUN_DOMAIN');
    this.emailFrom = configService.get<string>('MAILGUN_FROM_EMAIL');
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
        if (file) {
          await this.mg.messages.create(this.domain, {
            from: this.emailFrom,
            to: [user.email],
            'o:tag': [user.id, document.id],
            subject,
            html: template,
            attachment: [
              {
                data: file,
                filename: `${document.name}`.endsWith('.pdf')
                  ? `${document.name}`
                  : `${document.name}.pdf`,
                type: 'application/pdf',
              },
              {
                data: auditLogFile,
                filename: `Certificate of Completion.pdf`,
                type: 'application/pdf',
              },
            ],
          });
        } else if (downloadLink) {
          await this.mg.messages.create(this.domain, {
            from: this.emailFrom,
            to: [user.email],
            'o:tag': [user.id, document.id],
            subject,
            html: template,
            attachment: [
              {
                data: auditLogFile,
                filename: `Certificate of Completion.pdf`,
                type: 'application/pdf',
              },
            ],
          });
        } else {
          await this.mg.messages.create(this.domain, {
            from: this.emailFrom,
            to: [user.email],
            'o:tag': [user.id, document.id],
            subject,
            html: template,
          });
        }
      } catch (error) {
        console.error(`Failed to send email:`, error);
        await this.usersService.update(user.id, {
          notifyStatus: NotifyStatuses.ERROR,
        });
      }
    });

    await Promise.all(sendEmailPromises);
  }

  async handleWebhook(webhookData: MailgunEvent): Promise<void> {
    const timestamp = webhookData['event-data'].timestamp;
    let notifyStatus = NotifyStatuses.DELIVERED;
    const lastNotifyDate = new Date(timestamp * 1000);
    const userId = webhookData['event-data'].tags[0];
    const documentId = webhookData['event-data'].tags[1];

    if (webhookData['event-data'].event === 'failed') {
      notifyStatus = NotifyStatuses.ERROR;
    }
    if (timestamp && userId) {
      await this.usersService.update(userId, { notifyStatus, lastNotifyDate });
      const document = await this.documentRepository.findOneBy({
        id: documentId,
      });
      if (
        document.status === DocumentStatuses.SENT &&
        notifyStatus === NotifyStatuses.DELIVERED
      ) {
        await this.documentRepository.update(
          { id: documentId },
          { status: DocumentStatuses.DELIVERED },
        );
      }
    }
  }
}
