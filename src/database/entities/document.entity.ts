import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import {
  DocumentStatuses,
  BlockchainTypes,
} from '../../common/enums/entities.enum';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('varchar', { length: 50 })
  type: string;

  @Column({
    type: 'text',
    default: DocumentStatuses.DRAFT,
  })
  status: string;

  @Column('text', { nullable: true })
  originalHash: string;

  @Column('text', { nullable: true })
  hash: string;

  @Column('text', { nullable: true })
  blockchainTransaction: string;

  @Column({
    type: 'text',
    default: BlockchainTypes.POLYGON,
    nullable: true,
  })
  blockchain: string;

  @Column('text')
  fileStorageId: string;

  @Column('uuid', { nullable: true })
  @Index()
  accountId?: string | null;

  @Column('text', { nullable: true })
  shortId: string;

  @Column('text', { nullable: true })
  imageStorageId: string;

  @Column('integer', { default: 0 })
  signedBy: number;

  @Column('integer', { default: 0 })
  pagesCount: number;

  @Column('integer', { default: 0 })
  height: number;

  @Column('integer', { default: 0 })
  width: number;

  @Column('integer', { default: 0 })
  size: number;

  @Column('text', { nullable: true })
  checkSum: string;

  @Column('timestamptz', { nullable: true })
  initiatorVerifiedAt: Date;

  @Column('timestamptz', { nullable: true })
  sentAt: Date;

  @Column('integer', { default: 0 })
  remindersSent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.document, {
    cascade: true,
  })
  users: User[];
}
