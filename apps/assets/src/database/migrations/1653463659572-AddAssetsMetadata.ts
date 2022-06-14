import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetsMetadata1653463659572 implements MigrationInterface {
  name = 'AddAssetsMetadata1653463659572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets" ADD "metadata" json NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "metadata"`);
  }
}
