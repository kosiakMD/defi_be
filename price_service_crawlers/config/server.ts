import * as dotenv from 'dotenv';

dotenv.config();

export default {
  PORT: process.env.SERVER_PORT ? process.env.SERVER_PORT : 3000,
};
