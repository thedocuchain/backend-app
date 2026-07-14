import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { Account } from '../database/entities/account.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingModule } from '../billing/billing.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Account]),
    NotificationsModule,
    BillingModule,
  ],
  providers: [RemindersService],
})
export class RemindersModule {}
