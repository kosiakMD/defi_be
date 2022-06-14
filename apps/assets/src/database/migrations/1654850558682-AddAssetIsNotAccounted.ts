import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetIsNotAccounted1654850558682 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assets" ADD "is_not_accounted" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "is_not_accounted"`);
  }
}
