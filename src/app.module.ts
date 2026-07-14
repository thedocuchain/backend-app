import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { TransformFormatModule } from './transform-format/transform-format.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { VerificationModule } from './verification/verification.module';
import { WalletMonitorModule } from './wallet-monitor/wallet-monitor.module';
import { RemindersModule } from './reminders/reminders.module';
import { LoggerMiddleware } from './common/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    AuditLogsModule,
    TransformFormatModule,
    BlacklistModule,
    VerificationModule,
    WalletMonitorModule,
    RemindersModule,
  ],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
