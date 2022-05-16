import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeColumnAbiDiff1652691673678 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          ALTER TABLE contracts_analysis DROP COLUMN abi_json_diff;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          ALTER TABLE contracts_analysis ADD COLUMN abi_json_diff JSONB;
      `,
    );
  }
}
