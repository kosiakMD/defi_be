import { MigrationInterface, QueryRunner } from 'typeorm';

export class linksAddProcessedFlag1653027759185 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE links ADD COLUMN processed BOOLEAN DEFAULT false;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE links DROP COLUMN processed;`);
  }
}
