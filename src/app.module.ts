import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './configs/postgres.config';
import { FileStorageModule } from './file-storage/file-storage.module';
import { DocumentsModule } from './documents/documents.module';
import { UsersModule } from './users/users.module';
import { PdfModule } from './pdf/pdf.module';
import { SignaturesModule } from './signatures/signatures.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    FileStorageModule,
    DocumentsModule,
    UsersModule,
    PdfModule,
    SignaturesModule,
    NotificationsModule,
  ],
  providers: [],
})
export class AppModule {}
