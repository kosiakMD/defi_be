require('dotenv').config();

module.exports = {
  type: process.env.DB_CONNECTION,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SYNCHRONIZE,
  logging: process.env.DB_LOGGING,
  entities: [
    'dist/**/*.entity.js',
  ],
  migrations: [
    'dist/apps/account_service/src/database/migrations/**/*.js',
  ],
  cli: {
    migrationsDir: 'database/migrations',
  },
};
