import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDocumentsTableAddDocsize1718367846820
  implements MigrationInterface
{
  name = 'UpdateDocumentsTableAddDocsize1718367846820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "height" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "width" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "width"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "height"`);
  }
}
