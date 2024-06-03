import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { UsersModule } from '../users/users.module';
import { PdfModule } from '../pdf/pdf.module';
import { SignaturesModule } from '../signatures/signatures.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    FileStorageModule,
    UsersModule,
    PdfModule,
    SignaturesModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
