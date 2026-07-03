import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../database/entities/document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersService } from './reminders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), NotificationsModule],
  providers: [RemindersService],
})
export class RemindersModule {}
