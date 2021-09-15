import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { IntegrationJobsRepository } from './integration.jobs.repository';
import { JobsFactory } from './jobs.factory';
import { LiquidityPoolJob } from './liquidity.pool.job';
import { SpookyswapPoolJob } from './spookyswap/spookyswap.pool.job';

@Module({
  imports: [MicroservicesModule, ChainModule],
  providers: [SpookyswapPoolJob, LiquidityPoolJob, JobsFactory, IntegrationJobsRepository],
  exports: [LiquidityPoolJob],
})
export class LiquidityPoolModule {}
