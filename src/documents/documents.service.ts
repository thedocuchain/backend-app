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

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly fileStorageService: FileStorageService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
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
      file_storage_id: filePath,
      check_sum: hash(`${fileName}${fileType}${filePath}`),
    });

    const newDoc = await this.documentRepository.save(document);

    if (!newDoc || !newDoc?.id) {
      throw new BadRequestException('Document is not created.');
    }
    const clientUrl = this.configService.get('CLIENT_APP_REDIRECT_URL');

    return {
      redirectUrl: `${clientUrl}/documents/${newDoc.id}`,
    };
  }

  public async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
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
      const usersPromises = users.map((user) => {
        return this.usersService.create(user, document);
      });
      await Promise.all(usersPromises);
    }

    await this.documentRepository.update({ id }, { name: documentName });

    return this.findOne(id);
  }

  public async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.users', 'user')
      .leftJoinAndSelect('user.signatures', 'signature')
      .where('document.id = :id', { id })
      .getOne();

    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    return document;
  }

  public async download(id: string): Promise<DownloadDocumentDto> {
    const document = await this.documentRepository.findOneBy({ id });
    if (!document) {
      throw new BadRequestException('Document is not found.');
    }

    return {
      fileLink: await this.fileStorageService.getSignedUrl(
        document.file_storage_id,
      ),
    };
  }
}
