import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnverifiedStablecoinCategory1655470129472 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "assets_category" (name, code) VALUES ('Unverified Stablecoin', 'unverified-stablecoin')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "assets_category" WHERE code = 'unverified-stablecoin'`);
  }
}
