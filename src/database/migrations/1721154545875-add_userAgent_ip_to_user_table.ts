import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAgentIpToUserTable1721154545875
  implements MigrationInterface
{
  name = 'AddUserAgentIpToUserTable1721154545875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "userAgent" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD "ip" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "ip"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "userAgent"`);
  }
}
