import { ApiProperty } from '@nestjs/swagger';

import { AiReviewStatuses } from '../../common/enums/entities.enum';

export class AiReviewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty({ enum: AiReviewStatuses })
  status: AiReviewStatuses;

  @ApiProperty()
  prompt: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ nullable: true })
  error: string | null;

  @ApiProperty()
  createdAt: Date;
}
