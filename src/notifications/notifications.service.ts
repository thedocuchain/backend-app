import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import { IMailgunClient } from 'mailgun.js/Interfaces';
import { getMailgunConfig } from '../configs/mailgun.config';
import { User } from '../database/entities/user.entity';
import { Document } from '../database/entities/document.entity';
import { NotifyStatuses, UserRoles } from '../common/enums/entities.enum';
import { generateEmailTemplate } from '../common/utils/email.util';
import { MailgunEvent } from './interfaces/webhook.interface';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class NotificationsService {
  private readonly mg: IMailgunClient;
  private readonly domain: string;
  private readonly emailFrom: string;

  constructor(
    private configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    this.mg = new Mailgun(FormData).client(getMailgunConfig(configService));
    this.domain = configService.get<string>('MAILGUN_DOMAIN');
    this.emailFrom = configService.get<string>('MAILGUN_FROM_EMAIL');
  }

  async sendEmail(
    document: Document,
    imageLink: string,
    user?: User,
    signerName?: string,
  ): Promise<void> {
    let users = document.users.filter(
      (user) =>
        user.role === UserRoles.SIGNER || user.role === UserRoles.WATCHER,
    );
    if (user) {
      users = [user];
    }

    const sendEmailPromises = users.map(async (user) => {
      const token = await this.authService.sign(user.id, document.id);
      const { template, subject } = generateEmailTemplate(
        document,
        user,
        imageLink,
        token,
        signerName,
      );
      return this.mg.messages.create(this.domain, {
        from: this.emailFrom,
        to: [user.email],
        'o:tag': user.id,
        subject,
        html: template,
      });
    });

    await Promise.all(sendEmailPromises);
  }

  async handleWebhook(webhookData: MailgunEvent): Promise<void> {
    const timestamp = webhookData['event-data'].timestamp;
    const notifyStatus = NotifyStatuses.DELIVERED;
    const lastNotifyDate = new Date(timestamp * 1000);
    const userId = webhookData['event-data'].tags[0];
    if (timestamp && userId) {
      await this.usersService.update(userId, { notifyStatus, lastNotifyDate });
    }
  }
}
