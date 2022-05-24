import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconSources1652865768093 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cleanup previous price sources just in case
    await queryRunner.query(
      `DELETE FROM "icon_sources" WHERE "name" IN ('COINGECKO', 'COINMARKETCAP', 'TRUST_WALLET')`,
    );

    await queryRunner.query(
      `INSERT INTO "icon_sources" ("name", config, enabled) VALUES ('COINGECKO', '{}', true)`,
    );
    await queryRunner.query(
      `INSERT INTO "icon_sources" ("name", config, enabled) VALUES ('COINMARKETCAP', '{}', true)`,
    );
    await queryRunner.query(
      `INSERT INTO "icon_sources" ("name", config, enabled) VALUES ('TRUST_WALLET', '{}', true)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "icon_sources" WHERE "name" IN ('COINGECKO', 'COINMARKETCAP', 'TRUST_WALLET')`,
    );
  }
}
