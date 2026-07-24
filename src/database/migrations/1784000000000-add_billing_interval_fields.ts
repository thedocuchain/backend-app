import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingIntervalFields1784000000000
  implements MigrationInterface
{
  name = 'AddBillingIntervalFields1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" ADD "currentPeriodStart" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD "billingInterval" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "billingInterval"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" DROP COLUMN "currentPeriodStart"`,
    );
  }
}
