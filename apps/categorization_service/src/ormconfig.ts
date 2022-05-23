import * as dotenv from 'dotenv';

dotenv.config({ path: 'dist/apps/categorization_service/.env' });

export default {
  type: process.env.DB_CONNECTION,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE,
  logging: process.env.DB_LOGGING,
  entities: ['dist/apps/categorization_service/src/modules/database/entities/**/*.entity.js'],
  migrations: ['dist/apps/categorization_service/src/modules/database/migrations/**/*.js'],
  cli: {
    migrationsDir: 'dist/apps/categorization_service/src/modules/database/migrations',
  },
};
