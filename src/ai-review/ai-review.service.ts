import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AiReview } from '../database/entities/ai-review.entity';
import { Document } from '../database/entities/document.entity';
import { Account } from '../database/entities/account.entity';
import { AiReviewStatuses } from '../common/enums/entities.enum';
import { FileStorageService } from '../file-storage/file-storage.service';
import { BillingService } from '../billing/billing.service';
import { PLAN_LIMITS } from '../billing/plans';

import {
  GeminiPart,
  MAX_INLINE_FILE_SIZE,
  VertexAiService,
} from './vertex-ai.service';
import {
  AI_REVIEW_PROMPT,
  AI_REVIEW_SYSTEM_INSTRUCTION,
} from './ai-review.prompt';
import { AiReviewDto } from './dto/ai-review.dto';

// Flush cadence for streamed text, so a reconnecting client sees fresh output
// without one write per token.
const FLUSH_INTERVAL_MS = 700;

const FETCH_FILE_ATTEMPTS = 4;
const FETCH_FILE_RETRY_MS = 1000;

@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);

  constructor(
    @InjectRepository(AiReview)
    private readonly aiReviewRepository: Repository<AiReview>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly fileStorageService: FileStorageService,
    private readonly vertexAiService: VertexAiService,
    private readonly billingService: BillingService,
  ) {}

  get enabled(): boolean {
    return this.vertexAiService.enabled;
  }

  async find(documentId: string, account: Account): Promise<AiReviewDto | null> {
    await this.resolveDocument(documentId, account);
    // Reviews are shared, so reading one still has to clear the paid-plan gate.
    this.assertPlanAllows(account);

    const review = await this.aiReviewRepository.findOne({
      where: { documentId },
    });

    return review ? this.toDto(review) : null;
  }

  // One review per document, shared by every party, so all signers read the
  // same analysis of the same contract.
  async start(documentId: string, account: Account): Promise<AiReviewDto> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI review is not configured');
    }

    const document = await this.resolveDocument(documentId, account);
    this.assertPlanAllows(account);

    const existing = await this.aiReviewRepository.findOne({
      where: { documentId },
    });

    if (existing) {
      // Single-shot, except a failed run would otherwise lock the document out.
      if (existing.status !== AiReviewStatuses.FAILED) {
        return this.toDto(existing);
      }

      await this.aiReviewRepository.update(existing.id, {
        status: AiReviewStatuses.PENDING,
        content: '',
        error: null,
      });
      void this.generate(existing.id, document);

      return this.toDto(
        await this.aiReviewRepository.findOne({ where: { id: existing.id } }),
      );
    }

    const review = await this.aiReviewRepository.save(
      this.aiReviewRepository.create({
        documentId,
        accountId: account.id,
        status: AiReviewStatuses.PENDING,
        prompt: AI_REVIEW_PROMPT,
        content: '',
      }),
    );

    void this.generate(review.id, document);

    return this.toDto(review);
  }

  // Stays open while billing is unconfigured, matching document quotas.
  private assertPlanAllows(account: Account): void {
    if (!this.billingService.enabled) return;

    const plan = this.billingService.getStatus(account).plan;
    if (!PLAN_LIMITS[plan]?.aiReview) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_AI_REVIEW',
        message: 'Please upgrade your plan to use this feature.',
      });
    }
  }

  // The initiator plus anyone the document was sent to may review it.
  private async resolveDocument(
    documentId: string,
    account: Account,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['users'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const email = account.email.toLowerCase();
    const isParticipant = (document.users ?? []).some(
      (user) => user.email?.toLowerCase() === email,
    );

    if (document.accountId !== account.id && !isParticipant) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  private async generate(reviewId: string, document: Document): Promise<void> {
    let content = '';
    let lastFlush = 0;

    const flush = async (status: AiReviewStatuses) => {
      lastFlush = Date.now();
      await this.aiReviewRepository.update(reviewId, { content, status });
    };

    try {
      const parts = await this.buildParts(document);
      await this.aiReviewRepository.update(reviewId, {
        status: AiReviewStatuses.STREAMING,
      });

      await this.vertexAiService.streamGenerate(
        parts,
        AI_REVIEW_SYSTEM_INSTRUCTION,
        async (delta) => {
          content += delta;
          if (Date.now() - lastFlush >= FLUSH_INTERVAL_MS) {
            await flush(AiReviewStatuses.STREAMING);
          }
        },
      );

      if (!content.trim()) {
        throw new Error('Model returned an empty response');
      }

      await flush(AiReviewStatuses.COMPLETED);
    } catch (error) {
      this.logger.error(
        `AI review ${reviewId} failed: ${error?.message ?? error}`,
      );
      await this.aiReviewRepository.update(reviewId, {
        content,
        status: AiReviewStatuses.FAILED,
        error: 'The review could not be completed. Please try again later.',
      });
    }
  }

  // Upload writes are not awaited, so a review can outrun the object landing.
  private async fetchFile(fileStorageId: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.fileStorageService.getWithMetaData(fileStorageId);
      } catch (error) {
        if (attempt >= FETCH_FILE_ATTEMPTS - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, FETCH_FILE_RETRY_MS * (attempt + 1)),
        );
      }
    }
  }

  // Uploads are normalised to PDF; oversized ones fall back to their text layer.
  private async buildParts(document: Document): Promise<GeminiPart[]> {
    const file = await this.fetchFile(document.fileStorageId);

    if (file.buffer.length > MAX_INLINE_FILE_SIZE) {
      const text = await this.extractText(file.buffer);
      if (!text.trim()) {
        throw new Error('Document is too large to review');
      }
      return [
        { text: `Document "${document.name}" contents:\n\n${text}` },
        { text: AI_REVIEW_PROMPT },
      ];
    }

    return [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: file.buffer.toString('base64'),
        },
      },
      { text: AI_REVIEW_PROMPT },
    ];
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      .promise;

    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      pages.push(
        textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' '),
      );
    }

    return pages.join('\n\n');
  }

  private toDto(review: AiReview): AiReviewDto {
    return {
      id: review.id,
      documentId: review.documentId,
      status: review.status,
      prompt: review.prompt,
      content: review.content,
      error: review.error,
      createdAt: review.createdAt,
    };
  }
}
