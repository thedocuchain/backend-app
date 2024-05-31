import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { UserRoles } from '../../common/enums/entities.enum';

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

  @Column('text', { nullable: true })
  check_sum: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.WATCHER,
  })
  name: UserRoles;

  @ManyToOne(() => User, (user) => user.signatures)
  user: User;
}
