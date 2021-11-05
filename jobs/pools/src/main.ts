import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { JobsModule } from './jobs/jobs.module';
import { JobsRunner } from './jobs/jobs.runner';

export async function bootstrap(): Promise<void> {
  process.env.DB_HOST = 'development.c2ibi3sjxz3a.eu-central-1.rds.amazonaws.com';
  process.env.DB_PORT = '5432';
  process.env.DB_USERNAME = 'devdashuser';
  process.env.DB_PASSWORD = 'nT4Fju772GcnkY4t';
  process.env.DB_DATABASE = 'postgres';
  process.env.LOG_ERROR_FILE = 'error.log';
  process.env.LOG_COMBINED_FILE = 'combined.log';
  process.env.LOG_LEVEL = 'info';
  process.env.ETH_URL = 'https://mainnet.infura.io/v3/d38bddd842b94305a23f91596991a9eb';
  process.env.BSC_URL = 'https://bsc-dataseed.binance.org/';
  process.env.POLYGON_URL = 'https://rpc-mainnet.matic.network/';
  process.env.FTM_URL = 'https://rpc.ftm.tools/';
  process.env.AVAX_URL = 'https://api.avax.network/ext/bc/C/rpc';
  //process.env.INTEGRATION_SERVICE_URL = 'https://int.dfyield.xyz/';
  process.env.INTEGRATION_SERVICE_URL = 'http://localhost:6062/';
  process.env.ACCOUNT_SERVICE_URL = 'https://acc.dfyield.xyz/';
  process.env.PRICE_SERVICE_URL = 'https://prc.dfyield.xyz/';

  const app = await NestFactory.createApplicationContext(AppModule);

  const jobsRunner = app.select(JobsModule).get(JobsRunner);
  await jobsRunner.initialize();
  await jobsRunner.update();

  await app.close();
}
bootstrap();
