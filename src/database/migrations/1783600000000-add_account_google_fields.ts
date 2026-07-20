import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountGoogleFields1783600000000 implements MigrationInterface {
  name = 'AddAccountGoogleFields1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "account" ADD "googleId" text`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_account_googleId" ON "account" ("googleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_account_googleId"`);
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "googleId"`);
    await queryRunner.query(
      `ALTER TABLE "account" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
  }
}
