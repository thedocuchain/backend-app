import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Account } from '../database/entities/account.entity';
import { Document } from '../database/entities/document.entity';
import { User } from '../database/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { BlacklistService } from '../blacklist/blacklist.service';
import { FeedbacksService } from '../feedbacks/feedbacks.service';
import { UnsubscribeService } from '../notifications/unsubscribe.service';
import { DocumentStatuses, UserRoles } from '../common/enums/entities.enum';
import { BillingService } from '../billing/billing.service';
import {
  docQuotaFor,
  periodWindowStart,
  lockedDocIds,
} from '../billing/plans';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { toPublicAccount, PublicAccount } from './account.mapper';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';
import { SupportTicketDto } from './dto/support-ticket.dto';

const SENT_STATUSES: string[] = [
  DocumentStatuses.SENT,
  DocumentStatuses.DELIVERED,
  DocumentStatuses.PARTIALLY_SIGNED,
  DocumentStatuses.SIGNED,
  DocumentStatuses.COMPLETED,
  DocumentStatuses.BLOCKCHAINED,
];

const AWAITING_SIGN_STATUSES: string[] = [
  DocumentStatuses.SENT,
  DocumentStatuses.DELIVERED,
  DocumentStatuses.PARTIALLY_SIGNED,
];

export interface AccountDocument {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  isInitiator: boolean;
  signedByMe: boolean;
  needsMySign: boolean;
  isNew: boolean;
  locked: boolean;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authService: AuthService,
    private readonly blacklistService: BlacklistService,
    private readonly feedbacksService: FeedbacksService,
    private readonly unsubscribeService: UnsubscribeService,
    private readonly billingService: BillingService,
  ) {}

  async getReminderSubscription(
    account: Account,
  ): Promise<{ unsubscribed: boolean }> {
    return {
      unsubscribed: await this.unsubscribeService.isUnsubscribed(account.email),
    };
  }

  async unsubscribeReminders(account: Account): Promise<void> {
    await this.unsubscribeService.unsubscribe(account.email);
  }

  async resubscribeReminders(account: Account): Promise<void> {
    await this.unsubscribeService.resubscribe(account.email);
  }

  async updateProfile(
    account: Account,
    updateAccountDto: UpdateAccountDto,
  ): Promise<PublicAccount> {
    if (updateAccountDto.name !== undefined) {
      account.name = updateAccountDto.name;
    }
    if (updateAccountDto.avatarImage !== undefined) {
      account.avatarImage = updateAccountDto.avatarImage;
    }

    return toPublicAccount(await this.accountRepository.save(account));
  }

  async updatePassword(
    account: Account,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const isValid = await verifyPassword(
      updatePasswordDto.currentPassword,
      account.passwordHash,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    account.passwordHash = await hashPassword(updatePasswordDto.password);
    await this.accountRepository.save(account);
  }

  async saveSignature(
    account: Account,
    saveSignatureDto: SaveSignatureDto,
  ): Promise<PublicAccount> {
    if (saveSignatureDto.signImage) {
      account.signImage = saveSignatureDto.signImage;
      account.signFont = null;
    } else if (saveSignatureDto.signFont) {
      account.signFont = saveSignatureDto.signFont;
      account.signImage = null;
    } else {
      throw new BadRequestException('Provide signImage or signFont.');
    }

    return toPublicAccount(await this.accountRepository.save(account));
  }

  async sendSupportTicket(
    account: Account,
    supportTicketDto: SupportTicketDto,
  ): Promise<void> {
    await this.feedbacksService.record(
      account.name,
      account.email,
      `[Support] ${supportTicketDto.title}\n${supportTicketDto.text}`,
    );
  }

  async listDocuments(account: Account): Promise<AccountDocument[]> {
    const email = account.email.toLowerCase();

    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .innerJoin('document.users', 'me', 'LOWER(me.email) = :email', { email })
      .leftJoin('document.users', 'users')
      .leftJoin('users.signatures', 'signatures')
      .addSelect([
        'users.id',
        'users.email',
        'users.role',
        'users.isInitiator',
        'users.seenAt',
        'users.reportedAt',
      ])
      .addSelect(['signatures.id', 'signatures.signed'])
      .orderBy('document.createdAt', 'DESC')
      .getMany();

    // A document the account reported no longer counts against its quota, and
    // drops out of its list.
    const visible = documents.filter((document) => {
      const mine = document.users.filter(
        (user) => user.email.toLowerCase() === email,
      );
      const reportedByMe = mine.some((user) => user.reportedAt);
      const isInitiator = mine.some((user) => user.isInitiator);
      const kept = isInitiator || SENT_STATUSES.includes(document.status);
      return kept && !reportedByMe;
    });

    // Documents beyond the plan's per-period allowance are locked: still listed,
    // but not openable until the account frees a slot or upgrades.
    const quota = docQuotaFor(account.plan, account.billingInterval);
    let locked = new Set<string>();
    if (this.billingService.enabled) {
      const windowStart = periodWindowStart(quota, account.currentPeriodStart);
      const inWindow = visible
        .filter((document) => document.createdAt >= windowStart)
        .map((document) => ({
          id: document.id,
          createdAt: document.createdAt,
        }));
      locked = lockedDocIds(inWindow, quota.limit);
    }

    return visible.map((document) => {
      const mine = document.users.filter(
        (user) => user.email.toLowerCase() === email,
      );
      const isInitiator = mine.some((user) => user.isInitiator);
      const signedByMe = mine.some((user) =>
        user.signatures?.some((signature) => signature.signed),
      );
      const needsMySign =
        !signedByMe &&
        mine.some((user) => user.role === UserRoles.SIGNER) &&
        AWAITING_SIGN_STATUSES.includes(document.status);
      const isNew =
        !isInitiator && !signedByMe && mine.every((user) => !user.seenAt);

      return {
        id: document.id,
        name: document.name,
        status: document.status,
        createdAt: document.createdAt,
        isInitiator,
        signedByMe,
        needsMySign,
        isNew,
        locked: locked.has(document.id),
      };
    });
  }

  async markDocumentSeen(account: Account, documentId: string): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ seenAt: new Date() })
      .where(
        '"documentId" = :documentId AND LOWER(email) = :email AND "seenAt" IS NULL',
        { documentId, email: account.email.toLowerCase() },
      )
      .execute();
  }

  async getSignLink(
    account: Account,
    documentId: string,
  ): Promise<{ userId: string; token: string; expiredAt: number }> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { users: true },
    });
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    const email = account.email.toLowerCase();
    const signer = document.users.find(
      (user) =>
        user.email.toLowerCase() === email && user.role === UserRoles.SIGNER,
    );
    if (!signer) {
      throw new ForbiddenException('You are not a signer of this document.');
    }

    const listed = await this.listDocuments(account);
    if (listed.find((item) => item.id === document.id)?.locked) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_LOCKED',
        message: 'Please upgrade your plan to open this document.',
      });
    }

    const token = await this.authService.sign(signer.id, document.id);

    return {
      userId: signer.id,
      token,
      expiredAt: Date.now() + 2 * 24 * 3600 * 1000,
    };
  }

  async reportDocument(account: Account, documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { users: true },
    });
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    const email = account.email.toLowerCase();
    const mine = document.users.filter(
      (user) => user.email.toLowerCase() === email && !user.isInitiator,
    );
    if (!mine.length) {
      throw new ForbiddenException(
        'Only recipients of the document can report it.',
      );
    }

    const initiator = document.users.find((user) => user.isInitiator);
    if (!initiator) {
      throw new BadRequestException('Initiator is not found.');
    }

    await this.blacklistService.add(initiator.email, 'reported from account', {
      reportedByUserId: mine[0].id,
      documentId: document.id,
    });

    // Drop the reported document from this account's list and quota count.
    await this.userRepository.update(
      { id: In(mine.map((user) => user.id)) },
      { reportedAt: new Date() },
    );
  }
}
