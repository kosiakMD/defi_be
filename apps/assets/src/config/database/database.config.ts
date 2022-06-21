import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  name: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  synchronize: JSON.parse(process.env.DB_SYNC),
  schema: process.env.DB_SCHEMA,
  logging: JSON.parse(process.env.DB_LOGGING),
}));
