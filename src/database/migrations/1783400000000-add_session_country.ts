import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionCountry1783400000000 implements MigrationInterface {
  name = 'AddSessionCountry1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "account_session" ADD "country" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account_session" DROP COLUMN "country"`,
    );
  }
}
