import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationCodeTable1781609135443
  implements MigrationInterface
{
  name = 'CreateVerificationCodeTable1781609135443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "verification_code" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "documentId" text NOT NULL, "email" text NOT NULL, "code" character varying(6) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "consumedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_verification_code_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_code_email" ON "verification_code" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_verification_code_documentId" ON "verification_code" ("documentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_verification_code_documentId"`);
    await queryRunner.query(`DROP INDEX "IDX_verification_code_email"`);
    await queryRunner.query(`DROP TABLE "verification_code"`);
  }
}
