import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInvalidAsset1655552187171 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets_invalid_address" RENAME TO "assets_invalid"`);
    await queryRunner.query(
      `ALTER TABLE "assets_invalid" ADD "retries" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets_invalid" DROP COLUMN "retries"`);
    await queryRunner.query(`ALTER TABLE "assets_invalid" RENAME TO "assets_invalid_address"`);
  }
}
