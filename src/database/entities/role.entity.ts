import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserRoles {
  CREATOR = 'creator',
  SIGNER = 'signer',
  WATCHER = 'watcher',
}

@Entity()
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.WATCHER,
  })
  name: UserRoles;

  @Column('text')
  check_sum: string;
}
