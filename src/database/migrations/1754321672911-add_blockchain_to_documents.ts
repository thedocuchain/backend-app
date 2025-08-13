import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockchainToDocuments1754321672911
  implements MigrationInterface
{
  name = 'AddBlockchainToDocuments1754321672911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "blockchain" text NOT NULL DEFAULT 'polygon'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "blockchain"`);
  }
}
