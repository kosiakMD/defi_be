import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesToOpportunitiesTable1649969707753 implements MigrationInterface {
  name = 'AddCategoriesToOpportunitiesTable1649969707753';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunities" ADD "categories" character varying array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`ALTER TABLE "farms" ALTER COLUMN "url" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "farms" ALTER COLUMN "url" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "opportunities" DROP COLUMN "categories"`);
  }
}
