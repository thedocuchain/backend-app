import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('blacklisted_email')
export class BlacklistedEmail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { nullable: true })
  reason: string;

  // Who triggered the report (the recipient user id from the report token) and
  // on which document. Nullable: legacy rows and non-report entries won't have these.
  @Column('uuid', { nullable: true })
  reportedByUserId: string | null;

  @Column('uuid', { nullable: true })
  documentId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
