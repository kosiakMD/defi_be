import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetsServiceMigration61645025639200 implements MigrationInterface {
  name = 'AssetsServiceMigration61645025639200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "assets_category" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "UQ_a269b3a7e38c84953dbf132d6fb" UNIQUE ("name"), CONSTRAINT "PK_bfdc3fe63eb7269f4a286252641" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "assets" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "name" character varying, "symbol" character varying, "icon" character varying, "chain_id" integer NOT NULL, "decimals" integer, "is_tracked" boolean NOT NULL DEFAULT false, "disabled" boolean NOT NULL DEFAULT false, "categoryId" integer, "rank" integer DEFAULT -1, CONSTRAINT "UQ_0f8764aeb8dd2d2a9a1374aa854" UNIQUE ("address"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "assets_underlying" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "position" integer NOT NULL, "assetId" integer, "underlyingAssetId" integer, CONSTRAINT "REL_11ded68334cd20858496add437" UNIQUE ("underlyingAssetId"), CONSTRAINT "PK_917e47014b0b6dab464ad76740a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "icon_sources" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "config" json NOT NULL, "enabled" boolean NOT NULL, CONSTRAINT "PK_d02c524197e2ccdbba5d3fe930a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "assets_historical_prices" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "open" numeric NOT NULL, "high" numeric NOT NULL, "low" numeric NOT NULL, "close" numeric NOT NULL, "ticks" integer NOT NULL, "open" integer NOT NULL, "asset_id" integer NOT NULL, "time_granularity" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_ASSET_TIME_GRANULARITY" PRIMARY KEY ("asset_id", "time_granularity", "timestamp"))`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "assets_invalid_address" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "address" character varying NOT NULL, "chain_id" integer NOT NULL, CONSTRAINT "PK_cb4e45298b22aa5acb261c1eec1" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "FK_2e847f9d0120b4ca0d7269dda0e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets" ADD CONSTRAINT "FK_2e847f9d0120b4ca0d7269dda0e" FOREIGN KEY ("categoryId") REFERENCES "assets_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "assets_underlying" DROP CONSTRAINT IF EXISTS "FK_3bc7cf39d4f1c57a4a875503616"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" ADD CONSTRAINT "FK_3bc7cf39d4f1c57a4a875503616" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "assets_underlying" DROP CONSTRAINT IF EXISTS "FK_11ded68334cd20858496add437b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_underlying" ADD CONSTRAINT "FK_11ded68334cd20858496add437b" FOREIGN KEY ("underlyingAssetId") REFERENCES "assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    const assetsCategories = [
      'not supported',
      'ERC20 type token',
      'liquidity pool token',
      'chain coin',
    ];
    assetsCategories.forEach(async (name: string) => {
      await queryRunner.query(
        `INSERT INTO public.assets_category (name) VALUES ('${name}') ON CONFLICT (name) DO NOTHING;`,
      );
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "assets_underlying" DROP CONSTRAINT "FK_11ded68334cd20858496add437b"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "assets_underlying" DROP CONSTRAINT "FK_3bc7cf39d4f1c57a4a875503616"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "assets" DROP CONSTRAINT "FK_2e847f9d0120b4ca0d7269dda0e"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_invalid_address"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "icon_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_underlying"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_historical_prices"`);
  }
}
