import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiReview } from '../database/entities/ai-review.entity';
import { Document } from '../database/entities/document.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { BillingModule } from '../billing/billing.module';

import { AiReviewService } from './ai-review.service';
import { AiReviewController } from './ai-review.controller';
import { VertexAiService } from './vertex-ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiReview, Document]),
    FileStorageModule,
    BillingModule,
  ],
  controllers: [AiReviewController],
  providers: [AiReviewService, VertexAiService],
  exports: [AiReviewService],
})
export class AiReviewModule {}
