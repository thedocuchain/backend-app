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
import { UserRoles } from '../../common/enums/entities.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  name: string;

  @Column('text')
  email: string;

  @Column('boolean', { default: false })
  read_document: boolean;

  @Column('boolean', { default: false })
  agreed_with_policy: boolean;

  @Column('boolean', { default: false })
  read_records_disclosure: boolean;

  @Column('boolean', { default: false })
  first_to_hear: boolean;

  @Column('text', { nullable: true })
  check_sum: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.WATCHER,
  })
  role: UserRoles;

  @ManyToOne(() => Document, (document) => document.users)
  document: Document;

  @OneToMany(() => Signature, (signature) => signature.user, {
    cascade: true,
  })
  signatures: Signature[];
}
