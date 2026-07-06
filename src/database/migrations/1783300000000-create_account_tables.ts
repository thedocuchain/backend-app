import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountTables1783300000000 implements MigrationInterface {
  name = 'CreateAccountTables1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" text NOT NULL, "name" text NOT NULL, "passwordHash" text NOT NULL, "avatarImage" text, "signFont" text, "signImage" text, "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_account_email" UNIQUE ("email"), CONSTRAINT "PK_account_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "account_session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userAgent" text, "ip" text, "lastActiveAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "accountId" uuid, CONSTRAINT "PK_account_session_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_session" ADD CONSTRAINT "FK_account_session_account" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_account_session_accountId" ON "account_session" ("accountId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "seenAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_code" RENAME COLUMN "documentId" TO "subjectId"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_verification_code_documentId" RENAME TO "IDX_verification_code_subjectId"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "IDX_verification_code_subjectId" RENAME TO "IDX_verification_code_documentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "verification_code" RENAME COLUMN "subjectId" TO "documentId"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "seenAt"`);
    await queryRunner.query(`DROP INDEX "IDX_account_session_accountId"`);
    await queryRunner.query(
      `ALTER TABLE "account_session" DROP CONSTRAINT "FK_account_session_account"`,
    );
    await queryRunner.query(`DROP TABLE "account_session"`);
    await queryRunner.query(`DROP TABLE "account"`);
  }
}
