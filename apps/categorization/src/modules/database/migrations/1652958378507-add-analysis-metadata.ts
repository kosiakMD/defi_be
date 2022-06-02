import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAnalysisMetadata1652958378507 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE contracts_analysis ADD COLUMN metadata JSONB DEFAULT NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contracts_analysis DROP COLUMN metadata;`);
  }
}
