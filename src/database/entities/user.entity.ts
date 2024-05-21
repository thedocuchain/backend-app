import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', {
    nullable: true,
  })
  name: string;

  @Column('text', { unique: true })
  email: string;

  @Column('boolean')
  read_document: boolean;

  @Column('boolean')
  agreed_with_policy: boolean;

  @Column('boolean')
  read_records_disclosure: boolean;

  @Column('boolean')
  first_to_hear: boolean;

  @Column('text')
  check_sum: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
