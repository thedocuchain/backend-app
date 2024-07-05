import { Module } from '@nestjs/common';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbacksService } from './feedbacks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from '../database/entities/feedback.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecaptchaModule } from '../recaptcha/recaptcha.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback]),
    NotificationsModule,
    RecaptchaModule,
  ],
  controllers: [FeedbacksController],
  providers: [FeedbacksService],
})
export class FeedbacksModule {}
