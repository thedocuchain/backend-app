import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiReviewTable1784200000000 implements MigrationInterface {
  name = 'CreateAiReviewTable1784200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_review" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documentId" uuid NOT NULL,
        "accountId" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "prompt" text NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "error" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_review_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ai_review_document" ON "ai_review" ("documentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_review"`);
  }
}
