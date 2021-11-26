import { Injectable } from '@nestjs/common';

import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { JobInterface } from './job.interface';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(
    pancakeStaking: PancakeStaking,
    pancakeLPV2: PancakePoolsV2,
    traderjoeLp: TraderjoePools,
    traderjoeStaking: TraderJoeStaking,
    spookyswapLp: SpookyswapPools,
    ellipsisLp: EllipsisLp,
    ellipsisStaking: EllipsisStaking,
  ) {
    this.registry.set(pancakeStaking.placeholder, pancakeStaking);
    this.registry.set(pancakeLPV2.placeholder, pancakeLPV2);
    this.registry.set(traderjoeLp.placeholder, traderjoeLp);
    this.registry.set(traderjoeStaking.placeholder, traderjoeStaking);
    this.registry.set(spookyswapLp.placeholder, spookyswapLp);
    this.registry.set(ellipsisLp.placeholder, ellipsisLp);
    this.registry.set(ellipsisStaking.placeholder, ellipsisStaking);
  }
}
