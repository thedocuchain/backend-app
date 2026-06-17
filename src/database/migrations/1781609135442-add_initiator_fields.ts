import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInitiatorFields1781609135442 implements MigrationInterface {
  name = 'AddInitiatorFields1781609135442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "isInitiator" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "initiatorVerifiedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" DROP COLUMN "initiatorVerifiedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isInitiator"`);
  }
}
