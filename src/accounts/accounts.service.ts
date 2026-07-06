import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from '../database/entities/account.entity';
import { Document } from '../database/entities/document.entity';
import { User } from '../database/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { BlacklistService } from '../blacklist/blacklist.service';
import { DocumentStatuses, UserRoles } from '../common/enums/entities.enum';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { toPublicAccount, PublicAccount } from './account.mapper';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SaveSignatureDto } from './dto/save-signature.dto';

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
  ) {}

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
      ])
      .addSelect(['signatures.id', 'signatures.signed'])
      .orderBy('document.createdAt', 'DESC')
      .getMany();

    return documents
      .map((document) => {
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
        };
      })
      .filter(
        (document) =>
          document.isInitiator || SENT_STATUSES.includes(document.status),
      );
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
  }
}
