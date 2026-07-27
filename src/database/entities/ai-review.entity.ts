import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { AiReviewStatuses } from '../../common/enums/entities.enum';

// One review per document, shared by every party to it. Single-shot: it cannot
// be re-run once created.
@Entity()
@Index(['documentId'], { unique: true })
export class AiReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  documentId: string;

  // Whoever triggered it; readable by every party to the document.
  @Column('uuid')
  accountId: string;

  @Column('text', { default: AiReviewStatuses.PENDING })
  status: AiReviewStatuses;

  @Column('text')
  prompt: string;

  @Column('text', { default: '' })
  content: string;

  @Column('text', { nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
