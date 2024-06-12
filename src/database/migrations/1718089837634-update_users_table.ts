import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUsersTable1718089837634 implements MigrationInterface {
  name = 'UpdateUsersTable1718089837634';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "notifyStatus" text NOT NULL DEFAULT 'not sent'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "lastNotifyDate" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastNotifyDate"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "notifyStatus"`);
  }
}
