import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from '../database/entities/feedback.entity';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feeback.dto';
import { hash } from 'typeorm/util/StringUtils';
import { TelegramService } from '../notifications/telegram.service';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    private readonly telegramService: TelegramService,
  ) {}

  public async create(feedback: CreateFeedbackDto): Promise<void> {
    await this.record(feedback.username, feedback.email, feedback.description);
  }

  public async record(
    username: string,
    email: string,
    description: string,
  ): Promise<void> {
    const newFeedback = this.feedbackRepository.create({
      username,
      email,
      description,
      checkSum: hash(username + email + description),
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
