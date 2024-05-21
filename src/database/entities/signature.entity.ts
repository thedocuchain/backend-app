import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';
import { Role } from './role.entity';

@Entity()
export class Signatures {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column('boolean')
  signed: boolean;

  @Column('text')
  sign_font: string;

  @Column('timestamptz')
  sign_date: Date;

  @Column('boolean')
  notified: boolean;

  @Column('timestamptz')
  last_notify_date: Date;

  @Column('text')
  check_sum: string;
}
