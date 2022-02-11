import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetsServiceMigrations1644306443781 implements MigrationInterface {
  name = 'AssetsServiceMigrations1644306443781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assets_new" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "address" character varying NOT NULL,
            "name" character varying,
            "symbol" character varying,
            "icon_loaded" boolean NOT NULL,
            "icon_extention" character varying NOT NULL,
            "chain_id" integer NOT NULL,
            "decimals" integer NOT NULL,
            "is_tracked" boolean NOT NULL,
            "disabled" boolean NOT NULL,
            CONSTRAINT "PK_assets_new_id" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "asset_category" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "name" character varying NOT NULL,
            "asset_id" integer NOT NULL,
            CONSTRAINT "UQ_asset_category_asset_id" UNIQUE ("asset_id"),
            CONSTRAINT "PK_34bcae130ac8ab9cb8f738a40f1" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assets_invalid_address" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "address" character varying NOT NULL,
            "chain_id" integer NOT NULL,
            CONSTRAINT "PK_assets_invalid_address_id" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assets_prices" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "asset_id" integer NOT NULL,
            "price_in_usd" integer NOT NULL,
            "source_id" integer NOT NULL,
            CONSTRAINT "PK_assets_prices_id" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "assets_underlying" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "parent_asset_id" integer NOT NULL,
            "underlying_asset_id" integer NOT NULL,
            "position" integer NOT NULL,
            CONSTRAINT "PK_assets_underlying_id" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "icon_sources" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "name" character varying NOT NULL,
            "config" json NOT NULL,
            "enabled" boolean NOT NULL,
            CONSTRAINT "PK_icon_sources_id" PRIMARY KEY ("id")
            )`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "price_sources" (
            "id" SERIAL NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            "name" character varying NOT NULL,
            "type" character varying NOT NULL,
            "config" json NOT NULL,
            "enabled" boolean NOT NULL,
            CONSTRAINT "PK_price_sources" PRIMARY KEY ("id")
            )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "price_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "icon_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_underlying"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_invalid_address"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets_new"`);
  }
}
