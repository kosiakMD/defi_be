import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/assets_service/config/.env' });

export default {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    `apps/assets_service/src/modules/assets/entities/**/*.entity.ts`,
    `apps/assets_service/src/modules/assets-category/entities/**/*.entity.ts`,
    `apps/assets_service/src/modules/icons/entities/**/*.entity.ts`,
    `apps/assets_service/src/modules/prices/entities/**/*.entity.ts`,
  ],
  migrations: [
    `apps/assets_service/src/modules/database/migrations/**/*.ts`,
  ],
  cli: {
    migrationsDir: `apps/assets_service/src/modules/database/migrations`,
  },
};
