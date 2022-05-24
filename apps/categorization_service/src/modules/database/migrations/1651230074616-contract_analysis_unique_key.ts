import { MigrationInterface, QueryRunner } from 'typeorm';

export class contractAnalysisUniqueKey1651230074616 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          ALTER TABLE contracts_analysis
              ADD CONSTRAINT contract_id_counterpart_contract_id_unique_key UNIQUE (contract_id, counterpart_contract_id);
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          ALTER TABLE contracts_analysis
              DROP CONSTRAINT IF EXISTS contract_id_counterpart_contract_id_unique_key;
      `,
    );
  }
}
