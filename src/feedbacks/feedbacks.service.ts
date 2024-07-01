import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Feedback } from '../database/entities/feedback.entity';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feeback.dto';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  public async create(feedback: CreateFeedbackDto): Promise<void> {
    const newFeedback = this.feedbackRepository.create(feedback);
    try {
      await this.feedbackRepository.save(newFeedback);
    } catch (error) {
      throw new InternalServerErrorException('Feedback not created');
    }
  }
}
