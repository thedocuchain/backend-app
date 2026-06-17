import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Document } from './document.entity';
import { Signature } from './signature.entity';
import { NotifyStatuses, UserRoles } from '../../common/enums/entities.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  name: string;

  @Column('text')
  email: string;

  @Column('boolean', { default: false })
  agreedWithPolicy: boolean;

  @Column('boolean', { default: false })
  readRecordsDisclosure: boolean;

  @Column('boolean', { default: false })
  firstToHear: boolean;

  @Column('boolean', { default: false })
  isInitiator: boolean;

  @Column('text', { nullable: true })
  checkSum: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column('text', { nullable: true })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'text',
    default: UserRoles.WATCHER,
  })
  role: string;

  @Column({
    type: 'integer',
    default: 0,
  })
  position: number;

  @Column('text', { default: NotifyStatuses.NOT_SENT })
  notifyStatus: string;

  @Column('timestamptz', { nullable: true })
  lastNotifyDate: Date;

  @ManyToOne(() => Document, (document) => document.users)
  document: Document;

  @OneToMany(() => Signature, (signature) => signature.user, {
    cascade: true,
  })
  signatures: Signature[];
}
