import { Injectable } from '@nestjs/common';

import { PancakeswapStakingJob } from './pancakeswap/pancakeswap.staking.job';
import { StakingJobInterface } from './staking.job.interface';

@Injectable()
export class StakingPoolJobsFactory {
  private readonly availableJobs: Map<string, StakingJobInterface> = new Map<
    string,
    StakingJobInterface
  >();

  constructor(private readonly pancakeSwap: PancakeswapStakingJob) {
    this.availableJobs.set(pancakeSwap.placeholder, pancakeSwap);
  }

  getJobsIntegrated(): Map<string, StakingJobInterface> {
    return this.availableJobs;
  }
}
