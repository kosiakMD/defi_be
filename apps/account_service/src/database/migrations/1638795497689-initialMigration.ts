import { MigrationInterface, QueryRunner } from 'typeorm';

export class initialMigration1638795497689 implements MigrationInterface {
  name = 'initialMigration1638795497689';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(`DROP INDEX "public"."assets_new_address_chain_id_uindex"`);
    // await queryRunner.query(`DROP INDEX "public"."assets_pools_asset_id_uindex"`);
    // await queryRunner.query(`DROP INDEX "public"."transactions_new_block_number_index"`);
    // await queryRunner.query(`DROP INDEX "public"."transactions_new_hash_index"`);
    // await queryRunner.query(`DROP INDEX "public"."asset_transfers_new_asset_id_index"`);
    // await queryRunner.query(`DROP INDEX "public"."asset_transfers_new_from_index"`);
    // await queryRunner.query(`DROP INDEX "public"."asset_transfers_new_to_index"`);
    // await queryRunner.query(`DROP INDEX "public"."assets_address_chain_id_uindex"`);
    // await queryRunner.query(`DROP INDEX "public"."temporary_tokens_address_index"`);

    await queryRunner.query(
      `CREATE TABLE  IF NOT EXISTS "chain" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_8e273aafae283b886672c952ecd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE  IF NOT EXISTS "currency" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_3cda65c731a6264f0e444cc9b91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "prices"."asset_price" ("asset_id" integer NOT NULL, "currency_id" integer NOT NULL, "value" integer NOT NULL, "timestamp" integer NOT NULL, CONSTRAINT "PK_90306659a1d119aabaf41bd3c34" PRIMARY KEY ("asset_id", "currency_id", "timestamp"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "prices"."asset" ("id" SERIAL NOT NULL, "symbol" character varying NOT NULL, "chain_id" integer NOT NULL, "address" character varying NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "platform_id" integer NOT NULL, "is_new" boolean NOT NULL, CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "prices"."asset_current_price" ("id" BIGSERIAL NOT NULL, "asset_id" integer NOT NULL, "currency_id" integer NOT NULL, "value" numeric NOT NULL, "updated_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_7bf217720bdb9b8ed9f6827ceb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_historical_data_migrated"`,
    );
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "from_block"`);
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "to_block"`);
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "template"`);
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_ready_to_migrate"`);
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_migrated"`);
    await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_display"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "template"`);

    // await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "project_id"`);
    // await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_data_present"`);
    // await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "is_complete"`);
    // await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "asset_id"`);
    // await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "block_number"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_import_started"`);
    await queryRunner.query(
      `ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_historical_data_migrated"`,
    );
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "from_block"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "migration_chunk_size"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "chain_id"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "to_block"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "total_transfers_count"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_ready_to_migrate"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_migrated"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_lp"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "project_id"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "is_display"`);

    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD "asset_name" character varying NOT NULL`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD "asset_symbol" character varying NOT NULL`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD "asset_decimals" integer NOT NULL`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD "asset_is_migrated" boolean NOT NULL`,
    // );
    // await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "asset_id" integer NOT NULL`);
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD "block_number" character varying NOT NULL`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" DROP CONSTRAINT "PK_cc8c76baa9d0e868162e992b1bd"`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD CONSTRAINT "PK_6260aef1d07a0c7f81ff6d75a18" PRIMARY KEY ("tx_hash", "log_index", "block_number")`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" DROP CONSTRAINT "PK_6260aef1d07a0c7f81ff6d75a18"`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "asset_transfers_new" ADD CONSTRAINT "PK_cc8c76baa9d0e868162e992b1bd" PRIMARY KEY ("log_index", "tx_hash")`,
    // );
    // await queryRunner.query(
    //   `ALTER TABLE "assets_new" DROP CONSTRAINT "PK_f8fb6fcbaa338c8b31f220c992f"`,
    // );
    // await queryRunner.query(`ALTER TABLE "assets_new" DROP COLUMN IF EXISTS "id"`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ADD "id" integer NOT NULL`);
    // await queryRunner.query(
    //   `ALTER TABLE "assets_new" ADD CONSTRAINT "PK_f8fb6fcbaa338c8b31f220c992f" PRIMARY KEY ("id")`,
    // );
    await queryRunner.query(
      `ALTER TABLE "assets_new" ALTER COLUMN "address" TYPE character varying`,
    );
    await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "address" SET NOT NULL`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "name" SET NOT NULL`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "symbol" SET NOT NULL`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "icon" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "chain_id" SET NOT NULL`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "decimals" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "assets_new" ALTER COLUMN "is_analytic_available" DROP DEFAULT`,
    );
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "is_lp" SET NOT NULL`);
    // await queryRunner.query(`ALTER TABLE "assets_new" ALTER COLUMN "is_lp" DROP DEFAULT`);

    // await queryRunner.query(`ALTER TABLE "assets_pools" DROP COLUMN IF EXISTS "asset_id"`);
    // await queryRunner.query(`ALTER TABLE "assets_pools" ADD "asset_id" integer`);
    await queryRunner.query(`ALTER TABLE "assets_pools" ALTER COLUMN "created_at" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "hash"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "hash" character varying NOT NULL`);

    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "address"`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ADD "address" character varying NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "block_number"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "block_number" integer`);
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "timestamp"`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ADD "timestamp" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "sender"`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ADD "sender" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "destination"`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ADD "destination" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "gas_price"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "gas_price" integer NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "gas_used"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "gas_used" integer NOT NULL`);
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "fee_usd"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "fee_usd" integer NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "token_operation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ADD "token_operation" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "transactions_new" DROP COLUMN IF EXISTS "chain_id"`);
    await queryRunner.query(`ALTER TABLE "transactions_new" ADD "chain_id" integer NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ALTER COLUMN "sub_transactions" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions_new" ALTER COLUMN "is_visible" SET NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "log_index"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "log_index" character varying`);

    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "tx_hash"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "tx_hash" character varying`);

    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "from"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "from" character varying`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "to"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "to" character varying`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "timestamp"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "timestamp" character varying`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "value"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "value" character varying`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" DROP COLUMN IF EXISTS "log_index"`);
    await queryRunner.query(`ALTER TABLE "asset_transfers_new" ADD "log_index" integer`);
    // await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "id"`);
    //     // await queryRunner.query(`ALTER TABLE "assets" ADD "id" integer`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "address"`);
    await queryRunner.query(`ALTER TABLE "assets" ADD "address" character varying`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "name"`);
    await queryRunner.query(`ALTER TABLE "assets" ADD "name" character varying`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN IF EXISTS "symbol"`);
    await queryRunner.query(`ALTER TABLE "assets" ADD "symbol" character varying`);
    await queryRunner.query(`ALTER TABLE "assets" ALTER COLUMN "decimals" SET NOT NULL`);
  }

  public async down(): Promise<void> {}
}
