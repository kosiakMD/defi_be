import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIconSourcesTable1654160655411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "icon_sources"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "icon_sources" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "config" json NOT NULL, "enabled" boolean NOT NULL, CONSTRAINT "UQ_25cfa72456fc8f2836f979f4fc1" UNIQUE ("name"), CONSTRAINT "PK_d02c524197e2ccdbba5d3fe930a" PRIMARY KEY ("id"))`,
    );
  }
}
