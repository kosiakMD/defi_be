import { MigrationInterface, QueryRunner } from 'typeorm';

export class contractsFetchedAbiFlag1653292613545 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE contracts SET abi = null, abi_code = null WHERE id > 0;`);
    await queryRunner.query(`ALTER TABLE contracts ADD COLUMN fetched_abi BOOLEAN DEFAULT false;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contracts DROP COLUMN fetched_abi;`);
  }
}
