import { Injectable } from '@nestjs/common';
import { getJobPlaceholder } from '../utils/string';
import { LiquidityPoolJobInterface } from './liquidity.pool.job.interface';
import { SpookyswapPoolJob } from './spookyswap/spookyswap.pool.job';

@Injectable()
export class JobsFactory {
  private readonly availableJobs: Map<string, LiquidityPoolJobInterface> = new Map<
    string,
    LiquidityPoolJobInterface
  >();

  constructor(private readonly spookySwap: SpookyswapPoolJob) {
    this.availableJobs.set(
      getJobPlaceholder(spookySwap.chain, spookySwap.feature, spookySwap.protocol),
      spookySwap,
    );
  }

  getJobsIntegrated(): Map<string, LiquidityPoolJobInterface> {
    return this.availableJobs;
  }
}
