import { MigrationInterface, QueryRunner } from 'typeorm';

export class Documents1716282033048 implements MigrationInterface {
  name = 'Documents1716282033048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."document_status_enum" AS ENUM('draft', 'uploaded', 'recipient added', 'sent', 'delivered', 'signed', 'completed', 'blockchained')`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "type" character varying(50) NOT NULL, "status" "public"."document_status_enum" NOT NULL DEFAULT 'draft', "hash" text, "blockchain_transaction" text, "file_storage_id" text NOT NULL, "signed_by" integer NOT NULL DEFAULT '0', "check_sum" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "public"."document_status_enum"`);
  }
}
