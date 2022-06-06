import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetIndexes1654457899715 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('create index assets_name_index on assets (name)');
    await queryRunner.query('create index assets_symbol_index on assets (symbol)');
    await queryRunner.query('create index assets_display_name_index on assets (display_name)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index assets_name_index');
    await queryRunner.query('drop index assets_symbol_index');
    await queryRunner.query('drop index assets_display_name_index');
  }
}
