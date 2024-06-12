import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('boolean', { default: false })
  signed: boolean;

  @Column('text', { nullable: true })
  signFont: string;

  @Column('integer', { nullable: true })
  fontSize: number;

  @Column('timestamptz', { nullable: true })
  signDate: Date;

  @Column('integer')
  yCoordinate: number;

  @Column('integer')
  pageNumber: number;

  @Column('text', { nullable: true })
  checkSum: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.signatures)
  user: User;
}
