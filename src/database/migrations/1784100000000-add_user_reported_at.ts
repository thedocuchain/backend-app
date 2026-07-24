import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserReportedAt1784100000000 implements MigrationInterface {
  name = 'AddUserReportedAt1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "reportedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reportedAt"`);
  }
}
