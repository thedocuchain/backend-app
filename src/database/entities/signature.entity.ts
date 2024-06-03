import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('boolean', { default: false })
  signed: boolean;

  @Column('text', { nullable: true })
  sign_font: string;

  @Column('timestamptz', { nullable: true })
  sign_date: Date;

  @Column('boolean', { default: false })
  notified: boolean;

  @Column('timestamptz', { nullable: true })
  last_notify_date: Date;

  @Column('integer')
  y_coordinate: number;

  @Column('integer')
  page_number: number;

  @Column('text', { nullable: true })
  check_sum: string;

  @ManyToOne(() => User, (user) => user.signatures)
  user: User;
}
