import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSignatureTable1717230349998 implements MigrationInterface {
  name = 'UpdateSignatureTable1717230349998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signature" DROP COLUMN "name"`);
    await queryRunner.query(`DROP TYPE "public"."signature_name_enum"`);
    await queryRunner.query(
      `ALTER TABLE "signature" ADD "y_coordinate" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" ADD "page_number" integer NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signature" DROP COLUMN "page_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" DROP COLUMN "y_coordinate"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."signature_name_enum" AS ENUM('Creator', 'Signer', 'Watcher')`,
    );
    await queryRunner.query(
      `ALTER TABLE "signature" ADD "name" "public"."signature_name_enum" NOT NULL DEFAULT 'Watcher'`,
    );
  }
}
