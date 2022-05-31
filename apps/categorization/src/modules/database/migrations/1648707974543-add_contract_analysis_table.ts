import { MigrationInterface, QueryRunner } from 'typeorm';

export class addContractAnalysisTable1648707974543 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "contracts_analysis"
        (
            "id"                      SERIAL,
            "contract_id"             INTEGER NOT NULL,
            "counterpart_contract_id" INTEGER NOT NULL,
            "abi_code_similarity"     DECIMAL(9, 8) DEFAULT 0,
            "abi_json_similarity"     DECIMAL(9, 8) DEFAULT 0,
            "abi_json_diff"           JSONB,
            PRIMARY KEY ("id"),
            CONSTRAINT "FK_contract_analysis_contracts" FOREIGN KEY ("contract_id") REFERENCES "contracts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
            CONSTRAINT "FK_contract_analysis_contracts_counterpart" FOREIGN KEY ("counterpart_contract_id") REFERENCES "contracts" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS contracts_analysis;
    `);
  }
}
