import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalHashToDocumentTable1721152786066
  implements MigrationInterface
{
  name = 'AddOriginalHashToDocumentTable1721152786066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" ADD "originalHash" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" DROP COLUMN "originalHash"`,
    );
  }
}
