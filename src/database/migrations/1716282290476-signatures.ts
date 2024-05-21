import { MigrationInterface, QueryRunner } from 'typeorm';

export class Signatures1716282290476 implements MigrationInterface {
  name = 'Signatures1716282290476';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "signatures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "signed" boolean NOT NULL, "sign_font" text NOT NULL, "sign_date" TIMESTAMP WITH TIME ZONE NOT NULL, "notified" boolean NOT NULL, "last_notify_date" TIMESTAMP WITH TIME ZONE NOT NULL, "check_sum" text NOT NULL, "user_id" uuid, "document_id" uuid, "role_id" uuid, CONSTRAINT "PK_8e62734171afc1d7c9570be27fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "signatures" ADD CONSTRAINT "FK_ff2ffd7a0da8689aed17972d146" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signatures" ADD CONSTRAINT "FK_459a0f1ba2818e1590cd3ce780d" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "signatures" ADD CONSTRAINT "FK_5b9a64bf0484d30fe389a80e8f3" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signatures" DROP CONSTRAINT "FK_5b9a64bf0484d30fe389a80e8f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signatures" DROP CONSTRAINT "FK_459a0f1ba2818e1590cd3ce780d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signatures" DROP CONSTRAINT "FK_ff2ffd7a0da8689aed17972d146"`,
    );
    await queryRunner.query(`DROP TABLE "signatures"`);
  }
}
