import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { DocumentStatuses } from '../../common/enums/entities.enum';

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

  @Column('text', { nullable: true })
  check_sum: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, (user) => user.document, {
    cascade: true,
  })
  users: User[];
}
