import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSignaturesTable1718089495707 implements MigrationInterface {
  name = 'UpdateSignaturesTable1718089495707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signature" DROP COLUMN "notified"`);
    await queryRunner.query(
      `ALTER TABLE "signature" DROP COLUMN "lastNotifyDate"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signature" ADD "lastNotifyDate" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" ADD "notified" boolean NOT NULL DEFAULT false`,
    );
  }
}
