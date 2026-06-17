import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlacklistedEmailTable1781609135444
  implements MigrationInterface
{
  name = 'CreateBlacklistedEmailTable1781609135444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "blacklisted_email" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" text NOT NULL, "reason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_blacklisted_email_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_blacklisted_email_email" UNIQUE ("email"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blacklisted_email"`);
  }
}
