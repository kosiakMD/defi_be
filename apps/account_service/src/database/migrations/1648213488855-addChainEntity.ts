import { MigrationInterface, QueryRunner } from 'typeorm';

export class addChainEntity1648213488855 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS chains (
        id SERIAL PRIMARY KEY NOT NULL, 
        name TEXT NOT NULL,   
        abbr TEXT NOT NULL,
        metadata JSON NOT NULL,
        "created_at" TIMESTAMP DEFAULT current_timestamp,
        "updated_at" TIMESTAMP DEFAULT current_timestamp
        );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS chains`);
  }
}
