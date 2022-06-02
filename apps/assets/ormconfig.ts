import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config({ path: 'apps/assets/config/.env' });

export default {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    `apps/assets/src/modules/assets/entities/**/*.entity.ts`,
    `apps/assets/src/modules/assets-category/entities/**/*.entity.ts`,
    `apps/assets/src/modules/icons/entities/**/*.entity.ts`,
    `apps/assets/src/modules/prices/entities/**/*.entity.ts`,
  ],
  migrations: [`apps/assets/src/database/migrations/**/*.ts`],
  cli: {
    migrationsDir: `apps/assets/src/database/migrations`,
  },
  namingStrategy: new SnakeNamingStrategy(),
};
