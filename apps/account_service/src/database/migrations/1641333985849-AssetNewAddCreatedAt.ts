import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetNewAddCreatedAt1641333985849 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assets_new" ADD COLUMN "created_at" TIMESTAMP DEFAULT NOW()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "created_at"`);
  }
}
