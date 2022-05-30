import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAssetPriceTable1653896573792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assets_prices"`);
    await queryRunner.query(
      `ALTER TABLE "assets_prices" DROP CONSTRAINT "FK_af3d211483e97a5ff71360f9a53"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assets_prices" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "price" numeric NOT NULL, "source_id" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" integer NOT NULL, CONSTRAINT "UQ_e3d0b08353051a0a8f12c6e02fa" UNIQUE ("asset_id", "timestamp"), CONSTRAINT "PK_3523fd29cc0531fcc6eb60aa1eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_prices" ADD CONSTRAINT "FK_af3d211483e97a5ff71360f9a53" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
