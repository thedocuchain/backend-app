import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { UnsubscribeService } from './unsubscribe.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { EmailUnsubscribe } from '../database/entities/email-unsubscribe.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    TypeOrmModule.forFeature([Document, EmailUnsubscribe]),
  ],
  providers: [NotificationsService, TelegramService, UnsubscribeService],
  exports: [NotificationsService, TelegramService, UnsubscribeService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
