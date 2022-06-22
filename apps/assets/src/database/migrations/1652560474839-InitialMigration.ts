import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1652560474839 implements MigrationInterface {
  name = 'InitialMigration1652560474839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assets_candidate" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "chain_id" integer NOT NULL, CONSTRAINT "UQ_0b839e795607d5ce357187cfc74" UNIQUE ("address", "chain_id"), CONSTRAINT "PK_bd21d08d3323fdc0e87dae26a8d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_category" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" text NOT NULL, "code" text NOT NULL, CONSTRAINT "UQ_a269b3a7e38c84953dbf132d6fb" UNIQUE ("name"), CONSTRAINT "UQ_d321065777416e3f903e9df5d56" UNIQUE ("code"), CONSTRAINT "PK_bfdc3fe63eb7269f4a286252641" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_historical_prices" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "timestamp" TIMESTAMP NOT NULL, "price" numeric NOT NULL, "asset_id" integer NOT NULL, CONSTRAINT "UQ_38a7e89481a81c5b57e4942921e" UNIQUE ("asset_id", "timestamp"), CONSTRAINT "PK_c86b1926f204233b410a217a300" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_prices" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "price" numeric NOT NULL, "source_id" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" integer NOT NULL, CONSTRAINT "UQ_e3d0b08353051a0a8f12c6e02fa" UNIQUE ("asset_id", "timestamp"), CONSTRAINT "PK_3523fd29cc0531fcc6eb60aa1eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_underlying" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "position" integer NOT NULL, "asset_id" integer NOT NULL, "underlying_asset_id" integer NOT NULL, CONSTRAINT "UQ_c0c706eaa48b9cbc7d6e0799b1e" UNIQUE ("asset_id", "underlying_asset_id"), CONSTRAINT "PK_917e47014b0b6dab464ad76740a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "name" character varying, "symbol" character varying, "icon" character varying, "chain_id" integer NOT NULL, "decimals" integer NOT NULL, "rank" integer, "is_tracked" boolean NOT NULL DEFAULT false, "disabled" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_40af782413d845fe859848c71ca" UNIQUE ("address", "chain_id"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "icon_sources" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "config" json NOT NULL, "enabled" boolean NOT NULL, CONSTRAINT "UQ_25cfa72456fc8f2836f979f4fc1" UNIQUE ("name"), CONSTRAINT "PK_d02c524197e2ccdbba5d3fe930a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_sources" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "type" character varying NOT NULL, "config" json NOT NULL, "enabled" boolean NOT NULL, CONSTRAINT "UQ_a899c6b4195244612aa6e1d96a4" UNIQUE ("name"), CONSTRAINT "PK_cd504be03b6bd35e7928ebba829" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_invalid_address" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "chain_id" integer NOT NULL, "retries" integer NOT NULL, CONSTRAINT "UQ_d015dee58f6d482dfad5011bf99" UNIQUE ("address", "chain_id"), CONSTRAINT "PK_cb4e45298b22aa5acb261c1eec1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets_to_categories" ("asset_id" integer NOT NULL, "category_id" integer NOT NULL, CONSTRAINT "PK_85c3c6ccdb45d2b9d8679f562fb" PRIMARY KEY ("asset_id", "category_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b77a25256ac59f8467f4064737" ON "assets_to_categories" ("asset_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ae006c156b8d1cc7742bda6dd" ON "assets_to_categories" ("category_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_historical_prices" ADD CONSTRAINT "FK_c99091d2f46d5768eb55d929be4" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_prices" ADD CONSTRAINT "FK_af3d211483e97a5ff71360f9a53" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" ADD CONSTRAINT "FK_a2daa4b2242b88d9fe9f0c9b5c1" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" ADD CONSTRAINT "FK_d230ddf0cdb0079ac0035c9f1c5" FOREIGN KEY ("underlying_asset_id") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_to_categories" ADD CONSTRAINT "FK_b77a25256ac59f8467f40647378" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_to_categories" ADD CONSTRAINT "FK_3ae006c156b8d1cc7742bda6ddb" FOREIGN KEY ("category_id") REFERENCES "assets_category"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assets_to_categories" DROP CONSTRAINT "FK_3ae006c156b8d1cc7742bda6ddb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_to_categories" DROP CONSTRAINT "FK_b77a25256ac59f8467f40647378"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" DROP CONSTRAINT "FK_d230ddf0cdb0079ac0035c9f1c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" DROP CONSTRAINT "FK_a2daa4b2242b88d9fe9f0c9b5c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_prices" DROP CONSTRAINT "FK_af3d211483e97a5ff71360f9a53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_historical_prices" DROP CONSTRAINT "FK_c99091d2f46d5768eb55d929be4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_3ae006c156b8d1cc7742bda6dd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b77a25256ac59f8467f4064737"`);
    await queryRunner.query(`DROP TABLE "assets_to_categories"`);
    await queryRunner.query(`DROP TABLE "assets_invalid_address"`);
    await queryRunner.query(`DROP TABLE "price_sources"`);
    await queryRunner.query(`DROP TABLE "icon_sources"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "assets_underlying"`);
    await queryRunner.query(`DROP TABLE "assets_prices"`);
    await queryRunner.query(`DROP TABLE "assets_historical_prices"`);
    await queryRunner.query(`DROP TABLE "assets_category"`);
    await queryRunner.query(`DROP TABLE "assets_candidate"`);
  }
}
