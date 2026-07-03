import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentReminderFields1783200000000
  implements MigrationInterface
{
  name = 'AddDocumentReminderFields1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" ADD "sentAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD "remindersSent" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "document" SET "sentAt" = "updatedAt" WHERE "status" IN ('sent', 'delivered', 'partially signed')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" DROP COLUMN "remindersSent"`,
    );
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN "sentAt"`);
  }
}
