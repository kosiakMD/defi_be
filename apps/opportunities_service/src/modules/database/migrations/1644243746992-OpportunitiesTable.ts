import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpportunitiesTable1644243746992 implements MigrationInterface {
  name = 'OpportunitiesTable1644243746992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "opportunities" (
        "id" SERIAL NOT NULL,
        "chain_id" integer NOT NULL,
        "farmId" integer,
        "source" character varying NOT NULL,
        "source_id" character varying NOT NULL,
        "apr" float8 NULL,
        "apy" float8 NULL,
        "investment_url" character varying NULL,
        "total_value_locked" float8 NULL,
        "tokens" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_4bd9cd12ddc0ff48a5a97ddebce" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunities"
      ADD CONSTRAINT "FK_3d2a99d523fe40db367214a44aa"
      FOREIGN KEY ("farmId")
      REFERENCES "farms"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunities" DROP CONSTRAINT "FK_3d2a99d523fe40db367214a44aa"`,
    );
    await queryRunner.query(`DROP TABLE "opportunities"`);
  }
}
