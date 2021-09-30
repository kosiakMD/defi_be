import { Injectable } from '@nestjs/common';

import { LiquidityPoolJobInterface } from './liquidity.pool.job.interface';
import { PancakeswapPoolJob } from './pancakeswap/pancakeswap.pool.job';
import { SpookyswapPoolJob } from './spookyswap/spookyswap.pool.job';

@Injectable()
export class LiquidityPoolJobsFactory {
  private readonly availableJobs: Map<string, LiquidityPoolJobInterface> = new Map<
    string,
    LiquidityPoolJobInterface
  >();

  constructor(
    private readonly spookySwap: SpookyswapPoolJob,
    private readonly pancakeSwap: PancakeswapPoolJob,
  ) {
    this.availableJobs.set(spookySwap.placeholder, spookySwap);
    this.availableJobs.set(pancakeSwap.placeholder, pancakeSwap);
  }

  getJobsIntegrated(): Map<string, LiquidityPoolJobInterface> {
    return this.availableJobs;
  }
}
