import { MigrationInterface, QueryRunner } from 'typeorm';

export class init1647287372738 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "chains"
        (
            "id"         SERIAL,
            "name"       VARCHAR(256) NULL     DEFAULT NULL,
            "created_at" TIMESTAMP    NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP    NOT NULL DEFAULT now(),
            PRIMARY KEY ("id")
        );

        CREATE TABLE IF NOT EXISTS "protocols"
        (
            "id"         SERIAL,
            "name"       VARCHAR(256) NOT NULL,
            "url"        VARCHAR(256) NULL     DEFAULT NULL,
            "created_at" TIMESTAMP    NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP    NOT NULL DEFAULT now(),
            PRIMARY KEY ("id")
        );

        CREATE TABLE IF NOT EXISTS "protocols_chains"
        (
            "id"          SERIAL,
            "protocol_id" INTEGER NOT NULL,
            "chain_id"    INTEGER NOT NULL,
            PRIMARY KEY ("id"),
            UNIQUE ("protocol_id", "chain_id"),
            CONSTRAINT "FK_protocols_chains_protocols" FOREIGN KEY ("protocol_id") REFERENCES "protocols" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
            CONSTRAINT "FK_protocols_chains_chains" FOREIGN KEY ("chain_id") REFERENCES "chains" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );

        CREATE TABLE IF NOT EXISTS "contracts"
        (
            "id"          SERIAL,
            "address"     VARCHAR(256) NOT NULL,
            "abi"         TEXT         NULL     DEFAULT NULL,
            "abi_code"    TEXT         NULL     DEFAULT NULL,
            "protocol_id" INTEGER,
            "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
            "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
            PRIMARY KEY ("id"),
            CONSTRAINT "FK_contracts_protocols" FOREIGN KEY ("protocol_id") REFERENCES "protocols" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );

        DROP TYPE IF EXISTS LINK_TYPE;
        CREATE TYPE LINK_TYPE AS ENUM ('github', 'app', 'docs');

        CREATE TABLE IF NOT EXISTS "links"
        (
            "id"          SERIAL,
            "url"         VARCHAR(2048) NOT NULL,
            "type"        LINK_TYPE,
            "html"        TEXT,
            "protocol_id" INTEGER       NOT NULL,
            "created_at"  TIMESTAMP     NOT NULL DEFAULT now(),
            "updated_at"  TIMESTAMP     NOT NULL DEFAULT now(),
            PRIMARY KEY ("id"),
            CONSTRAINT "FK_links_protocols" FOREIGN KEY ("protocol_id") REFERENCES "protocols" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );

        CREATE TABLE IF NOT EXISTS "protocols_properties"
        (
            "id"          SERIAL,
            "name"        VARCHAR(256) NOT NULL,
            "value"       VARCHAR(256) NULL     DEFAULT NULL,
            "source"      VARCHAR(256) NULL     DEFAULT NULL,
            "protocol_id" INTEGER      NOT NULL,
            "created_at"  TIMESTAMP    NOT NULL DEFAULT now(),
            "updated_at"  TIMESTAMP    NOT NULL DEFAULT now(),
            PRIMARY KEY ("id"),
            CONSTRAINT "FK_protocols_properties_protocols" FOREIGN KEY ("protocol_id") REFERENCES "protocols" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.query(`
        DROP TABLE IF EXISTS protocols_properties;
        DROP TABLE IF EXISTS links;
        DROP TYPE IF EXISTS LINK_TYPE;
        DROP TABLE IF EXISTS contracts;
        DROP TABLE IF EXISTS protocols_chains;
        DROP TABLE IF EXISTS protocols;
        DROP TABLE IF EXISTS chains;
    `);
  }
}
