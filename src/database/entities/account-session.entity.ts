import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Account } from './account.entity';

@Entity()
export class AccountSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Account, (account) => account.sessions, {
    onDelete: 'CASCADE',
  })
  account: Account;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column('text', { nullable: true })
  ip: string;

  @Column('timestamptz')
  lastActiveAt: Date;

  @Column('timestamptz', { nullable: true })
  revokedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
