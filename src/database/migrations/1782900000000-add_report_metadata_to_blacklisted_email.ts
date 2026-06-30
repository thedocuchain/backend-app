import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportMetadataToBlacklistedEmail1782900000000
  implements MigrationInterface
{
  name = 'AddReportMetadataToBlacklistedEmail1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blacklisted_email" ADD "reportedByUserId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "blacklisted_email" ADD "documentId" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blacklisted_email" DROP COLUMN "documentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "blacklisted_email" DROP COLUMN "reportedByUserId"`,
    );
  }
}
