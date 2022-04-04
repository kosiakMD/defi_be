require('dotenv').config();

module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    `dist/apps/assets_service/src/database/entities/**/*.entity.js`,
    `dist/apps/assets_service/src/assets/entities/**/*.entity.js`,
    `dist/apps/assets_service/src/assets-category/entities/**/*.entity.js`,
  ],
  migrations: [
    `apps/assets_service/src/database/migrations/**/*.ts`,
  ],
  cli: {
    migrationsDir: `apps/assets_service/src/database/migrations`,
  },
};
