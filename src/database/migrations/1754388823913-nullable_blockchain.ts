import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableBlockchain1754388823913 implements MigrationInterface {
  name = 'NullableBlockchain1754388823913';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "blockchain" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ALTER COLUMN "blockchain" SET NOT NULL`,
    );
  }
}
