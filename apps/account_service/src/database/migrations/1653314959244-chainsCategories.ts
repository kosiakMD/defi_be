import { MigrationInterface, QueryRunner } from 'typeorm';

export class chainsCategories1653314959244 implements MigrationInterface {
  name = 'chainsCategories1653314959244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chains" ADD "icon" character varying`);
    await queryRunner.query(
      `CREATE TYPE "public"."chain_type" AS ENUM('evm', 'cardano', 'solana', 'cosmos')`,
    );
    await queryRunner.query(`ALTER TABLE "chains" ADD "type" "public"."chain_type" DEFAULT 'evm'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chains" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."chain_type"`);
    await queryRunner.query(`ALTER TABLE "chains" DROP COLUMN "icon"`);
  }
}
