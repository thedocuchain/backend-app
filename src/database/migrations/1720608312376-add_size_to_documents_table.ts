import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSizeToDocumentsTable1720608312376
  implements MigrationInterface
{
  name = 'AddSizeToDocumentsTable1720608312376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "size" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "size"`);
  }
}
