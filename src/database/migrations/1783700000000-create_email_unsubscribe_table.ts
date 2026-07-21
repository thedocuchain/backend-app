import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailUnsubscribeTable1783700000000
  implements MigrationInterface
{
  name = 'CreateEmailUnsubscribeTable1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_unsubscribe" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_email_unsubscribe_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_email_unsubscribe_email" UNIQUE ("email"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_unsubscribe"`);
  }
}
