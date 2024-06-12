import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDocumentsTable1718111775261 implements MigrationInterface {
  name = 'UpdateDocumentsTable1718111775261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" ADD "imageStorageId" text`);
    await queryRunner.query(`ALTER TABLE "document" ADD "shortId" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "shortId"`);
    await queryRunner.query(
      `ALTER TABLE "document" DROP COLUMN "imageStorageId"`,
    );
  }
}
