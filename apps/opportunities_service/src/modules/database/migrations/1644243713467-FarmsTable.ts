import { MigrationInterface, QueryRunner } from 'typeorm';

export class FarmsTable1644243713467 implements MigrationInterface {
  name = 'FarmsTable1644243713467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "farms" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "url" character varying NULL,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_39aff9c35006b14025bba5a43d9" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "farms"`);
  }
}
