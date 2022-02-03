import { MigrationInterface, QueryRunner } from 'typeorm';

export class Endpoints1643205463195 implements MigrationInterface {
  name = 'Endpoints1643205463195';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "endpoints" (
        "id" SERIAL NOT NULL,
        "endpoint" character varying NOT NULL,
        "chain_id" integer NOT NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_endpoints_id" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "endpoints"`);
  }
}
