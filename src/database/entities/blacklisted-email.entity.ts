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

  @CreateDateColumn()
  createdAt: Date;
}
