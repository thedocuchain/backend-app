import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AccountAuthGuard } from '../common/guards/account-auth.guard';
import { AiReviewService } from './ai-review.service';
import { AiReviewDto } from './dto/ai-review.dto';

// Account-scoped: the paid-plan gate needs an account to check.
@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AccountAuthGuard)
@Controller('account/documents/:documentId/ai-review')
export class AiReviewController {
  constructor(private readonly aiReviewService: AiReviewService) {}

  @Get()
  @ApiResponse({ status: 200, type: AiReviewDto })
  find(@Param('documentId') documentId: string, @Request() req) {
    return this.aiReviewService.find(documentId, req.user.account);
  }

  @Post()
  @HttpCode(200)
  @ApiResponse({ status: 200, type: AiReviewDto })
  start(@Param('documentId') documentId: string, @Request() req) {
    return this.aiReviewService.start(documentId, req.user.account);
  }
}
