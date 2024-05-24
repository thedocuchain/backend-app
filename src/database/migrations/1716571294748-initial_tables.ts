import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialTables1716571294748 implements MigrationInterface {
  name = 'InitialTables1716571294748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."document_status_enum" AS ENUM('draft', 'uploaded', 'recipient added', 'sent', 'delivered', 'signed', 'completed', 'blockchained')`,
    );
    await queryRunner.query(
      `CREATE TABLE "document" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "type" character varying(50) NOT NULL, "status" "public"."document_status_enum" NOT NULL DEFAULT 'draft', "hash" text, "blockchain_transaction" text, "file_storage_id" text NOT NULL, "signed_by" integer NOT NULL DEFAULT '0', "check_sum" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('Creator', 'Signer', 'Watcher')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text, "email" text NOT NULL, "read_document" boolean NOT NULL DEFAULT false, "agreed_with_policy" boolean NOT NULL DEFAULT false, "read_records_disclosure" boolean NOT NULL DEFAULT false, "first_to_hear" boolean NOT NULL DEFAULT false, "check_sum" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "role" "public"."user_role_enum" NOT NULL DEFAULT 'Watcher', "documentId" uuid, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."signature_name_enum" AS ENUM('Creator', 'Signer', 'Watcher')`,
    );
    await queryRunner.query(
      `CREATE TABLE "signature" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "signed" boolean NOT NULL DEFAULT false, "sign_font" text, "sign_date" TIMESTAMP WITH TIME ZONE, "notified" boolean NOT NULL DEFAULT false, "last_notify_date" TIMESTAMP WITH TIME ZONE, "check_sum" text, "name" "public"."signature_name_enum" NOT NULL DEFAULT 'Watcher', "userId" uuid, CONSTRAINT "PK_8e62734171afc1d7c9570be27fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_570e5564e3e17f243cde86e3ccb" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" ADD CONSTRAINT "FK_7300eb2628d8e5139f1f109f7eb" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signature" DROP CONSTRAINT "FK_7300eb2628d8e5139f1f109f7eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_570e5564e3e17f243cde86e3ccb"`,
    );
    await queryRunner.query(`DROP TABLE "signature"`);
    await queryRunner.query(`DROP TYPE "public"."signature_name_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TYPE "public"."document_status_enum"`);
  }
}
