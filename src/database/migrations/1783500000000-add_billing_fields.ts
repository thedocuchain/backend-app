import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingFields1783500000000 implements MigrationInterface {
  name = 'AddBillingFields1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" ADD "plan" text NOT NULL DEFAULT 'free'`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "stripeCustomerId" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "stripeSubscriptionId" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "subscriptionStatus" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "currentPeriodEnd" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "document" ADD "accountId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_document_accountId" ON "document" ("accountId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_document_accountId"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "accountId"`);
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "cancelAtPeriodEnd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "currentPeriodEnd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "subscriptionStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "stripeSubscriptionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "stripeCustomerId"`,
    );
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "plan"`);
  }
}
