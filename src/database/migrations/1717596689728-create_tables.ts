import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1717596689728 implements MigrationInterface {
  name = 'CreateTables1717596689728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "document" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "type" character varying(50) NOT NULL, "status" text NOT NULL DEFAULT 'draft', "hash" text, "blockchainTransaction" text, "fileStorageId" text NOT NULL, "signedBy" integer NOT NULL DEFAULT '0', "pagesCount" integer NOT NULL DEFAULT '0', "checkSum" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "signature" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "signed" boolean NOT NULL DEFAULT false, "signFont" text, "fontSize" integer, "signDate" TIMESTAMP WITH TIME ZONE, "notified" boolean NOT NULL DEFAULT false, "lastNotifyDate" TIMESTAMP WITH TIME ZONE, "yCoordinate" integer NOT NULL, "pageNumber" integer NOT NULL, "checkSum" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_8e62734171afc1d7c9570be27fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text, "email" text NOT NULL, "agreedWithPolicy" boolean NOT NULL DEFAULT false, "readRecordsDisclosure" boolean NOT NULL DEFAULT false, "firstToHear" boolean NOT NULL DEFAULT false, "checkSum" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "role" text NOT NULL DEFAULT 'watcher', "position" integer NOT NULL DEFAULT '0', "documentId" uuid, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" ADD CONSTRAINT "FK_7300eb2628d8e5139f1f109f7eb" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_570e5564e3e17f243cde86e3ccb" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_570e5564e3e17f243cde86e3ccb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" DROP CONSTRAINT "FK_7300eb2628d8e5139f1f109f7eb"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "signature"`);
    await queryRunner.query(`DROP TABLE "document"`);
  }
}
