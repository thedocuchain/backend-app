import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('verification_code')
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  subjectId: string;

  @Column('text')
  email: string;

  @Column('varchar', { length: 6 })
  code: string;

  @Column('integer', { default: 0 })
  attempts: number;

  @Column('timestamptz')
  expiresAt: Date;

  @Column('timestamptz', { nullable: true })
  consumedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
