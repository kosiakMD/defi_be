import 'dotenv/config';

export default {
  type: process.env.DB_CONNECTION,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE,
  logging: process.env.DB_LOGGING,
  entities: ['apps/scheduler_service/src/database/entities/**/*.entity.ts'],
  migrations: ['apps/scheduler_service/src/database/migrations/**/*.ts'],
  cli: {
    migrationsDir: 'apps/scheduler_service/src/database/migrations',
  },
};
