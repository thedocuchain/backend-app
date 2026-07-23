import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLowerEmailIndex1783800000000 implements MigrationInterface {
  name = 'AddUserLowerEmailIndex1783800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_lower_email" ON "user" (LOWER(email))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_lower_email"`);
  }
}
