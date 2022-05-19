import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/categorization_service/config/.env' });

export default {
  type: process.env.DB_CONNECTION,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE,
  logging: process.env.DB_LOGGING,
  entities: ['apps/categorization_service/src/modules/database/entities/**/*.entity.ts'],
  migrations: ['apps/categorization_service/src/modules/database/migrations/**/*.ts'],
  cli: {
    migrationsDir: 'apps/categorization_service/src/modules/database/migrations',
  },
};
