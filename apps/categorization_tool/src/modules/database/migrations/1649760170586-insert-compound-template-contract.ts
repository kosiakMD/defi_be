import { MigrationInterface, QueryRunner } from 'typeorm';

import { AbiCompoundTemplate } from '../../protocols/services/abi/abi.compound.template';

export class insertCompoundTemplateContract1649760170586 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          INSERT INTO "contracts" (id, address, abi, abi_code)
          VALUES ($1, $2, $3, $4);
      `,
      [
        AbiCompoundTemplate.id,
        AbiCompoundTemplate.address,
        AbiCompoundTemplate.abi,
        AbiCompoundTemplate.abiCode,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          DELETE
          FROM "contracts_analysis"
          WHERE contract_id = $1;
      `,
      [AbiCompoundTemplate.id],
    );
    await queryRunner.query(
      `
          DELETE
          FROM "contracts"
          WHERE id = $1;
      `,
      [AbiCompoundTemplate.id],
    );
  }
}
