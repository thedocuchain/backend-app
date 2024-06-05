import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../database/entities/document.entity';
import { FileStorageService } from '../file-storage/file-storage.service';

import { v4 as uuidV4 } from 'uuid';
import { hash } from 'typeorm/util/StringUtils';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DownloadDocumentDto } from './dto/download-document.dto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { PdfService } from '../pdf/pdf.service';
import { DocumentStatuses, UserRoles } from '../common/enums/entities.enum';
import { SignaturesService } from '../signatures/signatures.service';
import { IDocumentWithInitials } from '../pdf/interfaces/pdf.interface';
import { SignDocumentDto } from './dto/sign-document.dto';
import { ReadDocumentDto } from './dto/read-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly fileStorageService: FileStorageService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    private readonly signaturesService: SignaturesService,
  ) {}
  public async create(file: Express.Multer.File): Promise<UploadDocumentDto> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    const filePath = uuidV4();
    const fileName = file?.originalname ?? filePath;
    const fileType = file?.mimetype ?? 'application/pdf';

    await this.fileStorageService.save(filePath, file.buffer, [
      { filePath, contentType: file.mimetype },
    ]);

    const document = this.documentRepository.create({
      name: fileName,
      type: fileType,
      fileStorageId: filePath,
      status: DocumentStatuses.UPLOADED,
      checkSum: hash(`${fileName}${fileType}${filePath}`),
    });

    const newDoc = await this.documentRepository.save(document);

    if (!newDoc || !newDoc?.id) {
      throw new BadRequestException('Document is not created.');
    }
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
        return this.usersService.create(user, document);
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

    const downloadLink = await this.fileStorageService.getSignedUrl(
      document.fileStorageId,
    );

    return {
      ...document,
      downloadLink,
    };
  }

  public async download(id: string): Promise<DownloadDocumentDto> {
    const isDownload = true;
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    return {
      fileLink: await this.fileStorageService.getSignedUrl(
        document.fileStorageId,
        isDownload,
      ),
    };
  }

  private async setInitials(document: Document): Promise<Document> {
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
      { pagesCount: documentWithInitials.pagesCount },
    );

    await this.fileStorageService.replaceFile(
      document.fileStorageId,
      documentWithInitials.file,
      documentFile.metadata,
    );

    return this.findOne(document.id);
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

    await this.signaturesService.update(signatureId, {
      signed: signature.signed,
      signFont: signature.signFont,
      signDate: signature.signDate,
      notified: true,
      lastNotifyDate: signature.signDate,
      fontSize: signature.fontSize,
    });

    const updatedUser = await this.usersService.update(userId, {
      agreedWithPolicy: signature.agreedWithPolicy,
      readRecordsDisclosure: signature.readRecordsDisclosure,
    });

    const documentFileWithMetadata =
      await this.fileStorageService.getWithMetaData(document.fileStorageId);

    const signedDocument = await this.pdfService.createSignature(
      documentFileWithMetadata.buffer,
      updatedUser,
    );

    await this.fileStorageService.replaceFile(
      document.fileStorageId,
      signedDocument,
      documentFileWithMetadata.metadata,
    );

    const signersCount = document.users.filter(
      (user) => user.role === UserRoles.SIGNER,
    ).length;

    if (document.signedBy === signersCount - 1) {
      await this.documentRepository.update(
        { id },
        { status: DocumentStatuses.SIGNED, signedBy: document.signedBy + 1 },
      );
    } else {
      await this.documentRepository.update(
        { id },
        {
          status: DocumentStatuses.PARTIALLY_SIGNED,
          signedBy: document.signedBy + 1,
        },
      );
    }
  }
}
