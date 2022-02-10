require('dotenv').config();

module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE,
  logging: process.env.DB_LOGGING,
  entities: [
    'apps/assets_service/src/modules/database/entities/**/*.entity.ts',
  ],
  migrations: [
    'apps/assets_service/src/modules/database/migrations/**/*.ts',
  ],
  cli: {
    migrationsDir: 'apps/assets_service/src/modules/database/migrations',
  },
};
