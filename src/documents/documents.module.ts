import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { UsersModule } from '../users/users.module';
import { PdfModule } from '../pdf/pdf.module';
import { SignaturesModule } from '../signatures/signatures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TransformFormatModule } from '../transform-format/transform-format.module';
import { BlacklistModule } from '../blacklist/blacklist.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    FileStorageModule,
    UsersModule,
    PdfModule,
    SignaturesModule,
    NotificationsModule,
    AuthModule,
    EventsModule,
    AuthModule,
    BlockchainModule,
    AuditLogsModule,
    TransformFormatModule,
    BlacklistModule,
    VerificationModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
