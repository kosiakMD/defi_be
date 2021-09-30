import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { FeaturesExtracted } from './features.extracted';
import { IntegrationJobsRepository } from './integration.jobs.repository';
import { LiquidityPoolJob } from './liquidity.pool.job';
import { LiquidityPoolJobsFactory } from './liquidity.pool.jobs.factory';
import { PancakeswapPoolJob } from './pancakeswap/pancakeswap.pool.job';
import { PancakeswapStakingJob } from './pancakeswap/pancakeswap.staking.job';
import { SpookyswapPoolJob } from './spookyswap/spookyswap.pool.job';
import { StakingPoolJob } from './staking.pool.job';
import { StakingPoolJobsFactory } from './staking.pool.jobs.factory';

@Module({
  imports: [MicroservicesModule, ChainModule],
  providers: [
    SpookyswapPoolJob,
    PancakeswapPoolJob,
    PancakeswapStakingJob,
    LiquidityPoolJob,
    LiquidityPoolJobsFactory,
    IntegrationJobsRepository,
    FeaturesExtracted,
    StakingPoolJobsFactory,
    StakingPoolJob,
  ],
  exports: [LiquidityPoolJob, StakingPoolJob],
})
export class LiquidityPoolModule {}
