import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignImageToSignature1783100000000
  implements MigrationInterface
{
  name = 'AddSignImageToSignature1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signature" ADD "signImage" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signature" DROP COLUMN "signImage"`);
  }
}
