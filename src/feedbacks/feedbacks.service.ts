import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from '../database/entities/feedback.entity';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feeback.dto';
import { hash } from 'typeorm/util/StringUtils';
import { TelegramService } from '../notifications/telegram.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly telegramService: TelegramService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  public async create(feedback: CreateFeedbackDto): Promise<void> {
    const checkSum = feedback?.username + feedback.email + feedback.description;
    const isHuman = await this.recaptchaService.verify(feedback.recaptchaToken);

    if (!isHuman) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    const newFeedback = this.feedbackRepository.create({
      ...feedback,
      checkSum: hash(checkSum),
    });
    try {
      const savedFeedback = await this.feedbackRepository.save(newFeedback);
      const message = `
<b>New feedback from</b> <i>${savedFeedback?.username}</i>
<b>Email:</b> ${savedFeedback.email}
<b>Feedback:</b> ${savedFeedback.description}`;
      await this.telegramService.sendMessage(message);
    } catch (error) {
      throw new InternalServerErrorException('Feedback not created');
    }
  }
}
