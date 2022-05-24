import { MigrationInterface, QueryRunner } from 'typeorm';

import { AbiMasterchefTemplate } from '../../protocols/services/abi/abi.masterchef.template';

export class insertMasterchefTemplateContract1649335021487 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
          INSERT INTO "contracts" (id, address, abi, abi_code)
          VALUES ($1, $2, $3, $4);
      `,
      [
        AbiMasterchefTemplate.id,
        AbiMasterchefTemplate.address,
        AbiMasterchefTemplate.abi,
        AbiMasterchefTemplate.abiCode,
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
      [AbiMasterchefTemplate.id],
    );
    await queryRunner.query(
      `
          DELETE
          FROM "contracts"
          WHERE id = $1;
      `,
      [AbiMasterchefTemplate.id],
    );
  }
}
