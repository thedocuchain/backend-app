import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AccountSession } from './account-session.entity';

@Entity()
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text')
  name: string;

  @Column('text')
  passwordHash: string;

  @Column('text', { nullable: true })
  avatarImage: string;

  @Column('text', { nullable: true })
  signFont: string;

  @Column('text', { nullable: true })
  signImage: string;

  @Column('timestamptz', { nullable: true })
  emailVerifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AccountSession, (session) => session.account)
  sessions: AccountSession[];
}
