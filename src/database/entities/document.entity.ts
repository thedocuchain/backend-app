import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentStatuses {
  DRAFT = 'draft',
  UPLOADED = 'uploaded',
  RECIPIENT_ADDED = 'recipient added',
  SENT = 'sent',
  DELIVERED = 'delivered',
  SIGNED = 'signed',
  COMPLETED = 'completed',
  BLOCKCHAINED = 'blockchained',
}

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('varchar', { length: 50 })
  type: string;

  @Column({
    type: 'enum',
    enum: DocumentStatuses,
    default: DocumentStatuses.DRAFT,
  })
  status: DocumentStatuses;

  @Column('text', { nullable: true })
  hash: string;

  @Column('text', { nullable: true })
  blockchain_transaction: string;

  @Column('text')
  file_storage_id: string;

  @Column('int', { default: 0 })
  signed_by: number;

  @Column('text')
  check_sum: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
