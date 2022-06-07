import { MigrationInterface, QueryRunner } from 'typeorm';

export class addGithubFilesTable1648469052708 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "github_files"
        (
            "id"           SERIAL,
            "path"         VARCHAR(256) NOT NULL,
            "download_url" VARCHAR(256) NULL     DEFAULT NULL,
            "content"      TEXT         NULL     DEFAULT NULL,
            "link_id"      INTEGER      NOT NULL,
            "created_at"   TIMESTAMP    NOT NULL DEFAULT now(),
            "updated_at"   TIMESTAMP    NOT NULL DEFAULT now(),
            PRIMARY KEY ("id"),
            CONSTRAINT "FK_github_files_links" FOREIGN KEY ("link_id") REFERENCES "links" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE IF EXISTS github_files;
    `);
  }
}
