import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AccountSession } from './account-session.entity';
import { AccountPlan } from '../../common/enums/entities.enum';

@Entity()
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  passwordHash: string | null;

  @Column('text', { nullable: true, unique: true })
  googleId: string | null;

  @Column('text', { nullable: true })
  avatarImage: string;

  @Column('text', { nullable: true })
  signFont: string;

  @Column('text', { nullable: true })
  signImage: string;

  @Column('timestamptz', { nullable: true })
  emailVerifiedAt: Date;

  @Column('text', { default: AccountPlan.FREE })
  plan: AccountPlan;

  @Column('text', { nullable: true })
  stripeCustomerId: string | null;

  @Column('text', { nullable: true })
  stripeSubscriptionId: string | null;

  @Column('text', { nullable: true })
  subscriptionStatus: string | null;

  @Column('timestamptz', { nullable: true })
  currentPeriodEnd: Date | null;

  @Column('boolean', { default: false })
  cancelAtPeriodEnd: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AccountSession, (session) => session.account)
  sessions: AccountSession[];
}
