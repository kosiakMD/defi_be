import * as dotenv from 'dotenv';

dotenv.config();

export default {
  SERVICE_PORT: process.env.SERVICE_PORT ? process.env.SERVICE_PORT : 3000,
};
