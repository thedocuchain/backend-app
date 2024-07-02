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
import { AuthModule } from './auth/auth.module';
import { getJwtConfig } from './configs/jwt.config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from './events/events.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    JwtModule.registerAsync(getJwtConfig()),
    EventEmitterModule.forRoot(),
    PassportModule,
    FileStorageModule,
    DocumentsModule,
    UsersModule,
    PdfModule,
    SignaturesModule,
    NotificationsModule,
    AuthModule,
    EventsModule,
    BlockchainModule,
    FeedbacksModule,
  ],
  providers: [],
})
export class AppModule {}
