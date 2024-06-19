import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { hash } from 'typeorm/util/StringUtils';
import { v4 as uuidV4 } from 'uuid';
import * as crypto from 'crypto';
import * as stream from 'node:stream';
import * as base32 from 'hi-base32';

import { Document } from '../database/entities/document.entity';
import { FileStorageService } from '../file-storage/file-storage.service';
import { PdfService } from '../pdf/pdf.service';
import { SignaturesService } from '../signatures/signatures.service';
import { NotificationsService } from '../notifications/notifications.service';

import { UploadDocumentDto } from './dto/upload-document.dto';
import { DownloadDocumentDto } from './dto/download-document.dto';
import { UsersService } from '../users/users.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { ReadDocumentDto } from './dto/read-document.dto';
import {
  DocumentStatuses,
  FileLinkTypes,
  NotifyStatuses,
  UserRoles,
} from '../common/enums/entities.enum';
import { IDocumentWithInitials } from '../pdf/interfaces/pdf.interface';
import { FindDocumentDto } from './dto/find-document.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../database/entities/user.entity';
import { Signature } from '../database/entities/signature.entity';
import { FileStorage } from '../file-storage/entities/file-storage.entity';
import { SubscribeDocumentDto } from './dto/subscribe-document.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly fileStorageService: FileStorageService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    private readonly signaturesService: SignaturesService,
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
  ) {}
  public async create(file: Express.Multer.File): Promise<UploadDocumentDto> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    const filePath = uuidV4();
    const imagePath = `${filePath}.png`;
    const fileName =
      Buffer.from(file?.originalname, 'latin1').toString('utf8') ?? filePath;
    const fileType = file?.mimetype ?? 'application/pdf';
    const imageType = 'image/png';

    await this.fileStorageService.save(filePath, file.buffer, [
      { filePath, contentType: file.mimetype },
    ]);

    const imageBuffer = await this.pdfService.convertPdfToPng(file.buffer);
    await this.fileStorageService.save(imagePath, imageBuffer, [
      { filePath: imagePath, contentType: imageType },
    ]);

    const document = this.documentRepository.create({
      name: fileName,
      type: fileType,
      fileStorageId: filePath,
      imageStorageId: imagePath,
      status: DocumentStatuses.UPLOADED,
      checkSum: hash(`${fileName}${fileType}${filePath}`),
    });

    const newDoc = await this.documentRepository.save(document);

    if (!newDoc || !newDoc?.id) {
      throw new BadRequestException('Document is not created.');
    }
    const shortDocumentId = await this.generateShortDocumentId(newDoc.id);
    await this.documentRepository.update(newDoc.id, {
      shortId: shortDocumentId,
    });
    const clientUrl = this.configService.get('CLIENT_APP_REDIRECT_URL');

    return {
      redirectUrl: `${clientUrl}/doc/${newDoc.id}`,
    };
  }

  public async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<void> {
    const documentName = updateDocumentDto.name;
    const users = updateDocumentDto?.users;
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.users', 'user')
      .where('document.id = :id', { id })
      .getOne();

    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    const existingUsers = document.users.filter((user) => {
      return users.some(
        (newUser) => newUser.email === user.email && newUser.role === user.role,
      );
    });

    if (existingUsers.length > 0) {
      throw new BadRequestException(
        'One or more users already exist for this document.',
      );
    }

    if (users.length > 0) {
      const usersPromises = users.map(async (user) => {
        const lowerCasedEmail = user.email.toLowerCase();
        return this.usersService.create(
          { ...user, email: lowerCasedEmail },
          document,
        );
      });
      await Promise.all(usersPromises);
    }

    await this.documentRepository.update(
      { id },
      { name: documentName, status: DocumentStatuses.RECIPIENT_ADDED },
    );

    const updatedDocument = await this.findOne(id);

    await this.setInitials(updatedDocument);
  }

  public async findOne(id: string): Promise<ReadDocumentDto> {
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.users', 'user')
      .leftJoinAndSelect('user.signatures', 'signature')
      .where('document.id = :id', { id })
      .getOne();

    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    const isEmailsDeliveredToAllUsers = document.users.every(
      (user) => user.notifyStatus === NotifyStatuses.DELIVERED,
    );

    if (
      document.status === DocumentStatuses.SENT &&
      isEmailsDeliveredToAllUsers
    ) {
      await this.documentRepository.update(document.id, {
        status: DocumentStatuses.DELIVERED,
      });
    }

    const downloadLink = await this.fileStorageService.getSignedUrl(
      document.fileStorageId,
      FileLinkTypes.PDF,
      document.name,
    );

    const imageLink = await this.fileStorageService.getSignedUrl(
      document.imageStorageId,
      FileLinkTypes.IMAGE,
      document.name,
    );

    return {
      ...document,
      downloadLink,
      imageLink,
    };
  }

  public async checkStatus(
    findDocumentDto: FindDocumentDto,
  ): Promise<UploadDocumentDto> {
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.shortId = :shortId', {
        shortId: findDocumentDto.shortId,
      })
      .getOne();

    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    return {
      redirectUrl: `${this.configService.get(
        'CLIENT_APP_REDIRECT_URL',
      )}/doc/${document.id}`,
    };
  }

  public async download(id: string): Promise<DownloadDocumentDto> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    return {
      fileLink: await this.fileStorageService.getSignedUrl(
        document.fileStorageId,
        FileLinkTypes.DOWNLOAD,
        document.name,
      ),
    };
  }

  private async setInitials(document: Document): Promise<void> {
    const signers = document.users.filter(
      (user) => user.role === UserRoles.SIGNER,
    );

    const documentFile = await this.fileStorageService.getWithMetaData(
      document.fileStorageId,
    );
    const documentWithInitials: IDocumentWithInitials =
      await this.pdfService.createInitials(documentFile.buffer, signers);

    const usersWithCoords = documentWithInitials.usersWithCoords;

    if (signers.length > 0) {
      const signaturesPromises = usersWithCoords.map(async (userWithCoords) => {
        const signature = {
          pageNumber: userWithCoords.pageNumber,
          yCoordinate: userWithCoords.ycord,
          signed: false,
          notified: false,
        };

        return this.signaturesService.create(signature, userWithCoords);
      });

      await Promise.all(signaturesPromises);
    }

    await this.documentRepository.update(
      { id: document.id },
      {
        pagesCount: documentWithInitials.pagesCount,
        height: Math.round(documentWithInitials.pageSize.height),
        width: Math.round(documentWithInitials.pageSize.width),
        checkSum: hash(
          `${document.name}${document.type}${document.fileStorageId}`,
        ),
      },
    );

    await this.fileStorageService.replaceFile(
      document.fileStorageId,
      documentWithInitials.file,
      documentFile.metadata,
    );
  }

  public async sign(
    id: string,
    userId: string,
    signature: SignDocumentDto,
  ): Promise<void> {
    const document = await this.findOne(id);
    const user = document.users.find((user) => user.id === userId);

    if (!user) {
      throw new BadRequestException('User is not found.');
    }

    if (user.role !== UserRoles.SIGNER) {
      throw new BadRequestException(
        'You are not allowed to sign this document.',
      );
    }

    if (user.signatures[0].signed) {
      throw new BadRequestException('User already signed');
    }

    const signatureId = user.signatures[0].id;

    const updatedUser = {
      ...user,
      agreedWithPolicy: signature.agreedWithPolicy,
      readRecordsDisclosure: signature.readRecordsDisclosure,
      firstToHear: signature.firstToHear,
      signatures: [
        {
          ...user.signatures[0],
          signed: signature.signed,
          signFont: signature.signFont,
          signDate: signature.signDate,
          notified: true,
          lastNotifyDate: signature.signDate,
          fontSize: signature.fontSize,
        },
      ],
    };

    let documentFileWithMetadata: FileStorage;
    let signedDocument: Buffer;

    try {
      documentFileWithMetadata = await this.fileStorageService.getWithMetaData(
        document.fileStorageId,
      );
      signedDocument = await this.pdfService.createSignature(
        documentFileWithMetadata.buffer,
        updatedUser,
      );

      await this.fileStorageService.replaceFile(
        document.fileStorageId,
        signedDocument,
        documentFileWithMetadata.metadata,
      );
    } catch (error) {
      throw new NotAcceptableException(
        `Error during document signing process: ${error.message}`,
      );
    }

    const signersCount = document.users.filter(
      (user) => user.role === UserRoles.SIGNER,
    ).length;

    const documentArguments: {
      status: DocumentStatuses;
      signedBy: number;
      hash: string | null;
    } = {
      status: DocumentStatuses.PARTIALLY_SIGNED,
      signedBy: document.signedBy + 1,
      hash: null,
    };

    if (documentArguments.signedBy === signersCount) {
      const documentHash = await this.getFileHash(signedDocument);
      documentArguments.status = DocumentStatuses.COMPLETED;
      documentArguments.hash = documentHash;
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();
      await queryRunner.manager.update(Signature, signatureId, {
        signed: signature.signed,
        signFont: signature.signFont,
        signDate: signature.signDate,
        fontSize: signature.fontSize,
      });
      await queryRunner.manager.update(User, userId, {
        agreedWithPolicy: signature.agreedWithPolicy,
        readRecordsDisclosure: signature.readRecordsDisclosure,
        firstToHear: signature.firstToHear,
      });
      await queryRunner.manager.update(
        Document,
        document.id,
        documentArguments,
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const updatedDocument = await this.findOne(document.id);

    await this.notificationsService.sendEmail(
      updatedDocument,
      document.imageStorageId,
    );
  }

  async notify(id: string, userId?: string): Promise<void> {
    const document = await this.findOne(id);
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    const imageLink = await this.fileStorageService.getSignedUrl(
      document.imageStorageId,
      FileLinkTypes.IMAGE,
      document.name,
    );

    if (userId) {
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new BadRequestException('User is not found.');
      }
      await this.notificationsService.sendEmail(document, imageLink, user);
    } else {
      await this.notificationsService.sendEmail(document, imageLink);

      if (document.status === DocumentStatuses.RECIPIENT_ADDED) {
        await this.documentRepository.update(
          { id },
          { status: DocumentStatuses.SENT },
        );
      }
    }
  }

  async subscribe(
    id: string,
    subscribeDocumentDto: SubscribeDocumentDto,
  ): Promise<void> {
    const document = await this.findOne(id);
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }
    const email = subscribeDocumentDto.email.toLowerCase();

    const existedUser = document.users.find((user) => user.email === email);

    if (existedUser) {
      throw new BadRequestException('User is already subscribed.');
    }

    const newUser: CreateUserDto = {
      email,
      position: 0,
      agreedWithPolicy: true,
      notifyStatus: NotifyStatuses.NOT_SENT,
      lastNotifyDate: null,
      firstToHear: true,
      readRecordsDisclosure: true,
      role: UserRoles.WATCHER,
      documentId: document.id,
      signatures: [],
    };

    await this.usersService.create(newUser, document);
  }

  async getFileHash(fileBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');

      const inputStream = stream.Readable.from(fileBuffer);
      inputStream.on('data', (data) => hash.update(data));
      inputStream.on('end', () => resolve(hash.digest('hex')));
      inputStream.on('error', (err) => reject(err));
    });
  }

  async generateShortDocumentId(id: string): Promise<string> {
    const buffer = Buffer.from(id.replace(/-/g, ''), 'hex');
    const base32Encoded = base32.encode(buffer).replace(/=/g, '');
    const shortId = base32Encoded.slice(0, 12).toLowerCase();

    return `${shortId.slice(0, 3)}-${shortId.slice(3, 7)}-${shortId.slice(7, 10)}`;
  }
}
